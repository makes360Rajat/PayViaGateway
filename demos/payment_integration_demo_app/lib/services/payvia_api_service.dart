import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import '../models/payment_models.dart';

class PayViaApiService {
  static final PayViaApiService _instance = PayViaApiService._internal();
  factory PayViaApiService() => _instance;
  PayViaApiService._internal();

  String baseUrl = 'https://payvia360.com';
  String? _authToken;
  String merchantEmail = 'pankajpanks007@gmail.com';
  String merchantPassword = 'Db@0125';
  String merchantBusinessName = 'Pankaj Enterprises & Tech';

  /// Authenticate merchant and cache token
  Future<String> ensureAuthToken() async {
    if (_authToken != null && _authToken!.isNotEmpty) {
      return _authToken!;
    }

    try {
      final response = await http.post(
        Uri.parse('$baseUrl/api/auth/login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'email': merchantEmail,
          'password': merchantPassword,
        }),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['status'] == true && data['data'] != null) {
          _authToken = data['data']['token'] ?? data['data']['apiKey'];
          if (data['data']['tenant'] != null &&
              data['data']['tenant']['businessName'] != null) {
            merchantBusinessName = data['data']['tenant']['businessName'];
          }
          return _authToken!;
        }
      }
      throw Exception('Login failed: ${response.body}');
    } catch (e) {
      debugPrint('PayVia API Auth Error: $e');
      rethrow;
    }
  }

  /// 1. Create Order & Generate Dynamic Checkout Link
  Future<OrderResponse> createOrder(CreateOrderRequest req) async {
    final token = await ensureAuthToken();
    final url = Uri.parse('$baseUrl/api/orders');

    final response = await http.post(
      url,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
      body: jsonEncode(req.toJson()),
    );

    if (response.statusCode == 200 || response.statusCode == 201) {
      final json = jsonDecode(response.body);
      return OrderResponse.fromJson(json);
    } else {
      throw Exception('Failed to create order [${response.statusCode}]: ${response.body}');
    }
  }

  /// 2. Fetch Live Checkout Details & Dynamic UPI QR
  Future<CheckoutData> fetchCheckoutData(String linkToken) async {
    final url = Uri.parse('$baseUrl/api/checkout/$linkToken');
    final response = await http.get(url);

    if (response.statusCode == 200) {
      final json = jsonDecode(response.body);
      return CheckoutData.fromJson(json);
    } else {
      throw Exception('Failed to fetch checkout [${response.statusCode}]: ${response.body}');
    }
  }

  /// 3. Ingest SMS / UPI Payment Notification to Settle Order
  Future<SettlementResult> settlePaymentViaIngest({
    required String orderId,
    required double amount,
    required String utr,
    required String customerName,
    String upiApp = 'Google Pay',
  }) async {
    final token = await ensureAuthToken();
    final url = Uri.parse('$baseUrl/api/devices/notification-ingest');

    // Construct bank/UPI SMS notification format
    final formattedAmount = amount.toStringAsFixed(2);
    final notificationText =
        'Received Rs. $formattedAmount from $customerName via UPI Ref: $utr on Bank A/c XX8892';

    final body = {
      'appName': upiApp == 'Google Pay'
          ? 'com.google.android.apps.nbu.paisa.user'
          : upiApp == 'PhonePe'
              ? 'com.phonepe.app'
              : 'net.one97.paytm',
      'title': upiApp,
      'text': notificationText,
    };

    final response = await http.post(
      url,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
      body: jsonEncode(body),
    );

    if (response.statusCode == 200) {
      final json = jsonDecode(response.body);
      return SettlementResult.fromJson(json);
    } else {
      throw Exception('Settlement failed [${response.statusCode}]: ${response.body}');
    }
  }

  /// Helper to generate simulated 12-digit UPI UTR
  static String generateUtr() {
    final timestamp = DateTime.now().millisecondsSinceEpoch.toString();
    if (timestamp.length >= 12) {
      return timestamp.substring(timestamp.length - 12);
    }
    return '${DateTime.now().year}${DateTime.now().month.toString().padLeft(2, '0')}${DateTime.now().microsecond.toString().padLeft(6, '0')}';
  }
}
