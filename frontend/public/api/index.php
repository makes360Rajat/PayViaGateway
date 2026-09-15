<?php
// PayVia Gateway High-Performance API Proxy for Hostinger
$nodeBackend = 'http://127.0.0.1:5001';
$requestUri = $_SERVER['REQUEST_URI'];
$method = $_SERVER['REQUEST_METHOD'];

$targetUrl = $nodeBackend . $requestUri;

// Auto-heal / keep Node.js backend running
$fp = @fsockopen('127.0.0.1', 5001, $errno, $errstr, 0.3);
if (!$fp) {
    $cmd = '/opt/alt/alt-nodejs20/root/usr/bin/node /home/u586615155/domains/payvia360.com/public_html/backend/dist/server.js >> /home/u586615155/domains/payvia360.com/public_html/backend.log 2>&1 &';
    exec($cmd);
    usleep(300000); // 300ms wait
} else {
    fclose($fp);
}

$ch = curl_init($targetUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 30);

// Forward Headers
$forwardHeaders = [];
if (function_exists('getallheaders')) {
    foreach (getallheaders() as $name => $value) {
        if (!in_array(strtolower($name), ['host', 'content-length'])) {
            $forwardHeaders[] = "$name: $value";
        }
    }
}
curl_setopt($ch, CURLOPT_HTTPHEADER, $forwardHeaders);

// Forward Payload
if (in_array($method, ['POST', 'PUT', 'PATCH', 'DELETE'])) {
    $input = file_get_contents('php://input');
    if (!empty($input)) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, $input);
    }
}

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$contentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
$curlError = curl_error($ch);
curl_close($ch);

if ($httpCode && $httpCode > 0) {
    http_response_code($httpCode);
} else {
    http_response_code(200);
}

if ($contentType) {
    header("Content-Type: $contentType");
} else {
    header("Content-Type: application/json");
}

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, x-api-key, x-gateway-signature");

if ($method === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($response !== false) {
    echo $response;
} else {
    echo json_encode([
        'status' => false,
        'error' => 'Gateway core initializing. Please retry in a few seconds.',
        'details' => $curlError
    ]);
}
