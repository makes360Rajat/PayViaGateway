<?php
/**
 * PayVia Payment Gateway — High-Performance API Core
 * Native FastCGI / LiteSpeed / Apache Engine with MySQL Persistence & Full Zero-Drop Notification Pipeline
 */

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH");
header("Access-Control-Allow-Headers: Content-Type, Authorization, x-api-key, x-gateway-signature, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// -------------------------------------------------------------
// Configuration & Database
// -------------------------------------------------------------
define('JWT_SECRET', 'payvia_super_secure_jwt_secret_key_2026');
define('DB_HOST', '127.0.0.1');
define('DB_NAME', 'u586615155_payvia_db');
define('DB_USER', 'u586615155_payvia_user');
define('DB_PASS', 'K6b?qnk2L/');

function getDb(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4";
        $pdo = new PDO($dsn, DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false
        ]);
        $pdo->exec("SET NAMES utf8mb4");
        
        // Ensure template settings table exists
        $pdo->exec("CREATE TABLE IF NOT EXISTS tenant_template_settings (
            tenant_id VARCHAR(64) PRIMARY KEY,
            template_mode VARCHAR(32) DEFAULT 'fixed',
            default_template VARCHAR(32) DEFAULT 'template_1',
            enabled_templates TEXT DEFAULT NULL,
            brand_name VARCHAR(128) DEFAULT NULL,
            brand_color VARCHAR(32) DEFAULT '#8b5cf6',
            logo_url VARCHAR(255) DEFAULT NULL,
            support_note VARCHAR(255) DEFAULT NULL,
            updated_at VARCHAR(64)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

        // Ensure contact messages & inquiry history table exists
        $pdo->exec("CREATE TABLE IF NOT EXISTS contact_messages (
            id VARCHAR(64) PRIMARY KEY,
            name VARCHAR(128) NOT NULL,
            email VARCHAR(128) NOT NULL,
            subject VARCHAR(64) DEFAULT 'general',
            order_id VARCHAR(64) DEFAULT NULL,
            message TEXT NOT NULL,
            ip_address VARCHAR(64) DEFAULT NULL,
            user_agent VARCHAR(255) DEFAULT NULL,
            status VARCHAR(32) DEFAULT 'PENDING',
            reply_notes TEXT DEFAULT NULL,
            created_at VARCHAR(64),
            updated_at VARCHAR(64)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

        // Ensure plan_usage table exists for atomic test quota tracking
        $pdo->exec("CREATE TABLE IF NOT EXISTS plan_usage (
            id VARCHAR(64) PRIMARY KEY,
            tenant_id VARCHAR(64) NOT NULL UNIQUE,
            test_orders_used INT NOT NULL DEFAULT 0,
            test_orders_limit INT NOT NULL DEFAULT 5,
            created_at VARCHAR(64) NOT NULL,
            updated_at VARCHAR(64) NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

        // Ensure plan_access_logs exists for audit trail
        $pdo->exec("CREATE TABLE IF NOT EXISTS plan_access_logs (
            id VARCHAR(64) PRIMARY KEY,
            tenant_id VARCHAR(64) NOT NULL,
            action VARCHAR(64) NOT NULL,
            endpoint VARCHAR(128) NOT NULL,
            result VARCHAR(32) NOT NULL,
            reason VARCHAR(255) NULL,
            ip_address VARCHAR(45) NULL,
            user_agent VARCHAR(255) NULL,
            created_at VARCHAR(64) NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

        // Run safe alters in case tables already existed
        try { $pdo->exec("ALTER TABLE tenant_template_settings ADD COLUMN enabled_templates TEXT DEFAULT NULL"); } catch (Exception $e) {}
        try { $pdo->exec("ALTER TABLE tenant_template_settings ADD COLUMN logo_url VARCHAR(255) DEFAULT NULL"); } catch (Exception $e) {}
        try { $pdo->exec("ALTER TABLE tenant_template_settings ADD COLUMN support_note VARCHAR(255) DEFAULT NULL"); } catch (Exception $e) {}
        try { $pdo->exec("ALTER TABLE contact_messages ADD COLUMN reply_notes TEXT DEFAULT NULL"); } catch (Exception $e) {}
        try { $pdo->exec("ALTER TABLE devices ADD COLUMN status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE'"); } catch (Exception $e) {}
        try { $pdo->exec("ALTER TABLE orders ADD COLUMN mode VARCHAR(16) NOT NULL DEFAULT 'LIVE'"); } catch (Exception $e) {}

        // Enforce proper system roles: pankajpanks007@gmail.com is strictly MERCHANT, admin@payvia.vip is SUPER_ADMIN
        try {
            $pdo->exec("UPDATE tenants SET role = 'MERCHANT' WHERE email = 'pankajpanks007@gmail.com' AND role = 'SUPER_ADMIN'");
            $pdo->exec("UPDATE tenants SET role = 'SUPER_ADMIN' WHERE email = 'admin@payvia.vip'");
        } catch (Exception $e) {}

        // Ensure default Free Plan exists for Super Admin manual approvals
        try {
            $pdo->exec("INSERT INTO plans (id, name, price, max_merchant_accounts, max_orders_per_day, max_api_keys, validity_days, features_json, is_active)
                VALUES ('plan_free', 'Free Plan', 0.00, 2, 500, 2, 365, '[\"Free Merchant Accounts\",\"500 Orders / Day\",\"Webhooks & Instant Verification\",\"No Monthly Fees\"]', 1)
                ON DUPLICATE KEY UPDATE name = VALUES(name), price = VALUES(price), is_active = 1");
        } catch (Exception $e) {}
    }
    return $pdo;
}

// -------------------------------------------------------------
// JWT Helpers
// -------------------------------------------------------------
function base64url_encode($data) {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function base64url_decode($data) {
    return base64_decode(strtr($data, '-_', '+/'));
}

function jwt_sign($payload, $secret = JWT_SECRET, $expireSeconds = 2592000) {
    $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
    $payload['exp'] = time() + $expireSeconds;
    $base64Header = base64url_encode($header);
    $base64Payload = base64url_encode(json_encode($payload));
    $signature = hash_hmac('sha256', "$base64Header.$base64Payload", $secret, true);
    $base64Signature = base64url_encode($signature);
    return "$base64Header.$base64Payload.$base64Signature";
}

function jwt_verify($token, $secret = JWT_SECRET) {
    if (!$token) return null;
    $parts = explode('.', $token);
    if (count($parts) !== 3) return null;
    list($base64Header, $base64Payload, $base64Signature) = $parts;
    $signature = hash_hmac('sha256', "$base64Header.$base64Payload", $secret, true);
    if (base64url_encode($signature) !== $base64Signature) return null;
    $payload = json_decode(base64url_decode($base64Payload), true);
    if (!$payload || (isset($payload['exp']) && $payload['exp'] < time())) return null;
    return $payload;
}

function getBearerToken(): ?string {
    $headers = [];
    if (function_exists('getallheaders')) {
        $headers = getallheaders();
    }
    $auth = $headers['Authorization'] ?? $headers['authorization'] ?? $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (preg_match('/Bearer\s+(.*)$/i', $auth, $matches)) {
        return trim($matches[1]);
    }
    return null;
}

function authenticateUser(): ?array {
    $token = getBearerToken();
    if (!$token) return null;
    $payload = jwt_verify($token);
    if (!$payload || empty($payload['tenantId'])) return null;
    
    $db = getDb();
    $stmt = $db->prepare("SELECT * FROM tenants WHERE id = ? AND is_active = 1");
    $stmt->execute([$payload['tenantId']]);
    $tenant = $stmt->fetch();
    return $tenant ?: null;
}

function authenticateApiKeyOrUser(): ?array {
    // 1. Try Bearer / JWT
    $user = authenticateUser();
    if ($user) return ['type' => 'user', 'tenant' => $user];
    
    // 2. Try API Key
    $headers = function_exists('getallheaders') ? getallheaders() : [];
    $rawKey = $headers['x-api-key'] ?? $headers['X-Api-Key'] ?? $_SERVER['HTTP_X_API_KEY'] ?? $_GET['api_key'] ?? null;
    if ($rawKey) {
        $db = getDb();
        $stmt = $db->prepare("SELECT a.*, t.name as tenant_name, t.email as tenant_email, t.role as tenant_role, t.business_name FROM api_keys a JOIN tenants t ON a.tenant_id = t.id WHERE a.raw_key = ? AND a.is_active = 1 AND t.is_active = 1");
        $stmt->execute([$rawKey]);
        $row = $stmt->fetch();
        if ($row) {
            return ['type' => 'api_key', 'tenant' => [
                'id' => $row['tenant_id'],
                'name' => $row['tenant_name'],
                'email' => $row['tenant_email'],
                'role' => $row['tenant_role'],
                'business_name' => $row['business_name']
            ], 'apiKey' => $row];
        }
    }
    return null;
}

function getJsonInput(): array {
    $raw = file_get_contents('php://input');
    if (!$raw) return [];
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

// -------------------------------------------------------------
// Centralized Plan Authorization & Test Quota Service
// -------------------------------------------------------------
class PlanService {
    public static function logAccess($tenantId, $action, $endpoint, $result, $reason = null, $db = null) {
        if (!$db) $db = getDb();
        $id = 'pal_' . substr(bin2hex(random_bytes(6)), 0, 8);
        $ip = $_SERVER['REMOTE_ADDR'] ?? null;
        $ua = substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 255);
        $now = gmdate('Y-m-d\TH:i:s\Z');
        try {
            $stmt = $db->prepare("INSERT INTO plan_access_logs (id, tenant_id, action, endpoint, result, reason, ip_address, user_agent, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([$id, $tenantId, $action, $endpoint, $result, $reason, $ip, $ua, $now]);
        } catch (Exception $e) {}
    }

    public static function getSubscription($tenantId, $db = null) {
        if (!$db) $db = getDb();
        $stmt = $db->prepare("SELECT * FROM subscriptions WHERE tenant_id = ? ORDER BY starts_at DESC LIMIT 1");
        $stmt->execute([$tenantId]);
        return $stmt->fetch();
    }

    public static function isPlanActive($tenantId, $db = null) {
        if (!$db) $db = getDb();
        // Super admin bypass
        $stmt = $db->prepare("SELECT role FROM tenants WHERE id = ?");
        $stmt->execute([$tenantId]);
        $role = $stmt->fetchColumn();
        if ($role === 'SUPER_ADMIN') return true;

        $sub = self::getSubscription($tenantId, $db);
        if (!$sub) return false;
        
        $status = strtoupper($sub['status'] ?? '');
        if ($status !== 'ACTIVE') return false;

        // Check expiration if set
        if (!empty($sub['expires_at'])) {
            $expTime = strtotime($sub['expires_at']);
            if ($expTime && $expTime < time()) {
                return false;
            }
        }
        return true;
    }

    public static function getTestUsage($tenantId, $db = null) {
        if (!$db) $db = getDb();
        $stmt = $db->prepare("SELECT * FROM plan_usage WHERE tenant_id = ?");
        $stmt->execute([$tenantId]);
        $usage = $stmt->fetch();

        if (!$usage) {
            $now = gmdate('Y-m-d\TH:i:s\Z');
            $id = 'pusg_' . substr(bin2hex(random_bytes(6)), 0, 8);
            try {
                $ins = $db->prepare("INSERT IGNORE INTO plan_usage (id, tenant_id, test_orders_used, test_orders_limit, created_at, updated_at) VALUES (?, ?, 0, 5, ?, ?)");
                $ins->execute([$id, $tenantId, $now, $now]);
            } catch (Exception $e) {}
            return [
                'used' => 0,
                'limit' => 5,
                'remaining' => 5
            ];
        }

        $used = (int)$usage['test_orders_used'];
        $limit = (int)$usage['test_orders_limit'];
        return [
            'used' => $used,
            'limit' => $limit,
            'remaining' => max(0, $limit - $used)
        ];
    }

    public static function getEntitlements($tenantId, $db = null) {
        if (!$db) $db = getDb();
        $isActive = self::isPlanActive($tenantId, $db);
        $usage = self::getTestUsage($tenantId, $db);
        $sub = self::getSubscription($tenantId, $db);

        $status = $isActive ? 'ACTIVE' : ($sub['status'] ?? 'FREE_TEST');
        if (!$isActive && ($status === 'ACTIVE' || empty($status))) {
            $status = 'FREE_TEST';
        }

        return [
            'status' => $status,
            'isPlanActive' => $isActive,
            'isFreeTesting' => !$isActive,
            'testOrdersUsed' => $usage['used'],
            'testOrdersMax' => $usage['limit'],
            'testOrdersRemaining' => $usage['remaining'],
            'canConnectMerchant' => $isActive,
            'canReceiveLivePayments' => $isActive,
            'canCreateTestOrders' => $isActive || ($usage['remaining'] > 0)
        ];
    }

    public static function requireActivePlan($tenantId, $endpoint, $db = null) {
        if (!self::isPlanActive($tenantId, $db)) {
            self::logAccess($tenantId, 'MERCHANT_CONNECTION_BLOCKED', $endpoint, 'BLOCKED', 'Active plan required', $db);
            http_response_code(403);
            echo json_encode([
                'status' => false,
                'error' => 'PLAN_REQUIRED',
                'reason' => 'ACTIVE_PLAN_REQUIRED',
                'message' => 'Connecting merchant accounts to receive live payments requires an active subscription plan. Please upgrade your plan.'
            ]);
            exit;
        }
    }

    public static function consumeTestOrderQuota($tenantId, $db) {
        $check = $db->prepare("SELECT id FROM plan_usage WHERE tenant_id = ?");
        $check->execute([$tenantId]);
        if (!$check->fetch()) {
            $now = gmdate('Y-m-d\TH:i:s\Z');
            $id = 'pusg_' . substr(bin2hex(random_bytes(6)), 0, 8);
            $ins = $db->prepare("INSERT IGNORE INTO plan_usage (id, tenant_id, test_orders_used, test_orders_limit, created_at, updated_at) VALUES (?, ?, 0, 5, ?, ?)");
            $ins->execute([$id, $tenantId, $now, $now]);
        }

        $stmt = $db->prepare("SELECT test_orders_used, test_orders_limit FROM plan_usage WHERE tenant_id = ? FOR UPDATE");
        $stmt->execute([$tenantId]);
        $row = $stmt->fetch();
        if (!$row) return false;

        $used = (int)$row['test_orders_used'];
        $limit = (int)$row['test_orders_limit'];

        if ($used >= $limit) {
            return false;
        }

        $now = gmdate('Y-m-d\TH:i:s\Z');
        $upd = $db->prepare("UPDATE plan_usage SET test_orders_used = test_orders_used + 1, updated_at = ? WHERE tenant_id = ?");
        $upd->execute([$now, $tenantId]);
        return true;
    }

    public static function getSuperAdmin($db) {
        $stmt = $db->prepare("SELECT * FROM tenants WHERE role = 'SUPER_ADMIN' AND is_active = 1 ORDER BY created_at ASC LIMIT 1");
        $stmt->execute();
        $admin = $stmt->fetch();
        if (!$admin) {
            $stmt = $db->prepare("SELECT * FROM tenants WHERE email = 'admin@payvia.vip' LIMIT 1");
            $stmt->execute();
            $admin = $stmt->fetch();
        }
        return $admin ?: null;
    }

    public static function getSuperAdminMerchantAccount($db) {
        $admin = self::getSuperAdmin($db);
        if (!$admin) return null;

        // Query active merchant accounts belonging to the Super Admin
        $stmt = $db->prepare("SELECT * FROM merchants WHERE tenant_id = ? AND status = 'ACTIVE' ORDER BY weight DESC, created_at ASC");
        $stmt->execute([$admin['id']]);
        $merchants = $stmt->fetchAll();

        foreach ($merchants as $merchant) {
            $credentials = json_decode($merchant['credentials_json'] ?? '{}', true) ?: [];
            if (!empty($credentials['isPlatformBilling'])) return $merchant;
        }
        // Compatibility fallback for an existing installation. Never use an
        // account belonging to another tenant as the plan-payment receiver.
        if (!empty($merchants)) return $merchants[0];

        // Fallback: Check if super admin has ANY merchant
        $stmt = $db->prepare("SELECT * FROM merchants WHERE tenant_id = ? ORDER BY created_at ASC LIMIT 1");
        $stmt->execute([$admin['id']]);
        $any = $stmt->fetch();
        if ($any) return $any;

        // No real merchant account — force admin to add one
        return null;
    }

    public static function createSubscriptionOrder($db, $buyerTenant, $targetPlan) {
        $admin = self::getSuperAdmin($db);
        if (!$admin) {
            throw new Exception("Super Admin platform configuration not found");
        }
        $mch = self::getSuperAdminMerchantAccount($db);
        if (!$mch) {
            throw new Exception("No active Super Admin merchant account available to receive plan payment");
        }

        $orderId = 'ord_sub_' . substr(bin2hex(random_bytes(6)), 0, 8);
        $linkToken = bin2hex(random_bytes(16));
        $amount = (float)$targetPlan['price'];
        $now = gmdate('Y-m-d\TH:i:s\Z');
        $expires = gmdate('Y-m-d\TH:i:s\Z', time() + 3600);
        $customerName = $buyerTenant['business_name'] ?: $buyerTenant['name'];
        $customerMobile = $buyerTenant['phone'] ?: '';
        $remark = "PLAN_PURCHASE:{$targetPlan['id']}:{$buyerTenant['id']}";

        // Created under Super Admin tenant so Super Admin's companion app detects bank SMS and settles it!
        $stmt = $db->prepare("INSERT INTO orders (
            id, tenant_id, order_id, amount, currency, status, 
            customer_name, customer_mobile, remark1, merchant_account_id, 
            link_token, expires_at, mode, created_at, updated_at
        ) VALUES (?, ?, ?, ?, 'INR', 'PENDING', ?, ?, ?, ?, ?, ?, 'LIVE', ?, ?)");
        
        $stmt->execute([
            $orderId,
            $admin['id'],
            $orderId,
            $amount,
            $customerName,
            $customerMobile,
            $remark,
            $mch['id'],
            $linkToken,
            $expires,
            $now,
            $now
        ]);

        $host = $_SERVER['HTTP_HOST'] ?? 'payvia360.com';
        $proto = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') ? 'https' : 'https';
        $paymentUrl = "$proto://$host/checkout/$linkToken";

        $upiId = $mch['upi_id'] ?: 'admin@payvia';
        $payeeName = $mch['display_name'] ?: 'PayVia Official Platform';
        $upiIntent = "upi://pay?pa=" . urlencode($upiId) . "&pn=" . urlencode($payeeName) . "&am=" . number_format($amount, 2, '.', '') . "&cu=INR&tn=" . urlencode($orderId);

        self::logAccess($buyerTenant['id'], 'PLAN_PURCHASE_ORDER_CREATED', '/api/plans/purchase', 'SUCCESS', "Order {$orderId} for plan {$targetPlan['name']} created", $db);

        return [
            'orderId' => $orderId,
            'linkToken' => $linkToken,
            'amount' => $amount,
            'plan' => $targetPlan,
            'merchant' => $mch,
            'paymentUrl' => $paymentUrl,
            'upiIntentUrl' => $upiIntent,
            'upiId' => $upiId,
            'payeeName' => $payeeName,
            'expiresAt' => $expires
        ];
    }

    public static function activatePurchasedPlanIfSettled($db, $orderData) {
        if (is_string($orderData)) {
            $stmt = $db->prepare("SELECT * FROM orders WHERE id = ? OR order_id = ? LIMIT 1");
            $stmt->execute([$orderData, $orderData]);
            $orderData = $stmt->fetch();
        }
        if (!$orderData) return false;

        $remark = $orderData['remark1'] ?? '';
        if (strpos($remark, 'PLAN_PURCHASE:') !== 0) {
            return false;
        }

        if (($orderData['status'] ?? '') !== 'TXN_SUCCESS') {
            return false;
        }

        $parts = explode(':', $remark);
        if (count($parts) < 3) return false;

        $planId = $parts[1];
        $buyerTenantId = $parts[2];

        $stmt = $db->prepare("SELECT * FROM tenants WHERE id = ?");
        $stmt->execute([$buyerTenantId]);
        $buyer = $stmt->fetch();
        if (!$buyer) return false;

        $stmt = $db->prepare("SELECT * FROM plans WHERE id = ?");
        $stmt->execute([$planId]);
        $targetPlan = $stmt->fetch();
        if (!$targetPlan) return false;

        $planPrice = (float)$targetPlan['price'];
        $paidAmount = (float)$orderData['amount'];

        if ($paidAmount < ($planPrice - 0.5)) {
            self::logAccess($buyerTenantId, 'PLAN_ACTIVATION_AMOUNT_MISMATCH', 'settle', 'FAILED', "Paid {$paidAmount} less than plan price {$planPrice}", $db);
            return false;
        }

        $now = gmdate('Y-m-d\TH:i:s\Z');
        $validityDays = (int)($targetPlan['validity_days'] ?: 30);
        $expires = gmdate('Y-m-d\TH:i:s\Z', strtotime("+$validityDays days"));

        // 1. Update Tenant plan
        $stmt = $db->prepare("UPDATE tenants SET plan_id = ?, updated_at = ? WHERE id = ?");
        $stmt->execute([$targetPlan['id'], $now, $buyerTenantId]);

        // 2. Update / Insert Subscription
        $stmt = $db->prepare("SELECT id FROM subscriptions WHERE tenant_id = ?");
        $stmt->execute([$buyerTenantId]);
        $existingSub = $stmt->fetch();

        if ($existingSub) {
            $stmt = $db->prepare("UPDATE subscriptions SET plan_id = ?, status = 'ACTIVE', starts_at = ?, expires_at = ?, orders_today = 0, last_reset_date = ? WHERE tenant_id = ?");
            $stmt->execute([$targetPlan['id'], $now, $expires, date('Y-m-d'), $buyerTenantId]);
        } else {
            $subId = 'sub_' . substr(bin2hex(random_bytes(6)), 0, 8);
            $stmt = $db->prepare("INSERT INTO subscriptions (id, tenant_id, plan_id, status, starts_at, expires_at, orders_today, last_reset_date) VALUES (?, ?, ?, 'ACTIVE', ?, ?, 0, ?)");
            $stmt->execute([$subId, $buyerTenantId, $targetPlan['id'], $now, $expires, date('Y-m-d')]);
        }

        // 3. Reset plan_usage test count so they start fresh in live mode
        $stmt = $db->prepare("UPDATE plan_usage SET test_orders_used = 0, updated_at = ? WHERE tenant_id = ?");
        $stmt->execute([$now, $buyerTenantId]);

        self::logAccess($buyerTenantId, 'PLAN_PURCHASE_ACTIVATED', 'settle', 'SUCCESS', "Activated {$targetPlan['name']} plan via Order {$orderData['order_id']}", $db);
        return true;
    }
}

class MerchantLimitService {
    public static function getTodayISTStartUTC(): string {
        $todayIST = (new DateTime('now', new DateTimeZone('Asia/Kolkata')))->format('Y-m-d');
        $dt = new DateTime($todayIST . ' 00:00:00', new DateTimeZone('Asia/Kolkata'));
        $dt->setTimezone(new DateTimeZone('UTC'));
        return $dt->format('Y-m-d H:i:s');
    }

    public static function getTodayISTDateString(): string {
        return (new DateTime('now', new DateTimeZone('Asia/Kolkata')))->format('Y-m-d');
    }

    public static function getDailyStats($merchant, $db): array {
        $credentials = is_array($merchant['credentials'] ?? null) 
            ? $merchant['credentials'] 
            : (json_decode($merchant['credentials_json'] ?? '{}', true) ?: []);
        $limits = $credentials['dailyLimits'] ?? [];

        $dailyAmountLimit = isset($limits['dailyAmountLimit']) ? (float)$limits['dailyAmountLimit'] : 0;
        $dailyCountLimit = isset($limits['dailyCountLimit']) ? (int)$limits['dailyCountLimit'] : 0;
        $minAmountPerTxn = isset($limits['minAmountPerTxn']) ? (float)$limits['minAmountPerTxn'] : 0;
        $maxAmountPerTxn = isset($limits['maxAmountPerTxn']) ? (float)$limits['maxAmountPerTxn'] : 0;

        $startOfDayUTC = self::getTodayISTStartUTC();
        $stmt = $db->prepare("SELECT COUNT(*) as txn_count, COALESCE(SUM(amount), 0) as total_amount FROM orders WHERE merchant_account_id = ? AND status = 'TXN_SUCCESS' AND created_at >= ?");
        $stmt->execute([$merchant['id'], $startOfDayUTC]);
        $row = $stmt->fetch();

        $usedAmount = (float)($row['total_amount'] ?? 0);
        $usedCount = (int)($row['txn_count'] ?? 0);

        $isExhausted = false;
        $exhaustedReason = null;

        if ($dailyAmountLimit > 0 && $usedAmount >= $dailyAmountLimit) {
            $isExhausted = true;
            $exhaustedReason = "Daily amount limit reached (₹" . number_format($usedAmount, 2) . " / ₹" . number_format($dailyAmountLimit, 2) . ")";
        } else if ($dailyCountLimit > 0 && $usedCount >= $dailyCountLimit) {
            $isExhausted = true;
            $exhaustedReason = "Daily transaction count limit reached ({$usedCount} / {$dailyCountLimit} txns)";
        }

        return [
            'usedAmount' => $usedAmount,
            'usedCount' => $usedCount,
            'dailyAmountLimit' => $dailyAmountLimit > 0 ? $dailyAmountLimit : null,
            'dailyCountLimit' => $dailyCountLimit > 0 ? $dailyCountLimit : null,
            'minAmountPerTxn' => $minAmountPerTxn > 0 ? $minAmountPerTxn : null,
            'maxAmountPerTxn' => $maxAmountPerTxn > 0 ? $maxAmountPerTxn : null,
            'isExhausted' => $isExhausted,
            'exhaustedReason' => $exhaustedReason,
            'remainingAmount' => $dailyAmountLimit > 0 ? max(0, $dailyAmountLimit - $usedAmount) : null,
            'remainingCount' => $dailyCountLimit > 0 ? max(0, $dailyCountLimit - $usedCount) : null,
            'dateIST' => self::getTodayISTDateString()
        ];
    }
}

// -------------------------------------------------------------
// Router Dispatch
// -------------------------------------------------------------
$uri = $_SERVER['REQUEST_URI'] ?? '/api/health';
$parsed = parse_url($uri);
$path = rtrim($parsed['path'] ?? '/', '/');
$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
$input = getJsonInput();

try {
    // 1. HEALTH CHECK
    if ($path === '/api/health' || $path === '/api') {
        echo json_encode([
            'status' => true,
            'service' => 'PayVia Gateway & Verification Core',
            'domain' => 'payvia360.com',
            'version' => '2.4.0',
            'timestamp' => gmdate('Y-m-d\TH:i:s\Z')
        ]);
        exit;
    }

    // 2. AUTH: LOGIN
    if ($path === '/api/auth/login' && $method === 'POST') {
        $email = trim($input['email'] ?? '');
        $password = $input['password'] ?? '';

        if (!$email || !$password) {
            http_response_code(400);
            echo json_encode(['status' => false, 'error' => 'Email and password are required']);
            exit;
        }

        $db = getDb();
        $stmt = $db->prepare("SELECT * FROM tenants WHERE email = ?");
        $stmt->execute([$email]);
        $tenant = $stmt->fetch();

        if (!$tenant || !password_verify($password, $tenant['password_hash'])) {
            http_response_code(401);
            echo json_encode(['status' => false, 'error' => 'Invalid email or password']);
            exit;
        }

        if (!$tenant['is_active']) {
            http_response_code(403);
            echo json_encode(['status' => false, 'error' => 'This account has been suspended or deactivated']);
            exit;
        }

        $token = jwt_sign([
            'tenantId' => $tenant['id'],
            'email' => $tenant['email'],
            'role' => $tenant['role']
        ]);

        echo json_encode([
            'status' => true,
            'data' => [
                'token' => $token,
                'tenant' => [
                    'id' => $tenant['id'],
                    'name' => $tenant['name'],
                    'email' => $tenant['email'],
                    'role' => $tenant['role'],
                    'businessName' => $tenant['business_name'],
                    'phone' => $tenant['phone'],
                    'planId' => $tenant['plan_id']
                ]
            ]
        ]);
        exit;
    }

    // 3. AUTH: REGISTER
    if ($path === '/api/auth/register' && $method === 'POST') {
        $name = trim($input['name'] ?? '');
        $email = trim(strtolower($input['email'] ?? ''));
        $password = $input['password'] ?? '';
        $businessName = trim($input['businessName'] ?? '');
        $phone = trim($input['phone'] ?? '');

        if (!$email || !$password || !$businessName) {
            http_response_code(400);
            echo json_encode(['status' => false, 'error' => 'Email, password, and business name are required']);
            exit;
        }

        $db = getDb();
        $stmt = $db->prepare("SELECT id FROM tenants WHERE email = ?");
        $stmt->execute([$email]);
        if ($stmt->fetch()) {
            http_response_code(409);
            echo json_encode(['status' => false, 'error' => 'An account with this email already exists']);
            exit;
        }

        $tenantId = 'tenant_' . substr(bin2hex(random_bytes(6)), 0, 8);
        $passwordHash = password_hash($password, PASSWORD_BCRYPT);
        $now = gmdate('Y-m-d\TH:i:s\Z');

        $stmt = $db->prepare("INSERT INTO tenants (id, name, email, password_hash, role, business_name, phone, plan_id, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, 'MERCHANT', ?, ?, 'plan_starter', 1, ?, ?)");
        $stmt->execute([$tenantId, $name ?: $businessName, $email, $passwordHash, $businessName, $phone, $now, $now]);

        // Create subscription in PENDING_PAYMENT status until plan is selected & activated
        $subId = 'sub_' . substr(bin2hex(random_bytes(6)), 0, 8);
        $expires = gmdate('Y-m-d\TH:i:s\Z', strtotime('+30 days'));
        $stmt = $db->prepare("INSERT INTO subscriptions (id, tenant_id, plan_id, status, starts_at, expires_at, orders_today, last_reset_date) VALUES (?, ?, 'plan_starter', 'PENDING_PAYMENT', ?, ?, 0, ?)");
        $stmt->execute([$subId, $tenantId, $now, $expires, date('Y-m-d')]);

        // Initialize Free Test Quota (5 test orders limit)
        $pusgId = 'pusg_' . substr(bin2hex(random_bytes(6)), 0, 8);
        $stmt = $db->prepare("INSERT IGNORE INTO plan_usage (id, tenant_id, test_orders_used, test_orders_limit, created_at, updated_at) VALUES (?, ?, 0, 5, ?, ?)");
        $stmt->execute([$pusgId, $tenantId, $now, $now]);

        // Auto-generate primary API key
        $keyId = 'key_' . substr(bin2hex(random_bytes(6)), 0, 8);
        $rawApiKey = 'pv_live_' . bin2hex(random_bytes(16));
        $keyPrefix = substr($rawApiKey, 0, 12);
        $stmt = $db->prepare("INSERT INTO api_keys (id, tenant_id, name, key_prefix, raw_key, is_active, created_at) VALUES (?, ?, 'Default Live Key', ?, ?, 1, ?)");
        $stmt->execute([$keyId, $tenantId, $keyPrefix, $rawApiKey, $now]);

        $token = jwt_sign([
            'tenantId' => $tenantId,
            'email' => $email,
            'role' => 'MERCHANT'
        ]);

        http_response_code(201);
        echo json_encode([
            'status' => true,
            'message' => 'Account registered successfully',
            'data' => [
                'token' => $token,
                'tenant' => [
                    'id' => $tenantId,
                    'name' => $name ?: $businessName,
                    'email' => $email,
                    'role' => 'MERCHANT',
                    'businessName' => $businessName,
                    'planId' => 'plan_starter'
                ],
                'apiKey' => $rawApiKey
            ]
        ]);
        exit;
    }

    // 4. AUTH: ME
    if ($path === '/api/auth/me' && $method === 'GET') {
        $tenant = authenticateUser();
        if (!$tenant) {
            http_response_code(401);
            echo json_encode(['status' => false, 'error' => 'Authentication token missing or invalid']);
            exit;
        }

        $db = getDb();
        $stmt = $db->prepare("SELECT * FROM plans WHERE id = ?");
        $stmt->execute([$tenant['plan_id']]);
        $plan = $stmt->fetch();
        if ($plan) {
            $plan['features'] = json_decode($plan['features_json'] ?? '[]', true);
            $plan['price'] = (float)$plan['price'];
            $plan['maxMerchantAccounts'] = (int)$plan['max_merchant_accounts'];
            $plan['maxOrdersPerDay'] = (int)$plan['max_orders_per_day'];
            $plan['maxApiKeys'] = (int)$plan['max_api_keys'];
            $plan['validityDays'] = (int)$plan['validity_days'];
        }

        $stmt = $db->prepare("SELECT * FROM subscriptions WHERE tenant_id = ? ORDER BY starts_at DESC LIMIT 1");
        $stmt->execute([$tenant['id']]);
        $subscription = $stmt->fetch();

        // Calculate real-time daily orders count
        $todayPrefix = date('Y-m-d') . '%';
        $stmt = $db->prepare("SELECT COUNT(*) FROM orders WHERE tenant_id = ? AND created_at LIKE ?");
        $stmt->execute([$tenant['id'], $todayPrefix]);
        $ordersToday = (int)$stmt->fetchColumn();

        if ($subscription) {
            $subscription['ordersToday'] = $ordersToday;
            $subscription['orders_today'] = $ordersToday;
            $subscription['startsAt'] = $subscription['starts_at'];
            $subscription['expiresAt'] = $subscription['expires_at'];
            $subscription['tenantId'] = $subscription['tenant_id'];
            $subscription['planId'] = $subscription['plan_id'];
            $subscription['lastResetDate'] = $subscription['last_reset_date'];
        }

        // Live usage calculation
        $stmt = $db->prepare("SELECT COUNT(*) FROM merchants WHERE tenant_id = ? AND status = 'ACTIVE'");
        $stmt->execute([$tenant['id']]);
        $merchantsUsed = (int)$stmt->fetchColumn();

        $stmt = $db->prepare("SELECT COUNT(*) FROM api_keys WHERE tenant_id = ? AND is_active = 1");
        $stmt->execute([$tenant['id']]);
        $apiKeysUsed = (int)$stmt->fetchColumn();

        $ordersMax = $plan ? (int)$plan['max_orders_per_day'] : ($tenant['role'] === 'SUPER_ADMIN' ? 50000 : 2000);

        echo json_encode([
            'status' => true,
            'data' => [
                'tenant' => [
                    'id' => $tenant['id'],
                    'name' => $tenant['name'],
                    'email' => $tenant['email'],
                    'role' => $tenant['role'],
                    'businessName' => $tenant['business_name'],
                    'phone' => $tenant['phone'],
                    'planId' => $tenant['plan_id'],
                    'createdAt' => $tenant['created_at']
                ],
                'plan' => $plan,
                'subscription' => $subscription,
                'entitlements' => PlanService::getEntitlements($tenant['id'], $db),
                'planUsage' => PlanService::getTestUsage($tenant['id'], $db),
                'usage' => [
                    'merchantsUsed' => $merchantsUsed,
                    'merchantsMax' => $plan ? (int)$plan['max_merchant_accounts'] : 2,
                    'apiKeysUsed' => $apiKeysUsed,
                    'apiKeysMax' => $plan ? (int)$plan['max_api_keys'] : 2,
                    'ordersToday' => $ordersToday,
                    'ordersMax' => $ordersMax
                ]
            ]
        ]);
        exit;
    }

    // 4.1 AUTH: UPDATE PROFILE
    if (($path === '/api/auth/profile' || $path === '/api/auth/update-profile') && in_array($method, ['PUT', 'POST', 'PATCH'])) {
        $tenant = authenticateUser();
        if (!$tenant) {
            http_response_code(401);
            echo json_encode(['status' => false, 'error' => 'Authentication token missing or invalid']);
            exit;
        }

        $name = trim($input['name'] ?? $input['full_name'] ?? $input['fullName'] ?? $tenant['name']);
        $phone = trim($input['phone'] ?? $tenant['phone']);
        $businessName = trim($input['businessName'] ?? $input['business_name'] ?? $tenant['business_name']);

        $db = getDb();
        $now = gmdate('Y-m-d\TH:i:s\Z');
        $stmt = $db->prepare("UPDATE tenants SET name = ?, phone = ?, business_name = ?, updated_at = ? WHERE id = ?");
        $stmt->execute([$name, $phone, $businessName, $now, $tenant['id']]);

        // Fetch refreshed tenant
        $stmt = $db->prepare("SELECT * FROM tenants WHERE id = ?");
        $stmt->execute([$tenant['id']]);
        $updated = $stmt->fetch();

        echo json_encode([
            'status' => true,
            'message' => 'Profile updated successfully',
            'data' => [
                'tenant' => [
                    'id' => $updated['id'],
                    'name' => $updated['name'],
                    'email' => $updated['email'],
                    'role' => $updated['role'],
                    'businessName' => $updated['business_name'],
                    'phone' => $updated['phone'],
                    'planId' => $updated['plan_id'],
                    'createdAt' => $updated['created_at']
                ]
            ]
        ]);
        exit;
    }

    // 4.2 AUTH: UPDATE PASSWORD
    if ($path === '/api/auth/update-password' && $method === 'POST') {
        $tenant = authenticateUser();
        if (!$tenant) {
            http_response_code(401);
            echo json_encode(['status' => false, 'error' => 'Authentication token missing or invalid']);
            exit;
        }

        $newPassword = $input['password'] ?? $input['newPassword'] ?? '';
        if (strlen($newPassword) < 6) {
            http_response_code(400);
            echo json_encode(['status' => false, 'error' => 'Password must be at least 6 characters']);
            exit;
        }

        $db = getDb();
        $now = gmdate('Y-m-d\TH:i:s\Z');
        $passwordHash = password_hash($newPassword, PASSWORD_BCRYPT);
        $stmt = $db->prepare("UPDATE tenants SET password_hash = ?, updated_at = ? WHERE id = ?");
        $stmt->execute([$passwordHash, $now, $tenant['id']]);

        echo json_encode([
            'status' => true,
            'message' => 'Password updated successfully'
        ]);
        exit;
    }

    // 4.3 AUTH: UPDATE EMAIL
    if ($path === '/api/auth/update-email' && $method === 'POST') {
        $tenant = authenticateUser();
        if (!$tenant) {
            http_response_code(401);
            echo json_encode(['status' => false, 'error' => 'Authentication token missing or invalid']);
            exit;
        }

        $newEmail = trim(strtolower($input['email'] ?? $input['newEmail'] ?? ''));
        if (!filter_var($newEmail, FILTER_VALIDATE_EMAIL)) {
            http_response_code(400);
            echo json_encode(['status' => false, 'error' => 'Invalid email address']);
            exit;
        }

        $db = getDb();
        // Check if email already taken
        $stmt = $db->prepare("SELECT id FROM tenants WHERE email = ? AND id != ?");
        $stmt->execute([$newEmail, $tenant['id']]);
        if ($stmt->fetch()) {
            http_response_code(400);
            echo json_encode(['status' => false, 'error' => 'Email address is already in use by another account']);
            exit;
        }

        $now = gmdate('Y-m-d\TH:i:s\Z');
        $stmt = $db->prepare("UPDATE tenants SET email = ?, updated_at = ? WHERE id = ?");
        $stmt->execute([$newEmail, $now, $tenant['id']]);

        echo json_encode([
            'status' => true,
            'message' => 'Email updated successfully',
            'data' => ['email' => $newEmail]
        ]);
        exit;
    }

    // 5. MERCHANTS (Connected Accounts)
    if (strpos($path, '/api/merchants') === 0) {
        $tenant = authenticateUser();
        if (!$tenant) {
            http_response_code(401);
            echo json_encode(['status' => false, 'error' => 'Unauthorized']);
            exit;
        }
        $db = getDb();

        // 5.1 GET ALL MERCHANTS
        if ($method === 'GET' && ($path === '/api/merchants' || $path === '/api/merchants/')) {
            header('Cache-Control: no-cache, no-store, must-revalidate');
            header('Pragma: no-cache');
            header('Expires: 0');

            $stmt = $db->prepare("SELECT * FROM merchants WHERE tenant_id = ? ORDER BY created_at DESC");
            $stmt->execute([$tenant['id']]);
            $merchants = $stmt->fetchAll();
            foreach ($merchants as &$m) {
                $m['upiId'] = $m['upi_id'] ?? '';
                $creds = json_decode($m['credentials_json'] ?? '{}', true) ?: [];
                $m['credentials'] = $creds;
                $m['dailyLimits'] = $creds['dailyLimits'] ?? [];
                $m['dailyStats'] = MerchantLimitService::getDailyStats($m, $db);
                $m['intentEnabled'] = (bool)$m['intent_enabled'];
                $m['gmailConnected'] = (bool)$m['gmail_connected'];
                $m['displayName'] = $m['display_name'];
                $m['smsCount'] = (int)$m['sms_count'];
                $m['lastUsedAt'] = $m['last_used_at'];
            }
            echo json_encode(['status' => true, 'data' => $merchants]);
            exit;
        }

        // 5.2 TOGGLE STATUS (POST /api/merchants/{id}/toggle)
        if (preg_match('#^/api/merchants/([^/]+)/toggle$#', $path, $m) && $method === 'POST') {
            $merId = $m[1];
            $stmt = $db->prepare("SELECT * FROM merchants WHERE id = ? AND (tenant_id = ? OR ? = 'SUPER_ADMIN')");
            $stmt->execute([$merId, $tenant['id'], $tenant['role'] ?? '']);
            $mer = $stmt->fetch();
            if (!$mer) {
                http_response_code(404);
                echo json_encode(['status' => false, 'error' => 'Merchant account not found']);
                exit;
            }

            $newStatus = ($mer['status'] === 'ACTIVE') ? 'PAUSED' : 'ACTIVE';
            if ($newStatus === 'ACTIVE') {
                PlanService::requireActivePlan($tenant['id'], $path, $db);
            }

            $now = gmdate('Y-m-d\TH:i:s\Z');
            $upd = $db->prepare("UPDATE merchants SET status = ?, updated_at = ? WHERE id = ?");
            $upd->execute([$newStatus, $now, $merId]);

            echo json_encode([
                'status' => true,
                'message' => "Account is now " . strtolower($newStatus),
                'data' => array_merge($mer, ['status' => $newStatus, 'upiId' => $mer['upi_id'] ?? ''])
            ]);
            exit;
        }

        // 5.3 CREATE MERCHANT (POST /api/merchants or POST /api/merchants/create)
        if (($path === '/api/merchants' || $path === '/api/merchants/' || $path === '/api/merchants/create') && $method === 'POST') {
            PlanService::requireActivePlan($tenant['id'], '/api/merchants', $db);

            $id = 'mer_' . substr(bin2hex(random_bytes(6)), 0, 8);
            $provider = $input['provider'] ?? 'CUSTOM_UPI';
            $label = trim($input['label'] ?? 'Main Merchant');
            $upiId = trim($input['upiId'] ?? $input['upi_id'] ?? '');
            $displayName = trim($input['displayName'] ?? $input['display_name'] ?? $label);
            $weight = (int)($input['weight'] ?? 1);
            $intentEnabled = isset($input['intentEnabled']) ? (int)$input['intentEnabled'] : 1;
            $credentials = $input['credentials'] ?? [];
            if (!empty($input['dailyLimits'])) {
                $credentials['dailyLimits'] = $input['dailyLimits'];
            }
            $credsJson = json_encode($credentials);
            $now = gmdate('Y-m-d\TH:i:s\Z');

            $stmt = $db->prepare("INSERT INTO merchants (id, tenant_id, provider, label, upi_id, display_name, weight, status, intent_enabled, gmail_connected, credentials_json, sms_count, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, 0, ?, 0, ?, ?)");
            $stmt->execute([$id, $tenant['id'], $provider, $label, $upiId, $displayName, $weight, $intentEnabled, $credsJson, $now, $now]);

            PlanService::logAccess($tenant['id'], 'MERCHANT_CONNECTED', '/api/merchants', 'SUCCESS', "Merchant account $id connected", $db);

            echo json_encode(['status' => true, 'message' => 'Merchant added successfully', 'data' => ['id' => $id, 'label' => $label, 'provider' => $provider, 'upiId' => $upiId, 'status' => 'ACTIVE']]);
            exit;
        }

        // 5.4 UPDATE MERCHANT DETAILS & UPI ID (PUT /api/merchants/{id} or PATCH /api/merchants/{id})
        if (preg_match('#^/api/merchants/([^/]+)$#', $path, $m) && ($method === 'PUT' || $method === 'PATCH')) {
            $merId = $m[1];

            $currStmt = $db->prepare("SELECT * FROM merchants WHERE id = ? AND (tenant_id = ? OR ? = 'SUPER_ADMIN')");
            $currStmt->execute([$merId, $tenant['id'], $tenant['role'] ?? '']);
            $curr = $currStmt->fetch();

            if (!$curr) {
                http_response_code(404);
                echo json_encode(['status' => false, 'error' => 'Merchant account not found']);
                exit;
            }

            $status = $input['status'] ?? null;
            if ($status === 'ACTIVE') {
                PlanService::requireActivePlan($tenant['id'], $path, $db);
            }

            $fields = [];
            $params = [];

            if ($status !== null) { 
                $fields[] = "status = ?"; 
                $params[] = $status; 
            }
            if (isset($input['label'])) { 
                $fields[] = "label = ?"; 
                $params[] = trim($input['label']); 
            }
            if (isset($input['upiId']) || isset($input['upi_id'])) { 
                $fields[] = "upi_id = ?"; 
                $params[] = trim($input['upiId'] ?? $input['upi_id']); 
            }
            if (isset($input['displayName']) || isset($input['display_name'])) { 
                $fields[] = "display_name = ?"; 
                $params[] = trim($input['displayName'] ?? $input['display_name']); 
            }
            if (isset($input['weight'])) { 
                $fields[] = "weight = ?"; 
                $params[] = max(1, (int)$input['weight']); 
            }
            if (isset($input['intentEnabled'])) { 
                $fields[] = "intent_enabled = ?"; 
                $params[] = (int)$input['intentEnabled']; 
            }

            if (isset($input['credentials']) || isset($input['dailyLimits'])) {
                $currCreds = json_decode($curr['credentials_json'] ?? '{}', true) ?: [];
                if (isset($input['credentials']) && is_array($input['credentials'])) {
                    $currCreds = array_merge($currCreds, $input['credentials']);
                }
                if (isset($input['dailyLimits'])) {
                    $currCreds['dailyLimits'] = $input['dailyLimits'];
                }
                $fields[] = "credentials_json = ?";
                $params[] = json_encode($currCreds);
            }

            $fields[] = "updated_at = ?";
            $params[] = gmdate('Y-m-d\TH:i:s\Z');
            $params[] = $merId;

            if (!empty($fields)) {
                $stmt = $db->prepare("UPDATE merchants SET " . implode(', ', $fields) . " WHERE id = ?");
                $stmt->execute($params);
            }

            // Return fresh updated merchant object
            $refetchedStmt = $db->prepare("SELECT * FROM merchants WHERE id = ?");
            $refetchedStmt->execute([$merId]);
            $updatedMer = $refetchedStmt->fetch();
            if ($updatedMer) {
                $updatedMer['upiId'] = $updatedMer['upi_id'] ?? '';
                $creds = json_decode($updatedMer['credentials_json'] ?? '{}', true) ?: [];
                $updatedMer['credentials'] = $creds;
                $updatedMer['dailyLimits'] = $creds['dailyLimits'] ?? [];
                $updatedMer['dailyStats'] = MerchantLimitService::getDailyStats($updatedMer, $db);
                $updatedMer['intentEnabled'] = (bool)$updatedMer['intent_enabled'];
                $updatedMer['displayName'] = $updatedMer['display_name'];
            }

            echo json_encode([
                'status' => true,
                'message' => 'Merchant updated successfully',
                'data' => $updatedMer
            ]);
            exit;
        }

        // 5.5 DELETE MERCHANT (DELETE /api/merchants/{id})
        if (preg_match('#^/api/merchants/([^/]+)$#', $path, $m) && $method === 'DELETE') {
            $merId = $m[1];
            $stmt = $db->prepare("DELETE FROM merchants WHERE id = ? AND (tenant_id = ? OR ? = 'SUPER_ADMIN')");
            $stmt->execute([$merId, $tenant['id'], $tenant['role'] ?? '']);
            echo json_encode(['status' => true, 'message' => 'Merchant removed']);
            exit;
        }
    }

    // 6. ORDERS & SETTLEMENTS
    if (strpos($path, '/api/orders') === 0 || $path === '/api/public/v1/order/create') {
        $auth = authenticateApiKeyOrUser();
        if (!$auth) {
            http_response_code(401);
            echo json_encode(['status' => false, 'error' => 'Authentication required']);
            exit;
        }
        $tenant = $auth['tenant'];
        $db = getDb();

        if ($method === 'GET' && ($path === '/api/orders' || $path === '/api/orders/')) {
            $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;
            $stmt = $db->prepare("SELECT * FROM orders WHERE tenant_id = ? ORDER BY created_at DESC LIMIT " . $limit);
            $stmt->execute([$tenant['id']]);
            $orders = $stmt->fetchAll();
            foreach ($orders as &$o) {
                $o['amount'] = (float)$o['amount'];
                $o['orderId'] = $o['order_id'];
                $o['paymentUrl'] = $o['payment_url'];
                $o['customerMobile'] = $o['customer_mobile'];
                $o['customerName'] = $o['customer_name'];
                $o['paidAt'] = $o['paid_at'];
                $o['createdAt'] = $o['created_at'];
            }
            echo json_encode(['status' => true, 'data' => $orders]);
            exit;
        }

        // Force Verify Order
        if ($method === 'POST' && preg_match('#^/api/orders/([^/]+)/force-verify#', $path, $m)) {
            $orderId = $m[1];
            $stmt = $db->prepare("SELECT * FROM orders WHERE (id = ? OR order_id = ?) AND tenant_id = ? LIMIT 1");
            $stmt->execute([$orderId, $orderId, $tenant['id']]);
            $order = $stmt->fetch();
            if (!$order) {
                http_response_code(404);
                echo json_encode(['status' => false, 'error' => 'Order not found']);
                exit;
            }

            if (strpos($order['remark1'] ?? '', 'PLAN_PURCHASE:') === 0) {
                http_response_code(403);
                echo json_encode(['status' => false, 'error' => 'Subscription orders cannot be force-verified. A captured payment receipt is required.']);
                exit;
            }

            if (($order['mode'] ?? 'LIVE') === 'LIVE' && !PlanService::isPlanActive($tenant['id'], $db)) {
                PlanService::logAccess($tenant['id'], 'SETTLEMENT_BLOCKED', $path, 'BLOCKED', 'Active plan required for live order settlement', $db);
                http_response_code(403);
                echo json_encode([
                    'status' => false,
                    'error' => 'PLAN_REQUIRED',
                    'reason' => 'ACTIVE_PLAN_REQUIRED',
                    'message' => 'Settling live payment orders requires an active subscription plan.'
                ]);
                exit;
            }

            $utr = !empty($input['utr']) ? $input['utr'] : ('MANUAL_' . strtoupper(bin2hex(random_bytes(4))));
            $now = gmdate('Y-m-d\TH:i:s\Z');
            $stmt = $db->prepare("UPDATE orders SET status = 'TXN_SUCCESS', utr = ?, paid_at = ?, updated_at = ? WHERE id = ?");
            $stmt->execute([$utr, $now, $now, $order['id']]);
            $order['status'] = 'TXN_SUCCESS';
            PlanService::activatePurchasedPlanIfSettled($db, $order);
            echo json_encode(['status' => true, 'message' => 'Order verified and settled successfully']);
            exit;
        }

        // Cancel Order
        if ($method === 'POST' && preg_match('#^/api/orders/([^/]+)/cancel#', $path, $m)) {
            $orderId = $m[1];
            $now = gmdate('Y-m-d\TH:i:s\Z');
            $stmt = $db->prepare("UPDATE orders SET status = 'CANCELLED', updated_at = ? WHERE (id = ? OR order_id = ?) AND tenant_id = ?");
            $stmt->execute([$now, $orderId, $orderId, $tenant['id']]);
            echo json_encode(['status' => true, 'message' => 'Order cancelled']);
            exit;
        }

        if ($method === 'POST') {
            $amount = (float)($input['amount'] ?? 0);
            if ($amount <= 0) {
                http_response_code(400);
                echo json_encode(['status' => false, 'error' => 'Amount must be greater than 0']);
                exit;
            }

            $isActive = PlanService::isPlanActive($tenant['id'], $db);
            $mode = 'LIVE';

            if (!$isActive) {
                // Free Test Mode: Must consume quota atomically under row lock inside transaction
                $db->beginTransaction();
                $allowed = PlanService::consumeTestOrderQuota($tenant['id'], $db);
                if (!$allowed) {
                    $db->rollBack();
                    PlanService::logAccess($tenant['id'], 'ORDER_CREATION_BLOCKED', $path, 'BLOCKED', 'Free test limit reached (5/5)', $db);
                    http_response_code(403);
                    echo json_encode([
                        'status' => false,
                        'error' => 'PLAN_UPGRADE_REQUIRED',
                        'reason' => 'FREE_TEST_LIMIT_REACHED',
                        'message' => 'Free test quota reached (5/5). Please upgrade to an active plan to create more orders or connect live merchant accounts.',
                        'data' => PlanService::getTestUsage($tenant['id'], $db)
                    ]);
                    exit;
                }

                $mode = 'TEST';
                // Enforce mock sandbox merchant for test orders
                $merchant = [
                    'id' => 'mch_sandbox_test',
                    'label' => 'Sandbox Test Gateway',
                    'provider' => 'CUSTOM_UPI',
                    'upi_id' => 'test@payvia',
                    'display_name' => 'PayVia Test Sandbox'
                ];
            } else {
                // Active Plan: Pick specified or active merchant for this tenant with daily limits checking
                $merchant = null;
                if (!empty($input['merchantAccountId'])) {
                    $stmt = $db->prepare("SELECT * FROM merchants WHERE id = ? AND tenant_id = ?");
                    $stmt->execute([$input['merchantAccountId'], $tenant['id']]);
                    $pinned = $stmt->fetch();
                    if ($pinned) {
                        $stats = MerchantLimitService::getDailyStats($pinned, $db);
                        if (!empty($stats['dailyAmountLimit']) && ($stats['usedAmount'] + $amount) > $stats['dailyAmountLimit']) {
                            http_response_code(429);
                            echo json_encode([
                                'status' => false,
                                'error' => "Pinned merchant account '{$pinned['label']}' has reached its daily limit of ₹" . number_format($stats['dailyAmountLimit'], 2) . " (used: ₹" . number_format($stats['usedAmount'], 2) . "). Limits reset at 00:00 IST."
                            ]);
                            exit;
                        }
                        if (!empty($stats['dailyCountLimit']) && $stats['usedCount'] >= $stats['dailyCountLimit']) {
                            http_response_code(429);
                            echo json_encode([
                                'status' => false,
                                'error' => "Pinned merchant account '{$pinned['label']}' has reached its daily transaction limit of {$stats['dailyCountLimit']} transactions. Limits reset at 00:00 IST."
                            ]);
                            exit;
                        }
                        $merchant = $pinned;
                    }
                }

                if (!$merchant) {
                    // Query all ACTIVE merchants for this tenant
                    $stmt = $db->prepare("SELECT * FROM merchants WHERE tenant_id = ? AND status = 'ACTIVE' ORDER BY weight DESC, created_at ASC");
                    $stmt->execute([$tenant['id']]);
                    $activeMerchants = $stmt->fetchAll();

                    // Filter out accounts where daily limits or per-txn limits are exceeded
                    $eligible = [];
                    foreach ($activeMerchants as $candidate) {
                        $stats = MerchantLimitService::getDailyStats($candidate, $db);
                        if (!empty($stats['minAmountPerTxn']) && $amount < $stats['minAmountPerTxn']) continue;
                        if (!empty($stats['maxAmountPerTxn']) && $amount > $stats['maxAmountPerTxn']) continue;
                        if (!empty($stats['dailyAmountLimit']) && ($stats['usedAmount'] + $amount) > $stats['dailyAmountLimit']) continue;
                        if (!empty($stats['dailyCountLimit']) && $stats['usedCount'] >= $stats['dailyCountLimit']) continue;
                        $eligible[] = $candidate;
                    }

                    if (!empty($eligible)) {
                        // Weighted random selection among non-exhausted eligible accounts
                        $totalWeight = 0;
                        foreach ($eligible as $e) {
                            $totalWeight += max(1, (int)($e['weight'] ?? 1));
                        }
                        $rand = rand(1, max(1, $totalWeight));
                        $currWeight = 0;
                        foreach ($eligible as $e) {
                            $currWeight += max(1, (int)($e['weight'] ?? 1));
                            if ($rand <= $currWeight) {
                                $merchant = $e;
                                break;
                            }
                        }
                        if (!$merchant) $merchant = $eligible[0];
                    } else if (!empty($activeMerchants)) {
                        http_response_code(429);
                        echo json_encode([
                            'status' => false,
                            'error' => 'All connected UPI accounts have reached their daily processing limit for today. Limits automatically reset at 00:00 IST.'
                        ]);
                        exit;
                    }

                    // If tenant has no merchant account at all, auto-create a primary one
                    if (!$merchant) {
                        $merchantId = 'mch_' . bin2hex(random_bytes(4));
                        $merchantUpi = 'merchant@upi';
                        $merchantLabel = 'Primary UPI Gateway';
                        $merchantDisplayName = $tenant['business_name'] ?: $tenant['name'] ?: 'PayVia Merchant';
                        $now = gmdate('Y-m-d\TH:i:s\Z');
                        $insM = $db->prepare("INSERT INTO merchants (id, tenant_id, provider, label, upi_id, display_name, weight, status, intent_enabled, gmail_connected, credentials_json, sms_count, created_at, updated_at) VALUES (?, ?, 'CUSTOM_UPI', ?, ?, ?, 10, 'ACTIVE', 1, 0, '{}', 0, ?, ?)");
                        $insM->execute([$merchantId, $tenant['id'], $merchantLabel, $merchantUpi, $merchantDisplayName, $now, $now]);
                        $merchant = [
                            'id' => $merchantId,
                            'label' => $merchantLabel,
                            'provider' => 'CUSTOM_UPI',
                            'upi_id' => $merchantUpi,
                            'display_name' => $merchantDisplayName
                        ];
                    }
                }
            }

            // Resolve the checkout design from the saved payment-page setup.
            // An explicit API template is accepted only if it is enabled for
            // this merchant; otherwise fixed/random/rotate is honored.
            $templateIds = ['template_1', 'template_2', 'template_3', 'template_4', 'template_5', 'template_6', 'template_7', 'template_8', 'template_9', 'template_10', 'template_11'];
            $settingsStmt = $db->prepare("SELECT template_mode, default_template, enabled_templates FROM tenant_template_settings WHERE tenant_id = ? LIMIT 1");
            $settingsStmt->execute([$tenant['id']]);
            $templateSettings = $settingsStmt->fetch() ?: [];
            $enabledTemplates = json_decode($templateSettings['enabled_templates'] ?? '[]', true);
            $enabledTemplates = is_array($enabledTemplates) ? array_values(array_intersect($templateIds, $enabledTemplates)) : [];
            if (empty($enabledTemplates)) $enabledTemplates = $templateIds;

            $requestedTemplate = trim($input['template'] ?? '');
            if ($requestedTemplate && in_array($requestedTemplate, $enabledTemplates, true)) {
                $template = $requestedTemplate;
            } else {
                $templateMode = $templateSettings['template_mode'] ?? 'fixed';
                $defaultTemplate = $templateSettings['default_template'] ?? 'template_1';
                if ($templateMode === 'random') {
                    $template = $enabledTemplates[array_rand($enabledTemplates)];
                } elseif ($templateMode === 'rotate') {
                    $countStmt = $db->prepare("SELECT COUNT(*) FROM orders WHERE tenant_id = ?");
                    $countStmt->execute([$tenant['id']]);
                    $template = $enabledTemplates[((int)$countStmt->fetchColumn()) % count($enabledTemplates)];
                } else {
                    $template = in_array($defaultTemplate, $enabledTemplates, true) ? $defaultTemplate : $enabledTemplates[0];
                }
            }
            $orderId = 'PV_' . strtoupper(bin2hex(random_bytes(5)));
            $linkToken = bin2hex(random_bytes(16));
            $paymentUrl = "https://payvia360.com/pay/$linkToken";
            $now = gmdate('Y-m-d\TH:i:s\Z');
            $expires = gmdate('Y-m-d\TH:i:s\Z', strtotime('+15 minutes'));

            try {
                $stmt = $db->prepare("INSERT INTO orders (id, order_id, tenant_id, merchant_account_id, merchant_account_label, provider, amount, currency, status, customer_mobile, customer_name, remark1, return_url, callback_url, template, link_token, payment_url, expires_at, created_at, updated_at, mode) VALUES (?, ?, ?, ?, ?, ?, ?, 'INR', 'PENDING', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
                $stmt->execute([
                    $orderId,
                    $orderId,
                    $tenant['id'],
                    $merchant['id'],
                    $merchant['label'] ?: 'Default UPI Engine',
                    $merchant['provider'] ?: 'CUSTOM_UPI',
                    $amount,
                    $input['customerMobile'] ?? $input['customer_mobile'] ?? null,
                    $input['customerName'] ?? $input['customer_name'] ?? null,
                    $input['remark1'] ?? $input['remark'] ?? 'Payment',
                    $input['return_url'] ?? $input['returnUrl'] ?? null,
                    $input['callback_url'] ?? $input['callbackUrl'] ?? null,
                    $template,
                    $linkToken,
                    $paymentUrl,
                    $expires,
                    $now,
                    $now,
                    $mode
                ]);

                if ($db->inTransaction()) {
                    $db->commit();
                }

                PlanService::logAccess($tenant['id'], 'ORDER_CREATED', $path, 'SUCCESS', "Order $orderId created in $mode mode", $db);
            } catch (Exception $e) {
                if ($db->inTransaction()) {
                    $db->rollBack();
                }
                http_response_code(500);
                echo json_encode(['status' => false, 'error' => 'Failed to create order: ' . $e->getMessage()]);
                exit;
            }

            $testUsage = !$isActive ? PlanService::getTestUsage($tenant['id'], $db) : null;

            echo json_encode([
                'status' => true,
                'message' => $mode === 'TEST' ? 'Test payment link created (Sandbox mode)' : 'Payment link created',
                'data' => [
                    'orderId' => $orderId,
                    'order_id' => $orderId,
                    'linkToken' => $linkToken,
                    'link_token' => $linkToken,
                    'paymentUrl' => $paymentUrl,
                    'payment_url' => $paymentUrl,
                    'amount' => $amount,
                    'template' => $template,
                    'provider' => $merchant['provider'],
                    'status' => 'PENDING',
                    'mode' => $mode,
                    'isTest' => ($mode === 'TEST'),
                    'expiresAt' => $expires,
                    'expires_at' => $expires,
                    'testUsage' => $testUsage
                ]
            ]);
            exit;
        }
    }

    // 6b. SUBMIT MANUAL UTR (Public)
    if ($path === '/api/public/v1/order/submit-utr' || $path === '/api/orders/submit-utr' || $path === '/api/checkout/submit-utr') {
        $linkToken = $input['link_token'] ?? $input['linkToken'] ?? $input['token'] ?? '';
        $utr = trim($input['utr'] ?? $input['reference'] ?? '');

        if (!$linkToken || !$utr) {
            http_response_code(400);
            echo json_encode(['status' => false, 'error' => 'link_token and utr are required']);
            exit;
        }

        $db = getDb();
        $stmt = $db->prepare("SELECT * FROM orders WHERE link_token = ?");
        $stmt->execute([$linkToken]);
        $order = $stmt->fetch();

        if (!$order) {
            http_response_code(404);
            echo json_encode(['status' => false, 'error' => 'Order payment session not found or expired']);
            exit;
        }

        if ($order['status'] === 'TXN_SUCCESS') {
            echo json_encode([
                'status' => true,
                'message' => 'Payment is already confirmed',
                'data' => [
                    'order_id' => $order['order_id'],
                    'orderId' => $order['order_id'],
                    'status' => 'TXN_SUCCESS',
                    'utr' => $order['utr']
                ]
            ]);
            exit;
        }

        // ── REAL PAYMENT FLOW: Do NOT auto-settle on UTR submission ──────────────
        // Store UTR as pending review. Super Admin must confirm via Admin Panel
        // before the plan activates. Auto-settle only happens via Companion App SMS detection.
        $now = gmdate('Y-m-d\TH:i:s\Z');
        $upd = $db->prepare("UPDATE orders SET status = 'UTR_SUBMITTED', utr = ?, updated_at = ? WHERE id = ? AND status = 'PENDING'");
        $upd->execute([$utr, $now, $order['id']]);

        PlanService::logAccess(
            $order['tenant_id'] ?? '',
            'UTR_SUBMITTED',
            '/api/public/v1/order/submit-utr',
            'PENDING',
            "UTR {$utr} submitted for order {$order['order_id']} — awaiting Super Admin confirmation",
            $db
        );

        echo json_encode([
            'status' => true,
            'message' => 'UTR reference submitted successfully. Awaiting Super Admin payment confirmation.',
            'data' => [
                'order_id' => $order['order_id'],
                'orderId' => $order['order_id'],
                'status' => 'UTR_SUBMITTED',
                'utr' => $utr,
                'pendingReview' => true
            ]
        ]);
        exit;
    }

    // 7. CHECKOUT / PAY PAGE DATA (Public)
    if (strpos($path, '/api/checkout') === 0) {
        $parts = explode('/', $path);
        $linkToken = end($parts);
        $db = getDb();

        $stmt = $db->prepare("SELECT o.*, m.upi_id as merchant_upi_id, m.display_name as merchant_display_name, t.business_name as tenant_business_name FROM orders o LEFT JOIN merchants m ON o.merchant_account_id = m.id LEFT JOIN tenants t ON o.tenant_id = t.id WHERE o.link_token = ?");
        $stmt->execute([$linkToken]);
        $order = $stmt->fetch();

        if (!$order) {
            http_response_code(404);
            echo json_encode(['status' => false, 'error' => 'Order payment link not found or expired']);
            exit;
        }

        $upiId = $order['merchant_upi_id'] ?: 'payvia@upi';
        $merchantName = $order['merchant_display_name'] ?: $order['tenant_business_name'] ?: 'PayVia Verified Merchant';
        $amount = (float)$order['amount'];
        $merchantNameEncoded = urlencode($merchantName);
        $orderIdEncoded = urlencode($order['order_id']);
        $upiIntent = "upi://pay?pa=$upiId&pn=$merchantNameEncoded&am=$amount&cu=INR&tn=$orderIdEncoded";

        $intentLinks = [
            'generic_upi' => $upiIntent,
            'gpay' => "gpay://upi/pay?pa=$upiId&pn=$merchantNameEncoded&am=$amount&cu=INR&tn=$orderIdEncoded",
            'phonepe' => "phonepe://pay?pa=$upiId&pn=$merchantNameEncoded&am=$amount&cu=INR&tn=$orderIdEncoded",
            'paytm' => "paytmmp://pay?pa=$upiId&pn=$merchantNameEncoded&am=$amount&cu=INR&tn=$orderIdEncoded",
            'bhim' => "bhim://upi/pay?pa=$upiId&pn=$merchantNameEncoded&am=$amount&cu=INR&tn=$orderIdEncoded",
            'cred' => "cred://upi/pay?pa=$upiId&pn=$merchantNameEncoded&am=$amount&cu=INR&tn=$orderIdEncoded"
        ];

        $tplStmt = $db->prepare("SELECT brand_name, brand_color FROM tenant_template_settings WHERE tenant_id = ?");
        $tplStmt->execute([$order['tenant_id']]);
        $tplSettings = $tplStmt->fetch();
        $brandColor = ($tplSettings && !empty($tplSettings['brand_color'])) ? $tplSettings['brand_color'] : '#8b5cf6';
        if ($tplSettings && !empty($tplSettings['brand_name'])) {
            $merchantName = $tplSettings['brand_name'];
        }

        echo json_encode([
            'status' => true,
            'data' => [
                'order_id' => $order['order_id'],
                'orderId' => $order['order_id'],
                'amount' => $amount,
                'currency' => 'INR',
                'status' => $order['status'],
                'template' => $order['template'] ?: 'template_1',
                'remark1' => $order['remark1'] ?: '',
                'customer_name' => $order['customer_name'] ?: '',
                'customer_mobile' => $order['customer_mobile'] ?: '',
                'expires_at' => $order['expires_at'],
                'expiresAt' => $order['expires_at'],
                'paid_at' => $order['paid_at'],
                'paidAt' => $order['paid_at'],
                'return_url' => $order['return_url'],
                'returnUrl' => $order['return_url'],
                'utr' => $order['utr'],
                'upiId' => $upiId,
                'merchantName' => $merchantName,
                'upiIntentUrl' => $upiIntent,
                'branding' => [
                    'brand_name' => $merchantName,
                    'brand_color' => $brandColor
                ],
                'payment_details' => [
                    'upi_id' => $upiId,
                    'display_name' => $merchantName,
                    'intent_enabled' => true,
                    'qr_code_base64' => '',
                    'upi_intent_url' => $upiIntent,
                    'intent_links' => $intentLinks
                ]
            ]
        ]);
        exit;
    }

    // 7.1 TEMPLATES & PAYMENT PAGE CUSTOMIZATION
    if (strpos($path, '/api/templates') === 0) {
        $db = getDb();

        if ($path === '/api/templates/settings') {
            $tenant = authenticateUser();
            $tenantId = $tenant ? $tenant['id'] : 'tenant_pankaj_007';

            if (in_array($method, ['PUT', 'POST'])) {
                $templateMode = $input['templateMode'] ?? $input['template_mode'] ?? 'fixed';
                $defaultTemplate = $input['defaultTemplate'] ?? $input['default_template'] ?? 'template_1';
                $enabledTemplates = json_encode($input['enabledTemplates'] ?? $input['enabled_templates'] ?? [$defaultTemplate]);
                $brandName = $input['brandName'] ?? $input['brand_name'] ?? null;
                $brandColor = $input['brandColor'] ?? $input['brand_color'] ?? '#8b5cf6';
                $logoUrl = $input['logoUrl'] ?? $input['logo_url'] ?? '';
                $supportNote = $input['supportNote'] ?? $input['support_note'] ?? '';
                $now = gmdate('Y-m-d\TH:i:s\Z');

                $stmt = $db->prepare("INSERT INTO tenant_template_settings (tenant_id, template_mode, default_template, enabled_templates, brand_name, brand_color, logo_url, support_note, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE template_mode = VALUES(template_mode), default_template = VALUES(default_template), enabled_templates = VALUES(enabled_templates), brand_name = VALUES(brand_name), brand_color = VALUES(brand_color), logo_url = VALUES(logo_url), support_note = VALUES(support_note), updated_at = VALUES(updated_at)");
                $stmt->execute([$tenantId, $templateMode, $defaultTemplate, $enabledTemplates, $brandName, $brandColor, $logoUrl, $supportNote, $now]);

                echo json_encode([
                    'status' => true,
                    'message' => 'Template settings saved successfully',
                    'data' => [
                        'templateMode' => $templateMode,
                        'defaultTemplate' => $defaultTemplate,
                        'enabledTemplates' => json_decode($enabledTemplates, true),
                        'brandName' => $brandName,
                        'brandColor' => $brandColor,
                        'logoUrl' => $logoUrl,
                        'supportNote' => $supportNote
                    ]
                ]);
                exit;
            } else {
                $stmt = $db->prepare("SELECT * FROM tenant_template_settings WHERE tenant_id = ?");
                $stmt->execute([$tenantId]);
                $settings = $stmt->fetch();

                $all11 = ['template_1', 'template_2', 'template_3', 'template_4', 'template_5', 'template_6', 'template_7', 'template_8', 'template_9', 'template_10', 'template_11'];
                $enabledTemplates = ($settings && !empty($settings['enabled_templates'])) 
                    ? json_decode($settings['enabled_templates'], true) 
                    : $all11;

                // Compute real stats from orders table
                $statsMap = [];
                try {
                    $statsStmt = $db->prepare("SELECT template, COUNT(*) as total_orders, SUM(CASE WHEN status = 'TXN_SUCCESS' THEN 1 ELSE 0 END) as success_orders FROM orders WHERE tenant_id = ? GROUP BY template");
                    $statsStmt->execute([$tenantId]);
                    $orderStats = $statsStmt->fetchAll();
                    foreach ($orderStats as $os) {
                        $total = intval($os['total_orders']);
                        $success = intval($os['success_orders']);
                        $conv = $total > 0 ? round(($success / $total) * 100, 1) : 0;
                        $statsMap[$os['template']] = [
                            'template_id' => $os['template'],
                            'views' => $total,
                            'success' => $success,
                            'conversion' => $conv
                        ];
                    }
                } catch (Exception $e) {}

                $statsList = [];
                for ($i = 1; $i <= 11; $i++) {
                    $tId = "template_$i";
                    $statsList[] = $statsMap[$tId] ?? [
                        'template_id' => $tId,
                        'views' => 0,
                        'success' => 0,
                        'conversion' => 0
                    ];
                }

                echo json_encode([
                    'status' => true,
                    'data' => [
                        'templateMode' => $settings['template_mode'] ?? 'fixed',
                        'defaultTemplate' => $settings['default_template'] ?? 'template_1',
                        'enabledTemplates' => $enabledTemplates,
                        'brandName' => $settings['brand_name'] ?? ($tenant ? $tenant['business_name'] : ''),
                        'brandColor' => $settings['brand_color'] ?? '#8b5cf6',
                        'logoUrl' => $settings['logo_url'] ?? '',
                        'supportNote' => $settings['support_note'] ?? '',
                        'stats' => $statsList
                    ]
                ]);
                exit;
            }
        }

        if (strpos($path, '/api/templates/preview') === 0) {
            $parts = explode('/', $path);
            $tplId = end($parts) ?: 'template_1';
            
            $tenant = authenticateUser();
            $brandName = $tenant['business_name'] ?? 'Demo Merchant Store';
            
            echo json_encode([
                'status' => true,
                'data' => [
                    'order_id' => 'PV_PREVIEW_' . rand(1000, 9999),
                    'amount' => 499.00,
                    'currency' => 'INR',
                    'status' => 'PENDING',
                    'template' => $tplId,
                    'remark1' => 'Preview Session',
                    'customer_name' => 'Demo User',
                    'customer_mobile' => '9876543210',
                    'expires_at' => gmdate('Y-m-d\TH:i:s\Z', time() + 600),
                    'branding' => [
                        'brand_name' => $brandName,
                        'brand_color' => '#8b5cf6'
                    ],
                    'payment_details' => [
                        'upi_id' => 'merchant@upi',
                        'display_name' => $brandName,
                        'upi_uri' => 'upi://pay?pa=merchant@upi&pn=' . urlencode($brandName) . '&am=499&cu=INR',
                        'qr_code_base64' => '',
                        'intents' => [
                            'gpay' => 'gpay://upi/pay?pa=merchant@upi&pn=' . urlencode($brandName) . '&am=499&cu=INR',
                            'phonepe' => 'phonepe://pay?pa=merchant@upi&pn=' . urlencode($brandName) . '&am=499&cu=INR',
                            'paytm' => 'paytmmp://pay?pa=merchant@upi&pn=' . urlencode($brandName) . '&am=499&cu=INR',
                            'bhim' => 'bhim://upi/pay?pa=merchant@upi&pn=' . urlencode($brandName) . '&am=499&cu=INR',
                            'cred' => 'cred://upi/pay?pa=merchant@upi&pn=' . urlencode($brandName) . '&am=499&cu=INR'
                        ]
                    ]
                ]
            ]);
            exit;
        }

        if ($path === '/api/templates') {
            $templatesList = [
                ['id' => 'template_1', 'name' => 'UPI Quick Pay', 'description' => 'App-inspired white payment sheet with QR, UPI ID copy and launcher buttons.', 'swatch' => ['#f8fafc', '#2563eb']],
                ['id' => 'template_2', 'name' => 'Purple Wallet', 'description' => 'Compact, wallet-inspired checkout with a focused amount and direct UPI actions.', 'swatch' => ['#ffffff', '#6d28d9']],
                ['id' => 'template_3', 'name' => 'Gradient Glass', 'description' => 'Frosted, premium checkout built around your merchant brand colour.', 'swatch' => ['#6366f1', '#0f172a']],
                ['id' => 'template_4', 'name' => 'Secure Dark', 'description' => 'High-contrast dark mode with a prominent verification status.', 'swatch' => ['#080b14', '#22d3ee']],
                ['id' => 'template_5', 'name' => 'Payment Receipt', 'description' => 'Invoice-style layout designed for transparent order details.', 'swatch' => ['#f4f1ea', '#b45309']],
                ['id' => 'template_6', 'name' => 'Mobile Pay Sheet', 'description' => 'Thumb-friendly bottom sheet for mobile browser checkout.', 'swatch' => ['#2563eb', '#ffffff']],
                ['id' => 'template_7', 'name' => 'Soft Wallet', 'description' => 'Friendly rounded payment surfaces for consumer storefronts.', 'swatch' => ['#e0f2fe', '#0ea5e9']],
                ['id' => 'template_8', 'name' => 'Quick Scan', 'description' => 'Compact QR-first page for repeat UPI customers.', 'swatch' => ['#0f172a', '#ffffff']],
                ['id' => 'template_9', 'name' => 'Guided UPI', 'description' => 'Clear three-step payment walkthrough for first-time customers.', 'swatch' => ['#f8fafc', '#16a34a']],
                ['id' => 'template_10', 'name' => 'Merchant Hero', 'description' => 'Brand-led payment page with a central QR experience.', 'swatch' => ['#111827', '#a855f7']],
                ['id' => 'template_11', 'name' => 'Modern Glass', 'description' => 'Contemporary glass checkout with instant UPI app routing.', 'swatch' => ['#020617', '#6366f1']]
            ];

            echo json_encode([
                'status' => true,
                'data' => $templatesList
            ]);
            exit;
        }
    }

    // 8. DEVICES & NOTIFICATION INGESTION (Companion App & SMS Gateway)
    if (strpos($path, '/api/devices') === 0) {
        $db = getDb();

        // A. Generate Pairing Code & Token (Dashboard Pairing Modal)
        if ($path === '/api/devices/generate-pairing') {
            $tenant = authenticateUser();
            $tenantId = $tenant ? $tenant['id'] : 'tenant_pankaj_007';

            $codeNum = rand(1000, 9999);
            $pairingCode = 'PAIR-' . $codeNum;
            $deviceToken = 'dev_tok_' . bin2hex(random_bytes(16));
            $deviceId = 'dev_' . substr(bin2hex(random_bytes(6)), 0, 8);
            $now = gmdate('Y-m-d\TH:i:s\Z');

            $stmt = $db->prepare("INSERT INTO devices (id, tenant_id, device_name, device_token, pairing_code, sim_slots_json, battery_level, is_online, last_heartbeat_at, sms_captured_count, created_at) VALUES (?, ?, 'Pending Device Pairing...', ?, ?, '[]', 100, 0, ?, 0, ?)");
            $stmt->execute([$deviceId, $tenantId, $deviceToken, $pairingCode, $now, $now]);

            $serverUrl = 'https://payvia360.com';
            if (!empty($_SERVER['HTTP_HOST'])) {
                $proto = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
                $serverUrl = $proto . '://' . $_SERVER['HTTP_HOST'];
            }

            $qrPayload = json_encode([
                'serverUrl' => $serverUrl,
                'deviceToken' => $deviceToken,
                'pairingCode' => $pairingCode,
                'tenantId' => $tenantId
            ]);

            echo json_encode([
                'status' => true,
                'data' => [
                    'pairingCode' => $pairingCode,
                    'deviceToken' => $deviceToken,
                    'serverUrl' => $serverUrl,
                    'qrData' => $qrPayload
                ]
            ]);
            exit;
        }

        // B. Companion App Complete Pairing
        if ($path === '/api/devices/pair') {
            $rawInput = trim($input['pairingCode'] ?? $input['pairingId'] ?? $input['deviceToken'] ?? $input['code'] ?? '');
            $deviceName = trim($input['deviceName'] ?? $input['name'] ?? 'Android Gateway Phone');
            $batteryLevel = isset($input['batteryLevel']) ? (int)$input['batteryLevel'] : 100;
            $simSlots = isset($input['simSlots']) ? (is_string($input['simSlots']) ? $input['simSlots'] : json_encode($input['simSlots'])) : '[{"slot":1,"operator":"Primary SIM 5G"}]';
            $now = gmdate('Y-m-d\TH:i:s\Z');

            if (empty($rawInput)) {
                $rawInput = 'PAIR-' . rand(1000, 9999);
            }

            $upperInput = strtoupper($rawInput);
            $cleanNumeric = preg_replace('/[^0-9]/', '', $rawInput);

            // Match by pairing_code (e.g. PAIR-1234 or 1234), device_token, or id
            $sql = "SELECT * FROM devices WHERE pairing_code = ? OR pairing_code = ? OR device_token = ? OR id = ?";
            $params = [$upperInput, 'PAIR-' . $upperInput, $rawInput, $rawInput];
            if (!empty($cleanNumeric)) {
                $sql .= " OR pairing_code LIKE ?";
                $params[] = '%' . $cleanNumeric;
            }
            $sql .= " ORDER BY created_at DESC LIMIT 1";
            $stmt = $db->prepare($sql);
            $stmt->execute($params);
            $device = $stmt->fetch();

            if ($device) {
                $upd = $db->prepare("UPDATE devices SET device_name = ?, sim_slots_json = ?, battery_level = ?, is_online = 1, last_heartbeat_at = ? WHERE id = ?");
                $upd->execute([$deviceName, $simSlots, $batteryLevel, $now, $device['id']]);

                echo json_encode([
                    'status' => true,
                    'message' => 'Device successfully paired and activated as SMS Gateway',
                    'data' => [
                        'deviceId' => $device['id'],
                        'deviceToken' => $device['device_token'],
                        'pairingCode' => $device['pairing_code'],
                        'tenantId' => $device['tenant_id']
                    ]
                ]);
                exit;
            } else {
                // Zero-drop auto-pairing for merchant
                $newDevId = 'dev_' . substr(bin2hex(random_bytes(6)), 0, 8);
                $newToken = 'dev_tok_' . bin2hex(random_bytes(16));
                $newCode = strpos($upperInput, 'PAIR-') === 0 ? $upperInput : ('PAIR-' . ($cleanNumeric ?: rand(1000, 9999)));

                $ins = $db->prepare("INSERT INTO devices (id, tenant_id, device_name, device_token, pairing_code, sim_slots_json, battery_level, is_online, last_heartbeat_at, sms_captured_count, created_at) VALUES (?, 'tenant_pankaj_007', ?, ?, ?, ?, ?, 1, ?, 0, ?)");
                $ins->execute([$newDevId, $deviceName, $newToken, $newCode, $simSlots, $batteryLevel, $now, $now]);

                echo json_encode([
                    'status' => true,
                    'message' => 'Device successfully auto-paired and activated as SMS Gateway',
                    'data' => [
                        'deviceId' => $newDevId,
                        'deviceToken' => $newToken,
                        'pairingCode' => $newCode,
                        'tenantId' => 'tenant_pankaj_007'
                    ]
                ]);
                exit;
            }
        }

        // C. Toggle Device Status (Dashboard: Active <-> Paused)
        if (preg_match('#^/api/devices/([^/]+)/toggle$#', $path, $m) || ($path === '/api/devices/toggle' && $method === 'POST')) {
            $tenant = authenticateUser();
            if (!$tenant) {
                http_response_code(401);
                echo json_encode(['status' => false, 'error' => 'Unauthorized']);
                exit;
            }

            $devId = $m[1] ?? $input['id'] ?? $_GET['id'] ?? '';
            $stmt = $db->prepare("SELECT * FROM devices WHERE id = ? AND tenant_id = ?");
            $stmt->execute([$devId, $tenant['id']]);
            $device = $stmt->fetch();

            if (!$device) {
                http_response_code(404);
                echo json_encode(['status' => false, 'error' => 'Device not found']);
                exit;
            }

            $newStatus = (($device['status'] ?? 'ACTIVE') === 'PAUSED') ? 'ACTIVE' : 'PAUSED';
            $upd = $db->prepare("UPDATE devices SET status = ? WHERE id = ?");
            $upd->execute([$newStatus, $device['id']]);

            echo json_encode([
                'status' => true,
                'message' => "Device is now " . strtolower($newStatus),
                'deviceStatus' => $newStatus,
                'data' => array_merge($device, ['status' => $newStatus])
            ]);
            exit;
        }

        // D. Companion App Heartbeat
        if ($path === '/api/devices/heartbeat') {
            $deviceToken = $input['deviceToken'] ?? $input['deviceId'] ?? '';
            $batteryLevel = isset($input['batteryLevel']) ? (int)$input['batteryLevel'] : null;
            $now = gmdate('Y-m-d\TH:i:s\Z');

            if (!$deviceToken) {
                http_response_code(400);
                echo json_encode(['status' => false, 'error' => 'Device token required']);
                exit;
            }

            $upperCode = strtoupper($deviceToken);
            $stmt = $db->prepare("SELECT id, tenant_id, status, is_online FROM devices WHERE device_token = ? OR pairing_code = ? OR pairing_code = ? OR id = ? LIMIT 1");
            $stmt->execute([$deviceToken, $upperCode, 'PAIR-' . $upperCode, $deviceToken]);
            $device = $stmt->fetch();

            if (!$device) {
                $clean = preg_replace('/[^0-9]/', '', $deviceToken);
                if ($clean) {
                    $stmt = $db->prepare("SELECT id, tenant_id, status, is_online FROM devices WHERE pairing_code LIKE ? ORDER BY created_at DESC LIMIT 1");
                    $stmt->execute(['%' . $clean]);
                    $device = $stmt->fetch();
                }
            }

            if (!$device) {
                http_response_code(404);
                echo json_encode([
                    'status' => false,
                    'error' => 'DEVICE_DISCONNECTED',
                    'message' => 'Device has been disconnected or removed from dashboard'
                ]);
                exit;
            }

            $devStatus = $device['status'] ?? 'ACTIVE';

            if ($batteryLevel !== null) {
                $upd = $db->prepare("UPDATE devices SET is_online = 1, battery_level = ?, last_heartbeat_at = ? WHERE id = ?");
                $upd->execute([$batteryLevel, $now, $device['id']]);
            } else {
                $upd = $db->prepare("UPDATE devices SET is_online = 1, last_heartbeat_at = ? WHERE id = ?");
                $upd->execute([$now, $device['id']]);
            }

            echo json_encode([
                'status' => true,
                'deviceStatus' => $devStatus,
                'isPaused' => $devStatus === 'PAUSED',
                'message' => $devStatus === 'PAUSED' ? 'Heartbeat acknowledged (GATEWAY PAUSED)' : 'Heartbeat acknowledged'
            ]);
            exit;
        }

        // D. Delete Device (Dashboard)
        if ($method === 'DELETE' || (strpos($path, '/api/devices/') === 0 && $method === 'DELETE') || !empty($_GET['delete_id'])) {
            $tenant = authenticateUser();
            if (!$tenant) {
                http_response_code(401);
                echo json_encode(['status' => false, 'error' => 'Unauthorized']);
                exit;
            }

            $devId = $_GET['id'] ?? $_GET['delete_id'] ?? $input['id'] ?? '';
            if (!$devId && preg_match('#^/api/devices/([^/]+)$#', $path, $m)) {
                $devId = $m[1];
            }

            if ($devId) {
                $del = $db->prepare("DELETE FROM devices WHERE id = ? AND tenant_id = ?");
                $del->execute([$devId, $tenant['id']]);
            }

            echo json_encode(['status' => true, 'message' => 'Device disconnected successfully']);
            exit;
        }

        // E. Ingest Incoming SMS / Notification
        if ($path === '/api/devices/notification-ingest' || $path === '/api/devices/sms-ingest') {
            $deviceToken = $input['deviceToken'] ?? $input['device_token'] ?? $input['deviceId'] ?? '';
            if (!$deviceToken) {
                http_response_code(401);
                echo json_encode(['status' => false, 'error' => 'A paired device token is required for payment receipt ingestion']);
                exit;
            }

            // A receipt source must be a previously paired device. Never auto
            // register an arbitrary caller, since it could falsely settle a
            // subscription order.
            $chkDev = $db->prepare("SELECT * FROM devices WHERE device_token = ? OR id = ? LIMIT 1");
            $chkDev->execute([$deviceToken, $deviceToken]);
            $dRow = $chkDev->fetch();
            if (!$dRow) {
                http_response_code(401);
                echo json_encode(['status' => false, 'error' => 'Unrecognized payment-receipt device']);
                exit;
            }
            if ($dRow && ($dRow['status'] ?? 'ACTIVE') === 'PAUSED') {
                echo json_encode([
                    'status' => false,
                    'error' => 'DEVICE_PAUSED',
                    'message' => 'SMS/Notification ingestion is suspended while gateway device is paused'
                ]);
                exit;
            }

            $appName = $input['appName'] ?? $input['packageName'] ?? $input['package_name'] ?? $input['sender'] ?? 'UNKNOWN';
            $title = $input['title'] ?? '';
            $text = $input['text'] ?? $input['body'] ?? $input['message'] ?? '';
            $fullText = "$title $text";

            // Extract Amount: e.g. "Rs 500", "INR 499.00", "₹1,200"
            $amount = null;
            if (preg_match('/(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{1,2})?)/i', $fullText, $m)) {
                $amount = (float)str_replace(',', '', $m[1]);
            }

            // Extract 12-digit UTR / Ref Number:
            $utr = null;
            if (preg_match('/(?:UTR|UPI Ref|Ref no|Txn ID|Reference|Ref)\s*(?:is|:|-)?\s*([0-9]{10,18})/i', $fullText, $m)) {
                $utr = $m[1];
            } elseif (preg_match('/\b([0-9]{12})\b/', $fullText, $m)) {
                $utr = $m[1];
            }

            $matchedOrderId = null;
            if ($amount && $amount > 0) {
                // A device can only verify payments received by its own
                // tenant. Submitted UTR gets priority over amount-only match.
                if ($utr) {
                    $stmt = $db->prepare("SELECT * FROM orders WHERE tenant_id = ? AND utr = ? AND status IN ('PENDING', 'UTR_SUBMITTED') LIMIT 1");
                    $stmt->execute([$dRow['tenant_id'], $utr]);
                    $matchedOrder = $stmt->fetch();
                } else {
                    $matchedOrder = false;
                }
                if (!$matchedOrder) {
                    $stmt = $db->prepare("SELECT * FROM orders WHERE tenant_id = ? AND status IN ('PENDING', 'UTR_SUBMITTED') AND (amount = ? OR ABS(amount - ?) < 0.01) ORDER BY created_at DESC LIMIT 1");
                    $stmt->execute([$dRow['tenant_id'], $amount, $amount]);
                    $matchedOrder = $stmt->fetch();
                }

                if ($matchedOrder) {
                    $matchedOrderId = $matchedOrder['order_id'];
                    $now = gmdate('Y-m-d\TH:i:s\Z');
                    $upd = $db->prepare("UPDATE orders SET status = 'TXN_SUCCESS', utr = ?, paid_at = ?, updated_at = ? WHERE id = ?");
                    $upd->execute([$utr ?: 'AUTO_' . substr(bin2hex(random_bytes(4)), 0, 8), $now, $now, $matchedOrder['id']]);
                    $matchedOrder['status'] = 'TXN_SUCCESS';
                    PlanService::activatePurchasedPlanIfSettled($db, $matchedOrder);
                }
            }

            // Record real-time status only for the authenticated paired device.
            $batteryLevel = isset($input['batteryLevel']) ? (int)$input['batteryLevel'] : null;
            if ($batteryLevel !== null) {
                $upd = $db->prepare("UPDATE devices SET is_online = 1, battery_level = ?, last_heartbeat_at = ?, sms_captured_count = sms_captured_count + 1 WHERE id = ?");
                $upd->execute([$batteryLevel, gmdate('Y-m-d\TH:i:s\Z'), $dRow['id']]);
            } else {
                $upd = $db->prepare("UPDATE devices SET is_online = 1, last_heartbeat_at = ?, sms_captured_count = sms_captured_count + 1 WHERE id = ?");
                $upd->execute([gmdate('Y-m-d\TH:i:s\Z'), $dRow['id']]);
            }

            echo json_encode([
                'status' => true,
                'matched' => (bool)$matchedOrderId,
                'orderId' => $matchedOrderId,
                'parsedAmount' => $amount,
                'parsedUtr' => $utr
            ]);
            exit;
        }

        // F. Companion App: Settle Order
        if (preg_match('#^/api/devices/orders/([^/]+)/settle$#', $path, $matches)) {
            $orderIdParam = $matches[1];
            $deviceToken = trim($input['deviceToken'] ?? $_GET['deviceToken'] ?? $_SERVER['HTTP_X_DEVICE_TOKEN'] ?? '');
            $utr = trim($input['utr'] ?? '');

            if (!$deviceToken) {
                http_response_code(400);
                echo json_encode(['status' => false, 'error' => 'deviceToken is required']);
                exit;
            }

            $upperCode = strtoupper($deviceToken);
            $stmt = $db->prepare("SELECT * FROM devices WHERE device_token = ? OR pairing_code = ? OR pairing_code = ? OR id = ? LIMIT 1");
            $stmt->execute([$deviceToken, $upperCode, 'PAIR-' . $upperCode, $deviceToken]);
            $device = $stmt->fetch();

            if (!$device) {
                $clean = preg_replace('/[^0-9]/', '', $deviceToken);
                if ($clean) {
                    $stmt = $db->prepare("SELECT * FROM devices WHERE pairing_code LIKE ? ORDER BY created_at DESC LIMIT 1");
                    $stmt->execute(['%' . $clean]);
                    $device = $stmt->fetch();
                }
            }

            if (!$device) {
                http_response_code(404);
                echo json_encode(['status' => false, 'error' => 'Device not recognized or not paired']);
                exit;
            }

            if (($device['status'] ?? 'ACTIVE') === 'PAUSED') {
                http_response_code(403);
                echo json_encode([
                    'status' => false,
                    'error' => 'DEVICE_PAUSED',
                    'message' => 'Cannot settle or verify orders while gateway device is paused from dashboard'
                ]);
                exit;
            }

            $stmt = $db->prepare("SELECT * FROM orders WHERE (id = ? OR order_id = ?) AND tenant_id = ? LIMIT 1");
            $stmt->execute([$orderIdParam, $orderIdParam, $device['tenant_id']]);
            $order = $stmt->fetch();

            if (!$order) {
                http_response_code(404);
                echo json_encode(['status' => false, 'error' => 'Order not found for this merchant']);
                exit;
            }

            if (strpos($order['remark1'] ?? '', 'PLAN_PURCHASE:') === 0) {
                http_response_code(403);
                echo json_encode(['status' => false, 'error' => 'Subscription orders cannot be manually settled. A captured payment receipt is required.']);
                exit;
            }

            if (($order['mode'] ?? 'LIVE') === 'LIVE' && !PlanService::isPlanActive($device['tenant_id'], $db)) {
                PlanService::logAccess($device['tenant_id'], 'DEVICE_SETTLEMENT_BLOCKED', $path, 'BLOCKED', 'Active plan required for live settlement', $db);
                http_response_code(403);
                echo json_encode([
                    'status' => false,
                    'error' => 'PLAN_REQUIRED',
                    'reason' => 'ACTIVE_PLAN_REQUIRED',
                    'message' => 'Settling live payment orders requires an active subscription plan on the merchant dashboard'
                ]);
                exit;
            }

            $now = gmdate('Y-m-d\TH:i:s\Z');
            $settleUtr = $utr ?: ('MANUAL_' . time());
            $upd = $db->prepare("UPDATE orders SET status = 'TXN_SUCCESS', utr = ?, paid_at = ?, updated_at = ? WHERE id = ?");
            $upd->execute([$settleUtr, $now, $now, $order['id']]);
            $order['status'] = 'TXN_SUCCESS';
            PlanService::activatePurchasedPlanIfSettled($db, $order);

            echo json_encode([
                'status' => true,
                'message' => 'Order successfully settled and verified',
                'order' => [
                    'id' => $order['id'],
                    'orderId' => $order['order_id'],
                    'status' => 'TXN_SUCCESS',
                    'utr' => $settleUtr,
                    'paidAt' => $now
                ]
            ]);
            exit;
        }

        // G. Companion App: Cancel Order
        if (preg_match('#^/api/devices/orders/([^/]+)/cancel$#', $path, $matches)) {
            $orderIdParam = $matches[1];
            $deviceToken = trim($input['deviceToken'] ?? $_GET['deviceToken'] ?? $_SERVER['HTTP_X_DEVICE_TOKEN'] ?? '');

            if (!$deviceToken) {
                http_response_code(400);
                echo json_encode(['status' => false, 'error' => 'deviceToken is required']);
                exit;
            }

            $upperCode = strtoupper($deviceToken);
            $stmt = $db->prepare("SELECT * FROM devices WHERE device_token = ? OR pairing_code = ? OR pairing_code = ? OR id = ? LIMIT 1");
            $stmt->execute([$deviceToken, $upperCode, 'PAIR-' . $upperCode, $deviceToken]);
            $device = $stmt->fetch();

            if (!$device) {
                $clean = preg_replace('/[^0-9]/', '', $deviceToken);
                if ($clean) {
                    $stmt = $db->prepare("SELECT * FROM devices WHERE pairing_code LIKE ? ORDER BY created_at DESC LIMIT 1");
                    $stmt->execute(['%' . $clean]);
                    $device = $stmt->fetch();
                }
            }

            if (!$device) {
                http_response_code(404);
                echo json_encode(['status' => false, 'error' => 'Device not recognized or not paired']);
                exit;
            }

            if (($device['status'] ?? 'ACTIVE') === 'PAUSED') {
                http_response_code(403);
                echo json_encode([
                    'status' => false,
                    'error' => 'DEVICE_PAUSED',
                    'message' => 'Cannot cancel orders while gateway device is paused from dashboard'
                ]);
                exit;
            }

            $stmt = $db->prepare("SELECT * FROM orders WHERE (id = ? OR order_id = ?) AND tenant_id = ? LIMIT 1");
            $stmt->execute([$orderIdParam, $orderIdParam, $device['tenant_id']]);
            $order = $stmt->fetch();

            if (!$order) {
                http_response_code(404);
                echo json_encode(['status' => false, 'error' => 'Order not found for this merchant']);
                exit;
            }

            $now = gmdate('Y-m-d\TH:i:s\Z');
            $upd = $db->prepare("UPDATE orders SET status = 'CANCELLED', updated_at = ? WHERE id = ?");
            $upd->execute([$now, $order['id']]);

            echo json_encode([
                'status' => true,
                'message' => 'Order cancelled successfully',
                'order' => [
                    'id' => $order['id'],
                    'orderId' => $order['order_id'],
                    'status' => 'CANCELLED'
                ]
            ]);
            exit;
        }

        // H. Companion App: Fetch Orders for Connected Tenant (with tabs & pagination)
        if ($path === '/api/devices/orders') {
            $deviceToken = trim($_GET['deviceToken'] ?? $input['deviceToken'] ?? $_SERVER['HTTP_X_DEVICE_TOKEN'] ?? '');
            if (!$deviceToken) {
                http_response_code(400);
                echo json_encode(['status' => false, 'error' => 'deviceToken is required']);
                exit;
            }

            $upperCode = strtoupper($deviceToken);
            $stmt = $db->prepare("SELECT * FROM devices WHERE device_token = ? OR pairing_code = ? OR pairing_code = ? OR id = ? LIMIT 1");
            $stmt->execute([$deviceToken, $upperCode, 'PAIR-' . $upperCode, $deviceToken]);
            $device = $stmt->fetch();

            if (!$device) {
                $clean = preg_replace('/[^0-9]/', '', $deviceToken);
                if ($clean) {
                    $stmt = $db->prepare("SELECT * FROM devices WHERE pairing_code LIKE ? ORDER BY created_at DESC LIMIT 1");
                    $stmt->execute(['%' . $clean]);
                    $device = $stmt->fetch();
                }
            }

            if (!$device) {
                http_response_code(404);
                echo json_encode([
                    'status' => false,
                    'error' => 'DEVICE_DISCONNECTED',
                    'message' => 'Device has been disconnected or removed from dashboard'
                ]);
                exit;
            }

            $tenantId = $device['tenant_id'];
            $status = strtoupper(trim($_GET['status'] ?? 'ALL'));
            $limit = max(1, min(100, (int)($_GET['limit'] ?? 20)));
            $offset = max(0, (int)($_GET['offset'] ?? 0));

            // Counts across all status tabs
            $stmt = $db->prepare("SELECT 
                COUNT(*) as count_all,
                SUM(CASE WHEN status = 'TXN_SUCCESS' THEN 1 ELSE 0 END) as count_verified,
                SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) as count_pending,
                SUM(CASE WHEN status IN ('FAILED', 'CANCELLED', 'EXPIRED') THEN 1 ELSE 0 END) as count_rejected
                FROM orders WHERE tenant_id = ?");
            $stmt->execute([$tenantId]);
            $countsRow = $stmt->fetch();

            $counts = [
                'all' => (int)($countsRow['count_all'] ?? 0),
                'verified' => (int)($countsRow['count_verified'] ?? 0),
                'pending' => (int)($countsRow['count_pending'] ?? 0),
                'rejected' => (int)($countsRow['count_rejected'] ?? 0),
            ];

            $whereClause = "tenant_id = ?";
            $params = [$tenantId];

            if ($status !== 'ALL') {
                if ($status === 'VERIFIED' || $status === 'TXN_SUCCESS') {
                    $whereClause .= " AND status = 'TXN_SUCCESS'";
                } elseif ($status === 'PENDING') {
                    $whereClause .= " AND status = 'PENDING'";
                } elseif ($status === 'REJECTED' || $status === 'CANCELLED' || $status === 'FAILED') {
                    $whereClause .= " AND status IN ('CANCELLED', 'FAILED', 'EXPIRED')";
                }
            }

            // Total count for current filter
            $countStmt = $db->prepare("SELECT COUNT(*) FROM orders WHERE $whereClause");
            $countStmt->execute($params);
            $totalFiltered = (int)$countStmt->fetchColumn();

            // Fetch orders sorted newest on top
            $sql = "SELECT * FROM orders WHERE $whereClause ORDER BY created_at DESC LIMIT $limit OFFSET $offset";
            $orderStmt = $db->prepare($sql);
            $orderStmt->execute($params);
            $rawOrders = $orderStmt->fetchAll();

            $formatted = [];
            foreach ($rawOrders as $o) {
                $formatted[] = [
                    'id' => $o['id'],
                    'orderId' => $o['order_id'],
                    'amount' => (float)$o['amount'],
                    'currency' => $o['currency'] ?? 'INR',
                    'status' => $o['status'],
                    'customerName' => $o['customer_name'] ?? null,
                    'customerMobile' => $o['customer_mobile'] ?? null,
                    'utr' => $o['utr'] ?? null,
                    'provider' => $o['provider'] ?? null,
                    'remark1' => $o['remark1'] ?? null,
                    'paymentUrl' => $o['payment_url'] ?? null,
                    'createdAt' => $o['created_at'],
                    'paidAt' => $o['paid_at'] ?? null,
                ];
            }

            $devStatus = $device['status'] ?? 'ACTIVE';
            echo json_encode([
                'status' => true,
                'deviceStatus' => $devStatus,
                'isPaused' => $devStatus === 'PAUSED',
                'total' => $totalFiltered,
                'counts' => $counts,
                'orders' => $formatted,
                'data' => $formatted,
                'pagination' => [
                    'total' => $totalFiltered,
                    'limit' => $limit,
                    'offset' => $offset,
                    'hasMore' => ($offset + $limit) < $totalFiltered
                ]
            ]);
            exit;
        }

        // I. List devices for tenant
        $tenant = authenticateUser();
        if (!$tenant) {
            http_response_code(401);
            echo json_encode(['status' => false, 'error' => 'Unauthorized']);
            exit;
        }

        $stmt = $db->prepare("SELECT * FROM devices WHERE tenant_id = ? ORDER BY created_at DESC");
        $stmt->execute([$tenant['id']]);
        $rawDevices = $stmt->fetchAll();

        $formatted = [];
        foreach ($rawDevices as $d) {
            $formatted[] = [
                'id' => $d['id'],
                'tenantId' => $d['tenant_id'],
                'deviceName' => $d['device_name'],
                'deviceToken' => $d['device_token'],
                'pairingCode' => $d['pairing_code'],
                'simSlots' => json_decode($d['sim_slots_json'] ?: '[]', true) ?: [],
                'batteryLevel' => (int)($d['battery_level'] ?? 100),
                'isOnline' => (bool)$d['is_online'],
                'status' => $d['status'] ?? 'ACTIVE',
                'lastHeartbeatAt' => $d['last_heartbeat_at'] ?: $d['created_at'],
                'smsCapturedCount' => (int)($d['sms_captured_count'] ?? 0),
                'createdAt' => $d['created_at'],
                // Snake case compatibility
                'device_name' => $d['device_name'],
                'device_token' => $d['device_token'],
                'pairing_code' => $d['pairing_code'],
                'battery_level' => (int)($d['battery_level'] ?? 100),
                'is_online' => (bool)$d['is_online'],
                'last_heartbeat_at' => $d['last_heartbeat_at'] ?: $d['created_at'],
                'sms_captured_count' => (int)($d['sms_captured_count'] ?? 0),
            ];
        }

        echo json_encode(['status' => true, 'data' => $formatted]);
        exit;
    }

    // 9. API KEYS
    if (strpos($path, '/api/keys') === 0) {
        $tenant = authenticateUser();
        if (!$tenant) {
            http_response_code(401);
            echo json_encode(['status' => false, 'error' => 'Unauthorized']);
            exit;
        }
        $db = getDb();

        if ($method === 'GET') {
            $stmt = $db->prepare("SELECT id, tenant_id, name, key_prefix, raw_key, is_active, created_at, last_used_at FROM api_keys WHERE tenant_id = ? ORDER BY created_at DESC");
            $stmt->execute([$tenant['id']]);
            $keys = $stmt->fetchAll();
            
            $formatted = [];
            foreach ($keys as $k) {
                $rawKey = !empty($k['raw_key']) ? $k['raw_key'] : ('pv_live_' . bin2hex(random_bytes(16)));
                if (empty($k['raw_key'])) {
                    // Backfill raw_key if was missing
                    try {
                        $upd = $db->prepare("UPDATE api_keys SET raw_key = ? WHERE id = ?");
                        $upd->execute([$rawKey, $k['id']]);
                    } catch (Exception $e) {}
                }
                $prefix = !empty($k['key_prefix']) ? $k['key_prefix'] : substr($rawKey, 0, 12);

                $formatted[] = [
                    'id' => $k['id'],
                    'tenantId' => $k['tenant_id'],
                    'tenant_id' => $k['tenant_id'],
                    'name' => $k['name'] ?: 'Live Secret Key',
                    'keyPrefix' => $prefix,
                    'key_prefix' => $prefix,
                    'rawKey' => $rawKey,
                    'raw_key' => $rawKey,
                    'scope' => 'ALL',
                    'isActive' => (bool)$k['is_active'],
                    'is_active' => (bool)$k['is_active'],
                    'createdAt' => $k['created_at'],
                    'created_at' => $k['created_at'],
                    'lastUsedAt' => $k['last_used_at'],
                    'last_used_at' => $k['last_used_at']
                ];
            }
            echo json_encode(['status' => true, 'data' => $formatted]);
            exit;
        }

        if ($method === 'POST') {
            // Check if rotation request /api/keys/{id}/rotate
            if (preg_match('#^/api/keys/([^/]+)/rotate$#', $path, $m)) {
                $keyId = $m[1];
                $newRawKey = 'pv_live_' . bin2hex(random_bytes(16));
                $newPrefix = substr($newRawKey, 0, 12);
                $now = gmdate('Y-m-d\TH:i:s\Z');

                $stmt = $db->prepare("UPDATE api_keys SET raw_key = ?, key_prefix = ?, created_at = ? WHERE id = ? AND tenant_id = ?");
                $stmt->execute([$newRawKey, $newPrefix, $now, $keyId, $tenant['id']]);

                echo json_encode([
                    'status' => true,
                    'message' => 'API Key rotated successfully',
                    'rawKey' => $newRawKey,
                    'data' => [
                        'id' => $keyId,
                        'rawKey' => $newRawKey,
                        'keyPrefix' => $newPrefix
                    ]
                ]);
                exit;
            }

            $keyId = 'key_' . substr(bin2hex(random_bytes(6)), 0, 8);
            $rawApiKey = 'pv_live_' . bin2hex(random_bytes(16));
            $keyPrefix = substr($rawApiKey, 0, 12);
            $name = $input['name'] ?? 'Production Key';
            $now = gmdate('Y-m-d\TH:i:s\Z');

            $stmt = $db->prepare("INSERT INTO api_keys (id, tenant_id, name, key_prefix, raw_key, is_active, created_at) VALUES (?, ?, ?, ?, ?, 1, ?)");
            $stmt->execute([$keyId, $tenant['id'], $name, $keyPrefix, $rawApiKey, $now]);

            echo json_encode([
                'status' => true,
                'message' => 'API Key generated',
                'rawKey' => $rawApiKey,
                'data' => [
                    'id' => $keyId,
                    'name' => $name,
                    'rawKey' => $rawApiKey,
                    'keyPrefix' => $keyPrefix,
                    'createdAt' => $now
                ]
            ]);
            exit;
        }

        if ($method === 'DELETE') {
            $parts = explode('/', $path);
            $keyId = end($parts);
            $stmt = $db->prepare("DELETE FROM api_keys WHERE id = ? AND tenant_id = ?");
            $stmt->execute([$keyId, $tenant['id']]);
            echo json_encode(['status' => true, 'message' => 'API Key revoked']);
            exit;
        }
    }

    // 10. PLANS & SUBSCRIPTIONS
    if (strpos($path, '/api/plans') === 0) {
        $db = getDb();

        // 10.1 Get Current Active Subscription & Usage Quota
        if ($path === '/api/plans/current' && $method === 'GET') {
            $tenant = authenticateUser();
            if (!$tenant) {
                http_response_code(401);
                echo json_encode(['status' => false, 'error' => 'Unauthorized']);
                exit;
            }

            $stmt = $db->prepare("SELECT * FROM plans WHERE id = ?");
            $stmt->execute([$tenant['plan_id']]);
            $plan = $stmt->fetch();
            if ($plan) {
                $plan['features'] = json_decode($plan['features_json'] ?? '[]', true);
                $plan['price'] = (float)$plan['price'];
                $plan['maxMerchantAccounts'] = (int)$plan['max_merchant_accounts'];
                $plan['maxOrdersPerDay'] = (int)$plan['max_orders_per_day'];
                $plan['maxApiKeys'] = (int)$plan['max_api_keys'];
                $plan['validityDays'] = (int)$plan['validity_days'];
            }

            $stmt = $db->prepare("SELECT * FROM subscriptions WHERE tenant_id = ? ORDER BY starts_at DESC LIMIT 1");
            $stmt->execute([$tenant['id']]);
            $subscription = $stmt->fetch();

            // Calculate live usage
            $stmt = $db->prepare("SELECT COUNT(*) FROM merchants WHERE tenant_id = ? AND status = 'ACTIVE'");
            $stmt->execute([$tenant['id']]);
            $merchantsUsed = (int)$stmt->fetchColumn();

            $stmt = $db->prepare("SELECT COUNT(*) FROM api_keys WHERE tenant_id = ? AND is_active = 1");
            $stmt->execute([$tenant['id']]);
            $apiKeysUsed = (int)$stmt->fetchColumn();

            $todayPrefix = date('Y-m-d') . '%';
            $stmt = $db->prepare("SELECT COUNT(*) FROM orders WHERE tenant_id = ? AND created_at LIKE ?");
            $stmt->execute([$tenant['id'], $todayPrefix]);
            $ordersToday = (int)$stmt->fetchColumn();

            if ($subscription) {
                $subscription['ordersToday'] = $ordersToday;
                $subscription['orders_today'] = $ordersToday;
                $subscription['startsAt'] = $subscription['starts_at'];
                $subscription['expiresAt'] = $subscription['expires_at'];
                $subscription['tenantId'] = $subscription['tenant_id'];
                $subscription['planId'] = $subscription['plan_id'];
                $subscription['lastResetDate'] = $subscription['last_reset_date'];
            }

            $ordersMax = $plan ? (int)$plan['max_orders_per_day'] : ($tenant['role'] === 'SUPER_ADMIN' ? 50000 : 2000);

            echo json_encode([
                'status' => true,
                'data' => [
                    'plan' => $plan,
                    'subscription' => $subscription,
                    'entitlements' => PlanService::getEntitlements($tenant['id'], $db),
                    'testUsage' => PlanService::getTestUsage($tenant['id'], $db),
                    'usage' => [
                        'merchantsUsed' => $merchantsUsed,
                        'merchantsMax' => $plan ? (int)$plan['max_merchant_accounts'] : 2,
                        'apiKeysUsed' => $apiKeysUsed,
                        'apiKeysMax' => $plan ? (int)$plan['max_api_keys'] : 2,
                        'ordersToday' => $ordersToday,
                        'ordersMax' => $ordersMax
                    ]
                ]
            ]);
            exit;
        }

        // 10.2 Initiate Plan Purchase (Pay-First via Super Admin Merchant)
        if ($path === '/api/plans/purchase' && $method === 'POST') {
            $tenant = authenticateUser();
            if (!$tenant) {
                http_response_code(401);
                echo json_encode(['status' => false, 'error' => 'Unauthorized']);
                exit;
            }

            $planId = $input['planId'] ?? $input['plan_id'] ?? '';
            $stmt = $db->prepare("SELECT * FROM plans WHERE id = ? AND is_active = 1");
            $stmt->execute([$planId]);
            $targetPlan = $stmt->fetch();

            if (!$targetPlan) {
                http_response_code(404);
                echo json_encode(['status' => false, 'error' => 'Selected subscription plan not found']);
                exit;
            }

            try {
                $orderInfo = PlanService::createSubscriptionOrder($db, $tenant, $targetPlan);
                echo json_encode([
                    'status' => true,
                    'message' => 'Subscription payment order created. Please complete payment to Super Admin account.',
                    'data' => $orderInfo
                ]);
            } catch (Exception $e) {
                http_response_code(500);
                echo json_encode(['status' => false, 'error' => $e->getMessage()]);
            }
            exit;
        }

        // 10.3 Check Plan Purchase & Activation Status
        if (($path === '/api/plans/purchase-status' || $path === '/api/plans/status') && $method === 'GET') {
            $tenant = authenticateUser();
            if (!$tenant) {
                http_response_code(401);
                echo json_encode(['status' => false, 'error' => 'Unauthorized']);
                exit;
            }

            $orderId = $_GET['orderId'] ?? $_GET['order_id'] ?? $_GET['id'] ?? '';
            $linkToken = $_GET['token'] ?? $_GET['linkToken'] ?? '';

            if (!$orderId && !$linkToken) {
                http_response_code(400);
                echo json_encode(['status' => false, 'error' => 'orderId or token is required']);
                exit;
            }

            $stmt = $db->prepare("SELECT * FROM orders WHERE order_id = ? OR id = ? OR link_token = ? LIMIT 1");
            $stmt->execute([$orderId, $orderId, $linkToken]);
            $order = $stmt->fetch();

            if (!$order) {
                http_response_code(404);
                echo json_encode(['status' => false, 'error' => 'Subscription order not found']);
                exit;
            }

            $parts = explode(':', $order['remark1'] ?? '');
            if (($parts[0] ?? '') !== 'PLAN_PURCHASE' || ($parts[2] ?? '') !== $tenant['id']) {
                http_response_code(403);
                echo json_encode(['status' => false, 'error' => 'This subscription order does not belong to your account']);
                exit;
            }

            $isSettled = ($order['status'] === 'TXN_SUCCESS');
            if ($isSettled) {
                PlanService::activatePurchasedPlanIfSettled($db, $order);
            }

            $isActive = PlanService::isPlanActive($tenant['id'], $db);
            $sub = PlanService::getSubscription($tenant['id'], $db);

            echo json_encode([
                'status' => true,
                'data' => [
                    'orderId' => $order['order_id'],
                    'orderStatus' => $order['status'],
                    'isSettled' => $isSettled,
                    'isPlanActive' => $isActive,
                    'subscription' => $sub,
                    'utr' => $order['utr'] ?? null,
                    'paidAt' => $order['paid_at'] ?? null
                ]
            ]);
            exit;
        }

        // 10.4 Direct upgrades are permanently disabled. All plans, including
        // Super Admin plans, must go through /purchase and a verified receipt.
        if ($path === '/api/plans/upgrade' && $method === 'POST') {
            http_response_code(402);
            echo json_encode(['status' => false, 'error' => 'PAYMENT_REQUIRED', 'message' => 'Direct upgrades are disabled. Create a payment order and wait for receipt verification.']);
            exit;
        }

        // 10.3 List all plans (Public / Authenticated)
        $stmt = $db->query("SELECT * FROM plans WHERE is_active = 1 ORDER BY price ASC");
        $plans = $stmt->fetchAll();
        foreach ($plans as &$p) {
            $p['features'] = json_decode($p['features_json'] ?? '[]', true);
            $p['price'] = (float)$p['price'];
            $p['maxMerchantAccounts'] = (int)$p['max_merchant_accounts'];
            $p['maxOrdersPerDay'] = (int)$p['max_orders_per_day'];
            $p['maxApiKeys'] = (int)$p['max_api_keys'];
            $p['validityDays'] = (int)$p['validity_days'];
        }
        echo json_encode(['status' => true, 'data' => $plans]);
        exit;
    }

    // -------------------------------------------------------------
    // 11. CONTACT FORM & INQUIRIES (Public Ingestion)
    // -------------------------------------------------------------
    if ($path === '/api/contact' || $path === '/api/contact/' || $path === '/api/public/v1/contact') {
        $db = getDb();
        if ($method === 'POST') {
            $name = trim($input['name'] ?? '');
            $email = trim($input['email'] ?? '');
            $subject = trim($input['subject'] ?? 'general');
            $orderId = trim($input['orderId'] ?? $input['order_id'] ?? '');
            $message = trim($input['message'] ?? '');

            if (!$name || !$email || !$message) {
                http_response_code(400);
                echo json_encode(['status' => false, 'error' => 'Please provide your name, email address, and message.']);
                exit;
            }

            if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                http_response_code(400);
                echo json_encode(['status' => false, 'error' => 'Please provide a valid email address.']);
                exit;
            }

            $msgId = 'msg_' . substr(bin2hex(random_bytes(6)), 0, 10);
            $ip = $_SERVER['HTTP_CF_CONNECTING_IP'] ?? $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
            $userAgent = substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 255);
            $now = gmdate('Y-m-d\TH:i:s\Z');

            $stmt = $db->prepare("INSERT INTO contact_messages (id, name, email, subject, order_id, message, ip_address, user_agent, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?)");
            $stmt->execute([
                $msgId,
                $name,
                $email,
                $subject,
                $orderId ?: null,
                $message,
                $ip,
                $userAgent,
                $now,
                $now
            ]);

            echo json_encode([
                'status' => true,
                'message' => 'Thank you! Your inquiry has been safely saved in our database. Our developer support team will contact you shortly.',
                'data' => [
                    'id' => $msgId,
                    'name' => $name,
                    'email' => $email,
                    'subject' => $subject,
                    'createdAt' => $now
                ]
            ]);
            exit;
        }
    }

    // -------------------------------------------------------------
    // 12. SUPER ADMIN CONTROLS & COMPREHENSIVE MULTI-ACCOUNT MANAGEMENT
    // -------------------------------------------------------------
    if (strpos($path, '/api/admin') === 0) {
        $db = getDb();
        $tenant = authenticateUser();
        if (!$tenant || $tenant['role'] !== 'SUPER_ADMIN') {
            http_response_code(403);
            echo json_encode(['status' => false, 'error' => 'Access Denied: Super Admin privileges required.']);
            exit;
        }

        // Dedicated, platform-owned UPI receiver for subscription QR codes.
        if ($path === '/api/admin/billing-account' && $method === 'GET') {
            $stmt = $db->prepare("SELECT * FROM merchants WHERE tenant_id = ? AND status = 'ACTIVE' ORDER BY created_at ASC");
            $stmt->execute([$tenant['id']]);
            $accounts = $stmt->fetchAll();
            $account = null;
            foreach ($accounts as $candidate) {
                $credentials = json_decode($candidate['credentials_json'] ?? '{}', true) ?: [];
                if (!empty($credentials['isPlatformBilling'])) { $account = $candidate; break; }
            }
            if (!$account && !empty($accounts)) $account = $accounts[0];
            echo json_encode(['status' => true, 'data' => $account ?: null]);
            exit;
        }

        if ($path === '/api/admin/billing-account' && ($method === 'PUT' || $method === 'PATCH')) {
            $upiId = strtolower(trim($input['upiId'] ?? $input['upi_id'] ?? ''));
            $displayName = trim($input['displayName'] ?? $input['display_name'] ?? 'PayVia Platform');
            if (!preg_match('/^[a-z0-9._-]{2,256}@[a-z0-9._-]{2,256}$/i', $upiId)) {
                http_response_code(400);
                echo json_encode(['status' => false, 'error' => 'Enter a valid UPI ID, for example business@bank']);
                exit;
            }
            $stmt = $db->prepare("SELECT * FROM merchants WHERE tenant_id = ? ORDER BY created_at ASC");
            $stmt->execute([$tenant['id']]);
            $accounts = $stmt->fetchAll();
            $account = null;
            foreach ($accounts as $candidate) {
                $credentials = json_decode($candidate['credentials_json'] ?? '{}', true) ?: [];
                $wasPlatformBilling = !empty($credentials['isPlatformBilling']);
                $credentials['isPlatformBilling'] = false;
                $clear = $db->prepare("UPDATE merchants SET credentials_json = ? WHERE id = ?");
                $clear->execute([json_encode($credentials), $candidate['id']]);
                if (!$account && $wasPlatformBilling) $account = $candidate;
            }
            $now = gmdate('Y-m-d\TH:i:s\Z');
            if ($account) {
                $credentials = json_decode($account['credentials_json'] ?? '{}', true) ?: [];
                $credentials['isPlatformBilling'] = true;
                $stmt = $db->prepare("UPDATE merchants SET upi_id = ?, display_name = ?, label = 'Platform subscription collection', status = 'ACTIVE', intent_enabled = 1, credentials_json = ?, updated_at = ? WHERE id = ?");
                $stmt->execute([$upiId, $displayName, json_encode($credentials), $now, $account['id']]);
                $account['upi_id'] = $upiId; $account['upiId'] = $upiId; $account['display_name'] = $displayName; $account['displayName'] = $displayName;
            } else {
                $id = 'm_platform_' . substr(bin2hex(random_bytes(6)), 0, 8);
                $credentials = json_encode(['isPlatformBilling' => true]);
                $stmt = $db->prepare("INSERT INTO merchants (id, tenant_id, provider, label, upi_id, display_name, weight, status, intent_enabled, gmail_connected, credentials_json, sms_count, created_at, updated_at) VALUES (?, ?, 'CUSTOM_UPI', 'Platform subscription collection', ?, ?, 1, 'ACTIVE', 1, 0, ?, 0, ?, ?)");
                $stmt->execute([$id, $tenant['id'], $upiId, $displayName, $credentials, $now, $now]);
                $account = ['id' => $id, 'upi_id' => $upiId, 'upiId' => $upiId, 'display_name' => $displayName, 'displayName' => $displayName, 'status' => 'ACTIVE'];
            }
            echo json_encode(['status' => true, 'message' => 'Platform subscription receiving account saved', 'data' => $account]);
            exit;
        }

        // 12.1 Admin Stats Overview
        if ($path === '/api/admin/stats' && $method === 'GET') {
            $stmt = $db->query("SELECT COALESCE(SUM(amount), 0) as total_vol, COUNT(*) as total_orders FROM orders WHERE status = 'TXN_SUCCESS'");
            $successStats = $stmt->fetch();

            $todayPrefix = date('Y-m-d') . '%';
            $stmt = $db->prepare("SELECT COALESCE(SUM(amount), 0) as today_vol FROM orders WHERE status = 'TXN_SUCCESS' AND created_at LIKE ?");
            $stmt->execute([$todayPrefix]);
            $todayVol = (float)$stmt->fetchColumn();

            $stmt = $db->query("SELECT COUNT(*) FROM orders");
            $totalOrders = (int)$stmt->fetchColumn();

            $stmt = $db->query("SELECT COUNT(*) FROM tenants");
            $totalTenants = (int)$stmt->fetchColumn();

            $stmt = $db->query("SELECT COUNT(*) FROM tenants WHERE is_active = 1");
            $activeTenants = (int)$stmt->fetchColumn();

            $stmt = $db->query("SELECT COUNT(*) FROM merchants");
            $totalMerchants = (int)$stmt->fetchColumn();

            $stmt = $db->query("SELECT COUNT(*) FROM merchants WHERE status = 'ACTIVE'");
            $activeMerchants = (int)$stmt->fetchColumn();

            $stmt = $db->query("SELECT COUNT(*) FROM devices");
            $totalDevices = (int)$stmt->fetchColumn();

            $stmt = $db->query("SELECT COUNT(*) FROM devices WHERE is_online = 1");
            $onlineDevices = (int)$stmt->fetchColumn();

            $stmt = $db->query("SELECT COUNT(*) FROM contact_messages");
            $totalInquiries = (int)$stmt->fetchColumn();

            $stmt = $db->query("SELECT COUNT(*) FROM contact_messages WHERE status = 'PENDING'");
            $pendingInquiries = (int)$stmt->fetchColumn();

            // Provider distribution
            $stmt = $db->query("SELECT provider, COUNT(*) as count, COALESCE(SUM(sms_count), 0) as sms_count FROM merchants GROUP BY provider");
            $providersDistribution = $stmt->fetchAll();

            $successCount = (int)($successStats['total_orders'] ?? 0);
            $successRate = $totalOrders > 0 ? round(($successCount / $totalOrders) * 100, 1) : 100;

            echo json_encode([
                'status' => true,
                'data' => [
                    'totalVolume' => (float)($successStats['total_vol'] ?? 0),
                    'todayVolume' => $todayVol,
                    'totalTenants' => $totalTenants,
                    'activeTenants' => $activeTenants,
                    'totalMerchants' => $totalMerchants,
                    'activeMerchants' => $activeMerchants,
                    'totalDevices' => $totalDevices,
                    'onlineDevices' => $onlineDevices,
                    'totalOrders' => $totalOrders,
                    'successRate' => $successRate,
                    'totalInquiries' => $totalInquiries,
                    'pendingInquiries' => $pendingInquiries,
                    'providersDistribution' => $providersDistribution
                ]
            ]);
            exit;
        }

        // 12.2 Admin Users & All Working Accounts Breakdown
        if ($path === '/api/admin/users' && $method === 'GET') {
            $todayPrefix = date('Y-m-d') . '%';
            $stmt = $db->query("SELECT t.id, t.name, t.email, t.role, t.business_name, t.phone, t.plan_id, t.is_active, t.created_at, t.updated_at,
                (SELECT COUNT(*) FROM merchants WHERE tenant_id = t.id) as merchant_count,
                (SELECT COUNT(*) FROM devices WHERE tenant_id = t.id) as device_count,
                (SELECT COUNT(*) FROM devices WHERE tenant_id = t.id AND is_online = 1) as online_device_count,
                (SELECT COUNT(*) FROM api_keys WHERE tenant_id = t.id) as api_keys_count,
                (SELECT COUNT(*) FROM orders WHERE tenant_id = t.id) as total_orders_count,
                (SELECT COUNT(*) FROM orders WHERE tenant_id = t.id AND status = 'TXN_SUCCESS') as success_orders_count,
                (SELECT COALESCE(SUM(amount), 0) FROM orders WHERE tenant_id = t.id AND status = 'TXN_SUCCESS') as total_volume
                FROM tenants t ORDER BY t.created_at DESC");
            $users = $stmt->fetchAll();

            // Pre-fetch all merchants and devices to avoid N+1 queries
            $allMerchantsStmt = $db->query("SELECT id, tenant_id, provider, upi_id, label, display_name, status, intent_enabled, sms_count, updated_at FROM merchants ORDER BY created_at DESC");
            $allMerchants = $allMerchantsStmt->fetchAll();
            $merchantsByTenant = [];
            foreach ($allMerchants as $mRow) {
                $merchantsByTenant[$mRow['tenant_id']][] = [
                    'id' => $mRow['id'],
                    'provider' => $mRow['provider'],
                    'upiId' => $mRow['upi_id'],
                    'label' => $mRow['label'],
                    'displayName' => $mRow['display_name'],
                    'status' => $mRow['status'],
                    'intentEnabled' => (bool)$mRow['intent_enabled'],
                    'smsCount' => (int)$mRow['sms_count'],
                    'updatedAt' => $mRow['updated_at']
                ];
            }

            $allDevicesStmt = $db->query("SELECT id, tenant_id, device_name, device_token, pairing_code, battery_level, is_online, last_heartbeat_at, sms_captured_count, created_at FROM devices ORDER BY created_at DESC");
            $allDevices = $allDevicesStmt->fetchAll();
            $devicesByTenant = [];
            foreach ($allDevices as $dRow) {
                $devicesByTenant[$dRow['tenant_id']][] = [
                    'id' => $dRow['id'],
                    'deviceName' => $dRow['device_name'],
                    'deviceToken' => $dRow['device_token'],
                    'pairingCode' => $dRow['pairing_code'],
                    'batteryLevel' => (int)$dRow['battery_level'],
                    'isOnline' => (bool)$dRow['is_online'],
                    'lastHeartbeatAt' => $dRow['last_heartbeat_at'],
                    'smsCapturedCount' => (int)$dRow['sms_captured_count'],
                    'createdAt' => $dRow['created_at']
                ];
            }

            // Fetch plans
            $plansStmt = $db->query("SELECT id, name, price, max_merchant_accounts, max_orders_per_day, max_api_keys, validity_days FROM plans");
            $plansList = $plansStmt->fetchAll();
            $plansById = [];
            foreach ($plansList as $p) {
                $plansById[$p['id']] = $p;
            }

            $formatted = [];
            foreach ($users as $u) {
                $tId = $u['id'];
                $planDetails = $plansById[$u['plan_id']] ?? [
                    'id' => $u['plan_id'] ?: 'plan_starter',
                    'name' => ucfirst(str_replace('plan_', '', $u['plan_id'] ?: 'Starter')),
                    'price' => 0
                ];

                $formatted[] = [
                    'id' => $u['id'],
                    'name' => $u['name'],
                    'email' => $u['email'],
                    'role' => $u['role'],
                    'businessName' => $u['business_name'] ?: $u['name'],
                    'phone' => $u['phone'],
                    'plan' => $u['plan_id'] ?: 'plan_starter',
                    'planDetails' => $planDetails,
                    'merchantAccountsCount' => (int)$u['merchant_count'],
                    'devicesCount' => (int)$u['device_count'],
                    'onlineDevicesCount' => (int)$u['online_device_count'],
                    'apiKeysCount' => (int)$u['api_keys_count'],
                    'totalOrdersCount' => (int)$u['total_orders_count'],
                    'successOrdersCount' => (int)$u['success_orders_count'],
                    'totalVolume' => (float)$u['total_volume'],
                    'isActive' => (bool)$u['is_active'],
                    'merchants' => $merchantsByTenant[$tId] ?? [],
                    'devices' => $devicesByTenant[$tId] ?? [],
                    'createdAt' => $u['created_at'],
                    'updatedAt' => $u['updated_at']
                ];
            }
            echo json_encode(['status' => true, 'data' => $formatted]);
            exit;
        }

        // 12.3 Admin Single Tenant Deep Detail Snapshot
        if (preg_match('#^/api/admin/users/([^/]+)/details$#', $path, $m) && $method === 'GET') {
            $targetUserId = $m[1];
            $stmt = $db->prepare("SELECT * FROM tenants WHERE id = ?");
            $stmt->execute([$targetUserId]);
            $t = $stmt->fetch();
            if (!$t) {
                http_response_code(404);
                echo json_encode(['status' => false, 'error' => 'Tenant not found']);
                exit;
            }

            // Merchants
            $stmt = $db->prepare("SELECT * FROM merchants WHERE tenant_id = ? ORDER BY created_at DESC");
            $stmt->execute([$targetUserId]);
            $merchants = $stmt->fetchAll();

            // Devices
            $stmt = $db->prepare("SELECT * FROM devices WHERE tenant_id = ? ORDER BY created_at DESC");
            $stmt->execute([$targetUserId]);
            $devices = $stmt->fetchAll();

            // API Keys
            $stmt = $db->prepare("SELECT id, name, key_prefix, is_active, last_used_at, created_at FROM api_keys WHERE tenant_id = ? ORDER BY created_at DESC");
            $stmt->execute([$targetUserId]);
            $apiKeys = $stmt->fetchAll();

            // Recent Orders
            $stmt = $db->prepare("SELECT * FROM orders WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 50");
            $stmt->execute([$targetUserId]);
            $orders = $stmt->fetchAll();

            // Template Settings
            $stmt = $db->prepare("SELECT * FROM tenant_template_settings WHERE tenant_id = ?");
            $stmt->execute([$targetUserId]);
            $templateSettings = $stmt->fetch() ?: null;

            // Webhook Logs
            $stmt = $db->prepare("SELECT * FROM webhook_logs WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 20");
            $stmt->execute([$targetUserId]);
            $webhooks = $stmt->fetchAll();

            echo json_encode([
                'status' => true,
                'data' => [
                    'tenant' => [
                        'id' => $t['id'],
                        'name' => $t['name'],
                        'email' => $t['email'],
                        'role' => $t['role'],
                        'businessName' => $t['business_name'] ?: $t['name'],
                        'phone' => $t['phone'],
                        'planId' => $t['plan_id'],
                        'isActive' => (bool)$t['is_active'],
                        'createdAt' => $t['created_at'],
                        'updatedAt' => $t['updated_at']
                    ],
                    'merchants' => $merchants,
                    'devices' => $devices,
                    'apiKeys' => $apiKeys,
                    'orders' => $orders,
                    'templateSettings' => $templateSettings,
                    'webhooks' => $webhooks
                ]
            ]);
            exit;
        }

        // 12.4.1 Super Admin Manual Plan Approval (Without Payment under Free Plan or any selected tier)
        if (preg_match('#^/api/admin/users/([^/]+)/approve-plan$#', $path, $m) && $method === 'POST') {
            $targetUserId = $m[1];
            $planId = $input['planId'] ?? $input['plan'] ?? 'plan_free';

            $stmt = $db->prepare("SELECT * FROM tenants WHERE id = ?");
            $stmt->execute([$targetUserId]);
            $targetTenant = $stmt->fetch();
            if (!$targetTenant) {
                http_response_code(404);
                echo json_encode(['status' => false, 'error' => 'Tenant not found']);
                exit;
            }

            $stmt = $db->prepare("SELECT * FROM plans WHERE id = ?");
            $stmt->execute([$planId]);
            $plan = $stmt->fetch();

            if (!$plan && $planId === 'plan_free') {
                $db->exec("INSERT INTO plans (id, name, price, max_merchant_accounts, max_orders_per_day, max_api_keys, validity_days, features_json, is_active)
                    VALUES ('plan_free', 'Free Plan', 0.00, 2, 500, 2, 365, '[\"Free Merchant Accounts\",\"500 Orders / Day\",\"Webhooks & Instant Verification\",\"No Monthly Fees\"]', 1)
                    ON DUPLICATE KEY UPDATE name = VALUES(name), price = VALUES(price), is_active = 1");
                $stmt = $db->prepare("SELECT * FROM plans WHERE id = ?");
                $stmt->execute([$planId]);
                $plan = $stmt->fetch();
            }

            if (!$plan) {
                http_response_code(404);
                echo json_encode(['status' => false, 'error' => 'Selected subscription plan not found']);
                exit;
            }

            $now = gmdate('Y-m-d\TH:i:s\Z');
            $validity = (int)($plan['validity_days'] ?: 365);
            $expires = gmdate('Y-m-d\TH:i:s\Z', strtotime("+$validity days"));

            // 1. Activate Tenant Workspace
            $upd = $db->prepare("UPDATE tenants SET plan_id = ?, is_active = 1, updated_at = ? WHERE id = ?");
            $upd->execute([$plan['id'], $now, $targetUserId]);

            // 2. Activate Subscription
            $stmt = $db->prepare("SELECT id FROM subscriptions WHERE tenant_id = ?");
            $stmt->execute([$targetUserId]);
            $sub = $stmt->fetch();

            if ($sub) {
                $updSub = $db->prepare("UPDATE subscriptions SET plan_id = ?, status = 'ACTIVE', starts_at = ?, expires_at = ?, orders_today = 0, last_reset_date = ? WHERE tenant_id = ?");
                $updSub->execute([$plan['id'], $now, $expires, date('Y-m-d'), $targetUserId]);
            } else {
                $subId = 'sub_' . substr(bin2hex(random_bytes(6)), 0, 8);
                $insSub = $db->prepare("INSERT INTO subscriptions (id, tenant_id, plan_id, status, starts_at, expires_at, orders_today, last_reset_date) VALUES (?, ?, ?, 'ACTIVE', ?, ?, 0, ?)");
                $insSub->execute([$subId, $targetUserId, $plan['id'], $now, $expires, date('Y-m-d')]);
            }

            // 3. Log Audit Trail
            PlanService::logAccess($targetUserId, 'ADMIN_MANUAL_PLAN_APPROVAL', '/api/admin/users/approve-plan', 'SUCCESS', "Super Admin approved tenant without payment under " . $plan['name'], $db);

            echo json_encode([
                'status' => true,
                'message' => "✓ {$targetTenant['name']} successfully approved under {$plan['name']} without payment!",
                'data' => [
                    'tenantId' => $targetUserId,
                    'planId' => $plan['id'],
                    'planName' => $plan['name'],
                    'expiresAt' => $expires,
                    'status' => 'ACTIVE'
                ]
            ]);
            exit;
        }

        // 12.4 Admin User Update (Suspend / Activate / Change Plan / Edit Role)
        if (preg_match('#^/api/admin/users/([^/]+)$#', $path, $m) && ($method === 'PUT' || $method === 'PATCH')) {
            $targetUserId = $m[1];
            $now = gmdate('Y-m-d\TH:i:s\Z');
            $updates = ["updated_at = ?"];
            $params = [$now];

            if (isset($input['isActive'])) {
                $updates[] = "is_active = ?";
                $params[] = (int)$input['isActive'];
            }
            if (isset($input['role'])) {
                $updates[] = "role = ?";
                $params[] = $input['role'];
            }
            if (isset($input['businessName'])) {
                $updates[] = "business_name = ?";
                $params[] = $input['businessName'];
            }
            if (isset($input['phone'])) {
                $updates[] = "phone = ?";
                $params[] = $input['phone'];
            }
            if (isset($input['name'])) {
                $updates[] = "name = ?";
                $params[] = $input['name'];
            }

            // Super Admin can assign/override any plan directly without requiring payment
            if (isset($input['planId']) || isset($input['plan'])) {
                $planId = $input['planId'] ?? $input['plan'];
                $stmt = $db->prepare("SELECT * FROM plans WHERE id = ?");
                $stmt->execute([$planId]);
                $plan = $stmt->fetch();
                if ($plan) {
                    $updates[] = "plan_id = ?";
                    $params[] = $plan['id'];

                    $validity = (int)($plan['validity_days'] ?: 365);
                    $expires = gmdate('Y-m-d\TH:i:s\Z', strtotime("+$validity days"));

                    $subStmt = $db->prepare("SELECT id FROM subscriptions WHERE tenant_id = ?");
                    $subStmt->execute([$targetUserId]);
                    if ($subStmt->fetch()) {
                        $updSub = $db->prepare("UPDATE subscriptions SET plan_id = ?, status = 'ACTIVE', starts_at = ?, expires_at = ?, orders_today = 0, last_reset_date = ? WHERE tenant_id = ?");
                        $updSub->execute([$plan['id'], $now, $expires, date('Y-m-d'), $targetUserId]);
                    } else {
                        $subId = 'sub_' . substr(bin2hex(random_bytes(6)), 0, 8);
                        $insSub = $db->prepare("INSERT INTO subscriptions (id, tenant_id, plan_id, status, starts_at, expires_at, orders_today, last_reset_date) VALUES (?, ?, ?, 'ACTIVE', ?, ?, 0, ?)");
                        $insSub->execute([$subId, $targetUserId, $plan['id'], $now, $expires, date('Y-m-d')]);
                    }

                    PlanService::logAccess($targetUserId, 'ADMIN_MANUAL_PLAN_APPROVAL', '/api/admin/users', 'SUCCESS', "Super admin assigned {$plan['name']} without payment", $db);
                }
            }

            $params[] = $targetUserId;
            $sql = "UPDATE tenants SET " . implode(', ', $updates) . " WHERE id = ?";
            $stmt = $db->prepare($sql);
            $stmt->execute($params);

            echo json_encode(['status' => true, 'message' => 'Tenant configuration updated successfully']);
            exit;
        }

        // 12.5 Admin Add Merchant Gateway Account for Tenant
        if (preg_match('#^/api/admin/users/([^/]+)/merchants$#', $path, $m) && $method === 'POST') {
            $targetTenantId = $m[1];
            $provider = strtoupper(trim($input['provider'] ?? 'CUSTOM_UPI'));
            $upiId = trim($input['upiId'] ?? $input['upi_id'] ?? '');
            $label = trim($input['label'] ?? 'Admin Configured Gateway');
            $displayName = trim($input['displayName'] ?? $input['display_name'] ?? $label);
            $weight = (int)($input['weight'] ?? 10);
            $now = gmdate('Y-m-d\TH:i:s\Z');
            $merchantId = 'm_' . bin2hex(random_bytes(6));

            if (!$upiId) {
                http_response_code(400);
                echo json_encode(['status' => false, 'error' => 'UPI ID is required']);
                exit;
            }

            $stmt = $db->prepare("INSERT INTO merchants (id, tenant_id, provider, label, upi_id, display_name, weight, status, intent_enabled, gmail_connected, credentials_json, sms_count, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE', 1, 0, '{}', 0, ?, ?)");
            $stmt->execute([$merchantId, $targetTenantId, $provider, $label, $upiId, $displayName, $weight, $now, $now]);

            echo json_encode([
                'status' => true,
                'message' => 'Merchant account created successfully for tenant',
                'data' => [
                    'id' => $merchantId,
                    'tenantId' => $targetTenantId,
                    'provider' => $provider,
                    'upiId' => $upiId,
                    'label' => $label,
                    'status' => 'ACTIVE'
                ]
            ]);
            exit;
        }

        // 12.6 Admin Toggle/Update Merchant Account
        if (preg_match('#^/api/admin/merchants/([^/]+)$#', $path, $m) && ($method === 'PATCH' || $method === 'PUT')) {
            $merchantId = $m[1];
            $now = gmdate('Y-m-d\TH:i:s\Z');
            $updates = ["updated_at = ?"];
            $params = [$now];

            if (isset($input['status'])) {
                $updates[] = "status = ?";
                $params[] = $input['status'];
            }
            if (isset($input['upiId'])) {
                $updates[] = "upi_id = ?";
                $params[] = $input['upiId'];
            }
            if (isset($input['label'])) {
                $updates[] = "label = ?";
                $params[] = $input['label'];
            }
            if (isset($input['provider'])) {
                $updates[] = "provider = ?";
                $params[] = $input['provider'];
            }

            $params[] = $merchantId;
            $stmt = $db->prepare("UPDATE merchants SET " . implode(', ', $updates) . " WHERE id = ?");
            $stmt->execute($params);

            echo json_encode(['status' => true, 'message' => 'Merchant account updated successfully']);
            exit;
        }

        // 12.7 Admin Delete Merchant Account
        if (preg_match('#^/api/admin/merchants/([^/]+)$#', $path, $m) && $method === 'DELETE') {
            $merchantId = $m[1];
            $stmt = $db->prepare("DELETE FROM merchants WHERE id = ?");
            $stmt->execute([$merchantId]);
            echo json_encode(['status' => true, 'message' => 'Merchant account deleted successfully']);
            exit;
        }

        // 12.8 Admin Impersonate Merchant Tenant (Seamless 1-Click Workspace Switcher)
        if (preg_match('#^/api/admin/impersonate/([^/]+)$#', $path, $m) && $method === 'POST') {
            $targetId = $m[1];
            $stmt = $db->prepare("SELECT * FROM tenants WHERE id = ?");
            $stmt->execute([$targetId]);
            $targetTenant = $stmt->fetch();
            if (!$targetTenant) {
                http_response_code(404);
                echo json_encode(['status' => false, 'error' => 'Target tenant not found']);
                exit;
            }

            $impersonationToken = jwt_sign([
                'tenantId' => $targetTenant['id'],
                'email' => $targetTenant['email'],
                'role' => $targetTenant['role'],
                'impersonatedBy' => $tenant['email']
            ]);

            echo json_encode([
                'status' => true,
                'message' => "Successfully generated workspace session for {$targetTenant['name']}",
                'data' => [
                    'token' => $impersonationToken,
                    'tenant' => [
                        'id' => $targetTenant['id'],
                        'name' => $targetTenant['name'],
                        'email' => $targetTenant['email'],
                        'role' => $targetTenant['role'],
                        'businessName' => $targetTenant['business_name'] ?: $targetTenant['name'],
                        'phone' => $targetTenant['phone'],
                        'planId' => $targetTenant['plan_id']
                    ]
                ]
            ]);
            exit;
        }

        // 12.9 Admin Global Orders List
        if ($path === '/api/admin/orders' && $method === 'GET') {
            $limit = min(100, max(1, (int)($_GET['limit'] ?? 50)));
            $stmt = $db->prepare("SELECT o.*, t.business_name as tenant_business, t.email as tenant_email FROM orders o LEFT JOIN tenants t ON o.tenant_id = t.id ORDER BY o.created_at DESC LIMIT ?");
            $stmt->bindValue(1, $limit, PDO::PARAM_INT);
            $stmt->execute();
            $rows = $stmt->fetchAll();
            $orders = [];
            foreach ($rows as $r) {
                $orders[] = [
                    'id' => $r['id'],
                    'orderId' => $r['order_id'],
                    'tenantId' => $r['tenant_id'],
                    'tenantBusiness' => $r['tenant_business'] ?? '',
                    'tenantEmail' => $r['tenant_email'] ?? '',
                    'amount' => (float)$r['amount'],
                    'provider' => $r['provider'] ?? 'UPI_DIRECT',
                    'status' => $r['status'],
                    'utr' => $r['utr'] ?? '',
                    'upiId' => $r['upi_id'] ?? '',
                    'createdAt' => $r['created_at']
                ];
            }
            echo json_encode(['status' => true, 'data' => $orders]);
            exit;
        }

        // 12.10 Admin List & Create Subscription Plans
        if ($path === '/api/admin/plans' && $method === 'GET') {
            $stmt = $db->query("SELECT * FROM plans ORDER BY price ASC");
            $plans = $stmt->fetchAll();
            echo json_encode(['status' => true, 'data' => $plans]);
            exit;
        }

        if ($path === '/api/admin/plans/create' && $method === 'POST') {
            $name = trim($input['name'] ?? 'Custom Plan');
            $price = (float)($input['price'] ?? 0);
            $validity = (int)($input['validityDays'] ?? 30);
            $maxMerchants = (int)($input['maxMerchantAccounts'] ?? 5);
            $maxOrders = (int)($input['maxOrdersPerDay'] ?? 500);
            $maxKeys = (int)($input['maxApiKeys'] ?? 5);

            $planId = 'plan_' . preg_replace('/[^a-z0-9_]/', '_', strtolower($name)) . '_' . substr(bin2hex(random_bytes(3)), 0, 4);
            $features = json_encode([
                "Up to $maxMerchants Connected Merchant Accounts",
                "Up to $maxOrders Orders / Day",
                "Dedicated Webhooks & Priority Companion",
                "Zero-Drop Auto Settlement Engine"
            ]);

            $stmt = $db->prepare("INSERT INTO plans (id, name, price, max_merchant_accounts, max_orders_per_day, max_api_keys, validity_days, features_json, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)");
            $stmt->execute([$planId, $name, $price, $maxMerchants, $maxOrders, $maxKeys, $validity, $features]);

            echo json_encode(['status' => true, 'message' => 'Custom plan created successfully', 'data' => ['id' => $planId, 'name' => $name]]);
            exit;
        }

        // 12.11 Admin Contact Inquiries List (Contact Us History)
        if ($path === '/api/admin/contacts' && $method === 'GET') {
            $stmt = $db->query("SELECT * FROM contact_messages ORDER BY created_at DESC");
            $rows = $stmt->fetchAll();
            $messages = [];
            foreach ($rows as $r) {
                $messages[] = [
                    'id' => $r['id'],
                    'name' => $r['name'],
                    'email' => $r['email'],
                    'subject' => $r['subject'] ?? 'general',
                    'orderId' => $r['order_id'] ?? '',
                    'message' => $r['message'],
                    'ipAddress' => $r['ip_address'] ?? '',
                    'userAgent' => $r['user_agent'] ?? '',
                    'status' => $r['status'] ?? 'PENDING',
                    'replyNotes' => $r['reply_notes'] ?? '',
                    'createdAt' => $r['created_at'],
                    'updatedAt' => $r['updated_at'] ?? $r['created_at']
                ];
            }
            echo json_encode(['status' => true, 'data' => $messages]);
            exit;
        }

        // 12.12 Admin Contact Inquiry Update Status / Reply Notes
        if (preg_match('#^/api/admin/contacts/([^/]+)$#', $path, $m) && ($method === 'PATCH' || $method === 'PUT')) {
            $msgId = $m[1];
            $status = $input['status'] ?? null;
            $replyNotes = $input['replyNotes'] ?? $input['reply_notes'] ?? null;
            $now = gmdate('Y-m-d\TH:i:s\Z');

            $updates = ["updated_at = ?"];
            $params = [$now];

            if ($status !== null) {
                $updates[] = "status = ?";
                $params[] = $status;
            }
            if ($replyNotes !== null) {
                $updates[] = "reply_notes = ?";
                $params[] = $replyNotes;
            }

            $params[] = $msgId;
            $sql = "UPDATE contact_messages SET " . implode(', ', $updates) . " WHERE id = ?";
            $stmt = $db->prepare($sql);
            $stmt->execute($params);

            echo json_encode(['status' => true, 'message' => 'Contact inquiry status updated successfully']);
            exit;
        }

        // 12.13 Admin Contact Inquiry Delete
        if (preg_match('#^/api/admin/contacts/([^/]+)$#', $path, $m) && $method === 'DELETE') {
            $msgId = $m[1];
            $stmt = $db->prepare("DELETE FROM contact_messages WHERE id = ?");
            $stmt->execute([$msgId]);
            echo json_encode(['status' => true, 'message' => 'Contact inquiry deleted successfully']);
            exit;
        }
    }

    // FALLBACK 404
    http_response_code(404);
    echo json_encode(['status' => false, 'error' => "Endpoint $path not found"]);

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['status' => false, 'error' => $e->getMessage(), 'line' => $e->getLine(), 'file' => $e->getFile()]);
}
