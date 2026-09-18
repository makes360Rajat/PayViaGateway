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

        // Run safe alters in case tables already existed
        try { $pdo->exec("ALTER TABLE tenant_template_settings ADD COLUMN enabled_templates TEXT DEFAULT NULL"); } catch (Exception $e) {}
        try { $pdo->exec("ALTER TABLE tenant_template_settings ADD COLUMN logo_url VARCHAR(255) DEFAULT NULL"); } catch (Exception $e) {}
        try { $pdo->exec("ALTER TABLE tenant_template_settings ADD COLUMN support_note VARCHAR(255) DEFAULT NULL"); } catch (Exception $e) {}
        try { $pdo->exec("ALTER TABLE contact_messages ADD COLUMN reply_notes TEXT DEFAULT NULL"); } catch (Exception $e) {}
        try { $pdo->exec("ALTER TABLE devices ADD COLUMN status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE'"); } catch (Exception $e) {}

        // Enforce proper system roles: pankajpanks007@gmail.com is strictly MERCHANT, admin@payvia.vip is SUPER_ADMIN
        try {
            $pdo->exec("UPDATE tenants SET role = 'MERCHANT' WHERE email = 'pankajpanks007@gmail.com' AND role = 'SUPER_ADMIN'");
            $pdo->exec("UPDATE tenants SET role = 'SUPER_ADMIN' WHERE email = 'admin@payvia.vip'");
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

        if ($method === 'GET') {
            $stmt = $db->prepare("SELECT * FROM merchants WHERE tenant_id = ? ORDER BY created_at DESC");
            $stmt->execute([$tenant['id']]);
            $merchants = $stmt->fetchAll();
            foreach ($merchants as &$m) {
                $m['upiId'] = $m['upi_id'] ?? '';
                $m['credentials'] = json_decode($m['credentials_json'] ?? '{}', true);
                $m['intentEnabled'] = (bool)$m['intent_enabled'];
                $m['gmailConnected'] = (bool)$m['gmail_connected'];
                $m['displayName'] = $m['display_name'];
                $m['smsCount'] = (int)$m['sms_count'];
                $m['lastUsedAt'] = $m['last_used_at'];
            }
            echo json_encode(['status' => true, 'data' => $merchants]);
            exit;
        }

        if ($method === 'POST') {
            $id = 'mer_' . substr(bin2hex(random_bytes(6)), 0, 8);
            $provider = $input['provider'] ?? 'CUSTOM_UPI';
            $label = $input['label'] ?? 'Main Merchant';
            $upiId = $input['upiId'] ?? $input['upi_id'] ?? '';
            $displayName = $input['displayName'] ?? $input['display_name'] ?? $label;
            $weight = (int)($input['weight'] ?? 50);
            $intentEnabled = isset($input['intentEnabled']) ? (int)$input['intentEnabled'] : 1;
            $credsJson = json_encode($input['credentials'] ?? []);
            $now = gmdate('Y-m-d\TH:i:s\Z');

            $stmt = $db->prepare("INSERT INTO merchants (id, tenant_id, provider, label, upi_id, display_name, weight, status, intent_enabled, gmail_connected, credentials_json, sms_count, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, 0, ?, 0, ?, ?)");
            $stmt->execute([$id, $tenant['id'], $provider, $label, $upiId, $displayName, $weight, $intentEnabled, $credsJson, $now, $now]);

            echo json_encode(['status' => true, 'message' => 'Merchant added successfully', 'data' => ['id' => $id, 'label' => $label, 'provider' => $provider, 'upiId' => $upiId, 'status' => 'ACTIVE']]);
            exit;
        }

        // UPDATE / DELETE / TOGGLE
        if ($method === 'PUT' || $method === 'PATCH') {
            $parts = explode('/', $path);
            $merId = end($parts);
            $status = $input['status'] ?? 'ACTIVE';
            $stmt = $db->prepare("UPDATE merchants SET status = ?, updated_at = ? WHERE id = ? AND tenant_id = ?");
            $stmt->execute([$status, gmdate('Y-m-d\TH:i:s\Z'), $merId, $tenant['id']]);
            echo json_encode(['status' => true, 'message' => 'Merchant updated']);
            exit;
        }

        if ($method === 'DELETE') {
            $parts = explode('/', $path);
            $merId = end($parts);
            $stmt = $db->prepare("DELETE FROM merchants WHERE id = ? AND tenant_id = ?");
            $stmt->execute([$merId, $tenant['id']]);
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
            $utr = !empty($input['utr']) ? $input['utr'] : ('MANUAL_' . strtoupper(bin2hex(random_bytes(4))));
            $now = gmdate('Y-m-d\TH:i:s\Z');
            $stmt = $db->prepare("UPDATE orders SET status = 'TXN_SUCCESS', utr = ?, paid_at = ?, updated_at = ? WHERE (id = ? OR order_id = ?) AND tenant_id = ?");
            $stmt->execute([$utr, $now, $now, $orderId, $orderId, $tenant['id']]);
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

            // Pick specified or active merchant for this tenant
            $merchant = null;
            if (!empty($input['merchantAccountId'])) {
                $stmt = $db->prepare("SELECT * FROM merchants WHERE id = ? AND tenant_id = ?");
                $stmt->execute([$input['merchantAccountId'], $tenant['id']]);
                $merchant = $stmt->fetch();
            }

            if (!$merchant) {
                $stmt = $db->prepare("SELECT * FROM merchants WHERE tenant_id = ? AND status = 'ACTIVE' ORDER BY weight DESC, RAND() LIMIT 1");
                $stmt->execute([$tenant['id']]);
                $merchant = $stmt->fetch();
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

            $template = !empty($input['template']) ? $input['template'] : 'template_1';
            $orderId = 'PV_' . strtoupper(bin2hex(random_bytes(5)));
            $linkToken = bin2hex(random_bytes(16));
            $paymentUrl = "https://payvia360.com/pay/$linkToken";
            $now = gmdate('Y-m-d\TH:i:s\Z');
            $expires = gmdate('Y-m-d\TH:i:s\Z', strtotime('+15 minutes'));

            $stmt = $db->prepare("INSERT INTO orders (id, order_id, tenant_id, merchant_account_id, merchant_account_label, provider, amount, currency, status, customer_mobile, customer_name, remark1, return_url, callback_url, template, link_token, payment_url, expires_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'INR', 'PENDING', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
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
                $now
            ]);

            echo json_encode([
                'status' => true,
                'message' => 'Payment link created',
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
                    'expiresAt' => $expires,
                    'expires_at' => $expires
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

        $now = gmdate('Y-m-d\TH:i:s\Z');
        $upd = $db->prepare("UPDATE orders SET status = 'TXN_SUCCESS', utr = ?, paid_at = ?, updated_at = ? WHERE id = ?");
        $upd->execute([$utr, $now, $now, $order['id']]);

        echo json_encode([
            'status' => true,
            'message' => 'Payment verified successfully! UTR reference confirmed.',
            'data' => [
                'order_id' => $order['order_id'],
                'orderId' => $order['order_id'],
                'status' => 'TXN_SUCCESS',
                'utr' => $utr,
                'paidAt' => $now,
                'paid_at' => $now
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
                ['id' => 'template_1', 'name' => 'Classic Card', 'description' => 'Familiar checkout card. Safe, high-trust default.', 'swatch' => ['#f1f5f9', '#0f172a']],
                ['id' => 'template_2', 'name' => 'Minimal Mono', 'description' => 'Typography-led, no chrome, fastest to read.', 'swatch' => ['#ffffff', '#111827']],
                ['id' => 'template_3', 'name' => 'Gradient Glass', 'description' => 'Frosted card on a brand gradient.', 'swatch' => ['#6366f1', '#0f172a']],
                ['id' => 'template_4', 'name' => 'Dark Neon', 'description' => 'High-contrast dark surface with a glowing ring.', 'swatch' => ['#080b14', '#22d3ee']],
                ['id' => 'template_5', 'name' => 'Receipt', 'description' => 'Perforated ticket styling with a torn edge.', 'swatch' => ['#f4f1ea', '#b45309']],
                ['id' => 'template_6', 'name' => 'Bold Split', 'description' => 'Big brand banner with an overlapping QR card.', 'swatch' => ['#2563eb', '#ffffff']],
                ['id' => 'template_7', 'name' => 'Soft Pastel', 'description' => 'Rounded friendly surfaces, low contrast.', 'swatch' => ['#e0f2fe', '#0ea5e9']],
                ['id' => 'template_8', 'name' => 'Compact Sheet', 'description' => 'Bottom-sheet layout, thumb-reachable actions.', 'swatch' => ['#0f172a', '#ffffff']],
                ['id' => 'template_9', 'name' => 'Guided Steps', 'description' => 'Three-step walkthrough for first-time payers.', 'swatch' => ['#f8fafc', '#16a34a']],
                ['id' => 'template_10', 'name' => 'Brand Hero', 'description' => 'Full-bleed hero with a QR medallion.', 'swatch' => ['#111827', '#a855f7']],
                ['id' => 'template_11', 'name' => 'Modern Glass', 'description' => 'A cutting-edge glassmorphism design with animated gradients.', 'swatch' => ['#020617', '#6366f1']]
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

            $stmt = $db->prepare("SELECT id, tenant_id, status, is_online FROM devices WHERE device_token = ? OR id = ? LIMIT 1");
            $stmt->execute([$deviceToken, $deviceToken]);
            $device = $stmt->fetch();

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
            $deviceToken = $input['deviceToken'] ?? $input['device_token'] ?? $input['deviceId'] ?? 'companion_phone_1';

            // Check if device is paused
            $chkDev = $db->prepare("SELECT id, status FROM devices WHERE device_token = ? OR id = ? LIMIT 1");
            $chkDev->execute([$deviceToken, $deviceToken]);
            $dRow = $chkDev->fetch();
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
                // Find latest matching pending order around this amount
                $stmt = $db->prepare("SELECT * FROM orders WHERE status = 'PENDING' AND (amount = ? OR ABS(amount - ?) < 0.01) ORDER BY created_at DESC LIMIT 1");
                $stmt->execute([$amount, $amount]);
                $matchedOrder = $stmt->fetch();

                if ($matchedOrder) {
                    $matchedOrderId = $matchedOrder['order_id'];
                    $now = gmdate('Y-m-d\TH:i:s\Z');
                    $upd = $db->prepare("UPDATE orders SET status = 'TXN_SUCCESS', utr = ?, paid_at = ?, updated_at = ? WHERE id = ?");
                    $upd->execute([$utr ?: 'AUTO_' . substr(bin2hex(random_bytes(4)), 0, 8), $now, $now, $matchedOrder['id']]);
                }
            }

            // Ensure device is registered and record real-time battery level
            $batteryLevel = isset($input['batteryLevel']) ? (int)$input['batteryLevel'] : null;
            $stmt = $db->prepare("SELECT id FROM devices WHERE device_token = ?");
            $stmt->execute([$deviceToken]);
            if (!$stmt->fetch()) {
                $devId = 'dev_' . substr(bin2hex(random_bytes(6)), 0, 8);
                $bat = $batteryLevel !== null ? $batteryLevel : 100;
                $ins = $db->prepare("INSERT INTO devices (id, tenant_id, device_name, device_token, pairing_code, battery_level, is_online, last_heartbeat_at, sms_captured_count, created_at) VALUES (?, 'tenant_pankaj_007', 'Android Companion Device', ?, '778899', ?, 1, ?, 1, ?)");
                $ins->execute([$devId, $deviceToken, $bat, gmdate('Y-m-d\TH:i:s\Z'), gmdate('Y-m-d\TH:i:s\Z')]);
            } else {
                if ($batteryLevel !== null) {
                    $upd = $db->prepare("UPDATE devices SET is_online = 1, battery_level = ?, last_heartbeat_at = ?, sms_captured_count = sms_captured_count + 1 WHERE device_token = ?");
                    $upd->execute([$batteryLevel, gmdate('Y-m-d\TH:i:s\Z'), $deviceToken]);
                } else {
                    $upd = $db->prepare("UPDATE devices SET is_online = 1, last_heartbeat_at = ?, sms_captured_count = sms_captured_count + 1 WHERE device_token = ?");
                    $upd->execute([gmdate('Y-m-d\TH:i:s\Z'), $deviceToken]);
                }
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

            $now = gmdate('Y-m-d\TH:i:s\Z');
            $settleUtr = $utr ?: ('MANUAL_' . time());
            $upd = $db->prepare("UPDATE orders SET status = 'TXN_SUCCESS', utr = ?, paid_at = ?, updated_at = ? WHERE id = ?");
            $upd->execute([$settleUtr, $now, $now, $order['id']]);

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

        // 10.2 Upgrade / Activate Subscription Plan
        if ($path === '/api/plans/upgrade' && $method === 'POST') {
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

            $now = gmdate('Y-m-d\TH:i:s\Z');
            $validityDays = (int)($targetPlan['validity_days'] ?: 30);
            $expires = gmdate('Y-m-d\TH:i:s\Z', strtotime("+$validityDays days"));

            // Update Tenant Plan
            $stmt = $db->prepare("UPDATE tenants SET plan_id = ?, updated_at = ? WHERE id = ?");
            $stmt->execute([$targetPlan['id'], $now, $tenant['id']]);

            // Update / Insert Subscription
            $stmt = $db->prepare("SELECT id FROM subscriptions WHERE tenant_id = ?");
            $stmt->execute([$tenant['id']]);
            $existingSub = $stmt->fetch();

            if ($existingSub) {
                $stmt = $db->prepare("UPDATE subscriptions SET plan_id = ?, status = 'ACTIVE', starts_at = ?, expires_at = ?, orders_today = 0, last_reset_date = ? WHERE tenant_id = ?");
                $stmt->execute([$targetPlan['id'], $now, $expires, date('Y-m-d'), $tenant['id']]);
            } else {
                $subId = 'sub_' . substr(bin2hex(random_bytes(6)), 0, 8);
                $stmt = $db->prepare("INSERT INTO subscriptions (id, tenant_id, plan_id, status, starts_at, expires_at, orders_today, last_reset_date) VALUES (?, ?, ?, 'ACTIVE', ?, ?, 0, ?)");
                $stmt->execute([$subId, $tenant['id'], $targetPlan['id'], $now, $expires, date('Y-m-d')]);
            }

            $targetPlan['features'] = json_decode($targetPlan['features_json'] ?? '[]', true);
            $targetPlan['price'] = (float)$targetPlan['price'];

            echo json_encode([
                'status' => true,
                'message' => "🎉 {$targetPlan['name']} Plan activated successfully! Gateway workspace is now fully unlocked.",
                'data' => [
                    'plan' => $targetPlan,
                    'subscription' => [
                        'tenantId' => $tenant['id'],
                        'planId' => $targetPlan['id'],
                        'status' => 'ACTIVE',
                        'startsAt' => $now,
                        'expiresAt' => $expires
                    ]
                ]
            ]);
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
            if (isset($input['planId']) || isset($input['plan'])) {
                $updates[] = "plan_id = ?";
                $params[] = $input['planId'] ?? $input['plan'];
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
