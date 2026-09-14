/// PayViaGateway A-to-Z Dart Client Integration Demo
/// 
/// This script demonstrates how to integrate PayViaGateway from a Dart / Flutter application:
/// 1. Creating a payment order with custom amounts and remarks.
/// 2. Polling order settlement status in real-time.
/// 3. Verifying webhook payloads using HMAC-SHA256 signatures.

import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:crypto/crypto.dart';

class PayViaGatewayClient {
  final String baseUrl;
  final String apiKey;
  final String webhookSecret;

  PayViaGatewayClient({
    required this.baseUrl,
    required this.apiKey,
    required this.webhookSecret,
  });

  /// 1. Create a Payment Order
  Future<Map<String, dynamic>> createOrder({
    required double amount,
    required String customerName,
    required String customerMobile,
    required String remark1,
    required String returnUrl,
    String templateId = 'template_1',
  }) async {
    final url = Uri.parse('$baseUrl/api/public/v1/order/create');
    
    final response = await http.post(
      url,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: jsonEncode({
        'amount': amount,
        'customer_name': customerName,
        'customer_mobile': customerMobile,
        'remark1': remark1,
        'return_url': returnUrl,
        'template': templateId,
      }),
    );

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw HttpException('Failed to create order: ${response.body}');
    }
  }

  /// 2. Check Order Status
  Future<Map<String, dynamic>> checkOrderStatus(String orderId) async {
    final url = Uri.parse('$baseUrl/api/public/v1/order/status/$orderId');

    final response = await http.get(
      url,
      headers: {'x-api-key': apiKey},
    );

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw HttpException('Failed to fetch status: ${response.body}');
    }
  }

  /// 3. Verify Webhook Signature (HMAC-SHA256)
  bool verifyWebhookSignature(String rawBody, String signatureHeader) {
    final key = utf8.encode(webhookSecret);
    final bytes = utf8.encode(rawBody);
    final hmac = Hmac(sha256, key);
    final digest = hmac.convert(bytes);
    final expectedSignature = 'sha256=$digest';

    return expectedSignature == signatureHeader;
  }
}

/// Example usage
void main() async {
  print('=== PayViaGateway Dart Client Demo ===');

  final client = PayViaGatewayClient(
    baseUrl: 'https://payvia360.com',
    apiKey: 'pv_live_8f91a2b3c4d5e6f7a8b9c0d1e2f3a4b5',
    webhookSecret: 'YOUR_WEBHOOK_SECRET',
  );

  try {
    print('\n[1] Creating payment order for ₹999.00...');
    final orderRes = await client.createOrder(
      amount: 999.00,
      customerName: 'Amit Patel',
      customerMobile: '9876543210',
      remark1: 'Order #9921',
      returnUrl: 'https://mystore.com/checkout/success',
    );

    print('Order Created Successfully!');
    print('Order ID: ${orderRes['data']['order_id']}');
    print('Payment Link: ${orderRes['data']['payment_url']}');

    final orderId = orderRes['data']['order_id'];

    print('\n[2] Polling payment status for $orderId...');
    for (int i = 0; i < 3; i++) {
      await Future.delayed(Duration(seconds: 2));
      final statusRes = await client.checkOrderStatus(orderId);
      print('Poll #${i + 1} Status: ${statusRes['data']['status']}');
    }

  } catch (e) {
    print('Error: $e');
  }
}
