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
        }

        $stmt = $db->prepare("SELECT * FROM subscriptions WHERE tenant_id = ? ORDER BY starts_at DESC LIMIT 1");
        $stmt->execute([$tenant['id']]);
        $subscription = $stmt->fetch();

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
                'subscription' => $subscription
            ]
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

        if ($method === 'POST') {
            $amount = (float)($input['amount'] ?? 0);
            if ($amount <= 0) {
                http_response_code(400);
                echo json_encode(['status' => false, 'error' => 'Amount must be greater than 0']);
                exit;
            }

            // Pick an active merchant for this tenant
            $stmt = $db->prepare("SELECT * FROM merchants WHERE tenant_id = ? AND status = 'ACTIVE' ORDER BY weight DESC, RAND() LIMIT 1");
            $stmt->execute([$tenant['id']]);
            $merchant = $stmt->fetch();

            $orderId = 'PV_' . strtoupper(bin2hex(random_bytes(5)));
            $linkToken = bin2hex(random_bytes(16));
            $paymentUrl = "https://payvia360.com/pay/$linkToken";
            $now = gmdate('Y-m-d\TH:i:s\Z');
            $expires = gmdate('Y-m-d\TH:i:s\Z', strtotime('+15 minutes'));

            $stmt = $db->prepare("INSERT INTO orders (id, order_id, tenant_id, merchant_account_id, merchant_account_label, provider, amount, currency, status, customer_mobile, customer_name, remark1, return_url, callback_url, template, link_token, payment_url, expires_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'INR', 'PENDING', ?, ?, ?, ?, ?, 'template_1', ?, ?, ?, ?, ?)");
            $stmt->execute([
                $orderId,
                $orderId,
                $tenant['id'],
                $merchant ? $merchant['id'] : null,
                $merchant ? $merchant['label'] : 'Default UPI Engine',
                $merchant ? $merchant['provider'] : 'CUSTOM_UPI',
                $amount,
                $input['customerMobile'] ?? $input['customer_mobile'] ?? null,
                $input['customerName'] ?? $input['customer_name'] ?? null,
                $input['remark1'] ?? $input['remark'] ?? 'Payment',
                $input['return_url'] ?? $input['returnUrl'] ?? null,
                $input['callback_url'] ?? $input['callbackUrl'] ?? null,
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
                    'linkToken' => $linkToken,
                    'paymentUrl' => $paymentUrl,
                    'amount' => $amount,
                    'status' => 'PENDING',
                    'expiresAt' => $expires
                ]
            ]);
            exit;
        }
    }

    // 7. CHECKOUT / PAY PAGE DATA (Public)
    if (strpos($path, '/api/checkout') === 0) {
        $parts = explode('/', $path);
        $linkToken = end($parts);
        $db = getDb();

        $stmt = $db->prepare("SELECT o.*, m.upi_id as merchant_upi_id, m.display_name as merchant_display_name FROM orders o LEFT JOIN merchants m ON o.merchant_account_id = m.id WHERE o.link_token = ?");
        $stmt->execute([$linkToken]);
        $order = $stmt->fetch();

        if (!$order) {
            http_response_code(404);
            echo json_encode(['status' => false, 'error' => 'Order payment link not found or expired']);
            exit;
        }

        $upiId = $order['merchant_upi_id'] ?: 'payvia@upi';
        $amount = (float)$order['amount'];
        $upiIntent = "upi://pay?pa=$upiId&pn=" . urlencode($order['merchant_display_name'] ?: 'PayVia Merchant') . "&am=$amount&cu=INR&tn=" . urlencode($order['order_id']);

        echo json_encode([
            'status' => true,
            'data' => [
                'orderId' => $order['order_id'],
                'amount' => $amount,
                'status' => $order['status'],
                'upiId' => $upiId,
                'merchantName' => $order['merchant_display_name'] ?: 'PayVia Verified Merchant',
                'upiIntentUrl' => $upiIntent,
                'expiresAt' => $order['expires_at'],
                'paidAt' => $order['paid_at'],
                'utr' => $order['utr']
            ]
        ]);
        exit;
    }

    // 8. DEVICES & NOTIFICATION INGESTION (Companion App)
    if (strpos($path, '/api/devices') === 0) {
        $db = getDb();

        // Notification / SMS Ingestion (Zero-Drop Auto Register)
        if ($path === '/api/devices/notification-ingest' || $path === '/api/devices/sms-ingest') {
            $deviceToken = $input['deviceToken'] ?? $input['device_token'] ?? $input['deviceId'] ?? 'companion_phone_1';
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

            // Ensure device is registered
            $stmt = $db->prepare("SELECT id FROM devices WHERE device_token = ?");
            $stmt->execute([$deviceToken]);
            if (!$stmt->fetch()) {
                $devId = 'dev_' . substr(bin2hex(random_bytes(6)), 0, 8);
                $ins = $db->prepare("INSERT INTO devices (id, tenant_id, device_name, device_token, pairing_code, is_online, last_heartbeat_at, sms_captured_count, created_at) VALUES (?, 'tenant_pankaj_007', 'Android Companion Device', ?, '778899', 1, ?, 1, ?)");
                $ins->execute([$devId, $deviceToken, gmdate('Y-m-d\TH:i:s\Z'), gmdate('Y-m-d\TH:i:s\Z')]);
            } else {
                $upd = $db->prepare("UPDATE devices SET is_online = 1, last_heartbeat_at = ?, sms_captured_count = sms_captured_count + 1 WHERE device_token = ?");
                $upd->execute([gmdate('Y-m-d\TH:i:s\Z'), $deviceToken]);
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

        // List devices for tenant
        $tenant = authenticateUser();
        if (!$tenant) {
            http_response_code(401);
            echo json_encode(['status' => false, 'error' => 'Unauthorized']);
            exit;
        }

        $stmt = $db->prepare("SELECT * FROM devices WHERE tenant_id = ? ORDER BY created_at DESC");
        $stmt->execute([$tenant['id']]);
        $devices = $stmt->fetchAll();
        echo json_encode(['status' => true, 'data' => $devices]);
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
            $stmt = $db->prepare("SELECT id, tenant_id, name, key_prefix, raw_key, is_active, created_at, last_used_at FROM api_keys WHERE tenant_id = ?");
            $stmt->execute([$tenant['id']]);
            $keys = $stmt->fetchAll();
            echo json_encode(['status' => true, 'data' => $keys]);
            exit;
        }

        if ($method === 'POST') {
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
                        'ordersMax' => $plan ? (int)$plan['max_orders_per_day'] : 100
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

    // FALLBACK 404
    http_response_code(404);
    echo json_encode(['status' => false, 'error' => "Endpoint $path not found"]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['status' => false, 'error' => $e->getMessage()]);
}
