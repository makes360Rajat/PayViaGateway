<?php
/**
 * PayVia Payment Gateway PHP SDK
 * Version 1.0.0
 */

class PayVia {
    private string $baseUrl;
    private string $apiKey;
    private int $timeout;

    public function __construct(string $baseUrl, string $apiKey, int $timeout = 15) {
        $this->baseUrl = rtrim($baseUrl, '/');
        $this->apiKey = $apiKey;
        $this->timeout = $timeout;
    }

    /**
     * Create a new payment request and get hosted pay link
     */
    public function createOrder(array $params): array {
        $endpoint = $this->baseUrl . '/api/public/v1/order/create';
        $response = $this->makeRequest('POST', $endpoint, $params);

        if (!isset($response['status']) || $response['status'] !== true) {
            throw new Exception($response['error'] ?? 'Failed to create payment order');
        }

        return $response['data'];
    }

    /**
     * Check status of an existing order
     */
    public function getOrderStatus(string $orderId): array {
        $endpoint = $this->baseUrl . '/api/public/v1/order/status';
        $response = $this->makeRequest('POST', $endpoint, ['order_id' => $orderId]);

        if (!isset($response['status']) || $response['status'] !== true) {
            throw new Exception($response['error'] ?? 'Order not found or error fetching status');
        }

        return $response['data'];
    }

    /**
     * Check if an order has reached terminal success state
     */
    public function isPaid(string $orderId): bool {
        try {
            $status = $this->getOrderStatus($orderId);
            return isset($status['txn_status']) && $status['txn_status'] === 'TXN_SUCCESS';
        } catch (Exception $e) {
            return false;
        }
    }

    /**
     * Verify incoming HMAC-SHA256 Webhook signature
     */
    public static function verifyWebhook(string $rawPayload, string $signatureHeader, string $webhookSecret): bool {
        $expectedSignature = 'sha256=' . hash_hmac('sha256', $rawPayload, $webhookSecret);
        return hash_equals($expectedSignature, $signatureHeader);
    }

    private function makeRequest(string $method, string $url, array $data = []): array {
        $ch = curl_init();

        $headers = [
            'x-api-key: ' . $this->apiKey,
            'Content-Type: application/json',
            'User-Agent: PayVia-PHP-SDK/1.0'
        ];

        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, $this->timeout);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

        if ($method === 'POST') {
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        }

        $result = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        if ($error) {
            throw new Exception("cURL Error: " . $error);
        }

        $decoded = json_decode($result, true);
        if ($decoded === null) {
            throw new Exception("Invalid JSON response from gateway (HTTP $httpCode): " . $result);
        }

        return $decoded;
    }
}
