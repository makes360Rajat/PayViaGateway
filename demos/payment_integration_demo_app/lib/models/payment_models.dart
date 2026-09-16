import 'dart:typed_data';

/// Order creation request payload
class CreateOrderRequest {
  final double amount;
  final String customerName;
  final String customerMobile;
  final String remark1;
  final String returnUrl;

  CreateOrderRequest({
    required this.amount,
    required this.customerName,
    required this.customerMobile,
    required this.remark1,
    this.returnUrl = 'https://payvia360.com/demo/success',
  });

  Map<String, dynamic> toJson() => {
        'amount': amount,
        'customer_name': customerName,
        'customer_mobile': customerMobile,
        'remark1': remark1,
        'return_url': returnUrl,
      };
}

/// Order creation response from PayVia360
class OrderResponse {
  final bool status;
  final String message;
  final String orderId;
  final String linkToken;
  final String paymentUrl;
  final double amount;
  final String orderStatus;
  final DateTime? expiresAt;

  OrderResponse({
    required this.status,
    required this.message,
    required this.orderId,
    required this.linkToken,
    required this.paymentUrl,
    required this.amount,
    required this.orderStatus,
    this.expiresAt,
  });

  factory OrderResponse.fromJson(Map<String, dynamic> json) {
    final data = json['data'] ?? json;
    return OrderResponse(
      status: json['status'] == true,
      message: json['message'] ?? 'Success',
      orderId: data['orderId'] ?? data['order_id'] ?? '',
      linkToken: data['linkToken'] ?? data['link_token'] ?? '',
      paymentUrl: data['paymentUrl'] ?? data['payment_url'] ?? '',
      amount: (data['amount'] as num?)?.toDouble() ?? 0.0,
      orderStatus: data['status'] ?? 'PENDING',
      expiresAt: data['expiresAt'] != null
          ? DateTime.tryParse(data['expiresAt'])
          : null,
    );
  }
}

/// Dynamic Checkout & Live QR details
class CheckoutData {
  final String orderId;
  final double amount;
  final String status;
  final String upiId;
  final String merchantName;
  final String upiIntentUrl;
  final DateTime? expiresAt;
  final DateTime? paidAt;
  final String? utr;

  CheckoutData({
    required this.orderId,
    required this.amount,
    required this.status,
    required this.upiId,
    required this.merchantName,
    required this.upiIntentUrl,
    this.expiresAt,
    this.paidAt,
    this.utr,
  });

  bool get isPaid => status == 'TXN_SUCCESS' || status == 'PAID' || status == 'SUCCESS';
  bool get isExpired => status == 'EXPIRED' || (expiresAt != null && DateTime.now().isAfter(expiresAt!));

  factory CheckoutData.fromJson(Map<String, dynamic> json) {
    final data = json['data'] ?? json;
    return CheckoutData(
      orderId: data['orderId'] ?? data['order_id'] ?? '',
      amount: (data['amount'] as num?)?.toDouble() ?? 0.0,
      status: data['status'] ?? 'PENDING',
      upiId: data['upiId'] ?? data['upi_id'] ?? 'payvia.merchant@upi',
      merchantName: data['merchantName'] ?? data['merchant_name'] ?? 'PayVia Verified Merchant',
      upiIntentUrl: data['upiIntentUrl'] ?? data['upi_intent_url'] ?? '',
      expiresAt: data['expiresAt'] != null ? DateTime.tryParse(data['expiresAt']) : null,
      paidAt: data['paidAt'] != null ? DateTime.tryParse(data['paidAt']) : null,
      utr: data['utr'],
    );
  }
}

/// Model representing a captured QR Screenshot in the demo app
class CapturedScreenshot {
  final String id;
  final String orderId;
  final double amount;
  final String upiId;
  final String merchantName;
  final String upiIntentUrl;
  final DateTime capturedAt;
  final Uint8List? imageBytes;
  final String customerName;

  CapturedScreenshot({
    required this.id,
    required this.orderId,
    required this.amount,
    required this.upiId,
    required this.merchantName,
    required this.upiIntentUrl,
    required this.capturedAt,
    required this.customerName,
    this.imageBytes,
  });
}

/// Ingest & Settlement Result
class SettlementResult {
  final bool status;
  final bool matched;
  final String orderId;
  final double parsedAmount;
  final String parsedUtr;
  final String? message;

  SettlementResult({
    required this.status,
    required this.matched,
    required this.orderId,
    required this.parsedAmount,
    required this.parsedUtr,
    this.message,
  });

  factory SettlementResult.fromJson(Map<String, dynamic> json) {
    return SettlementResult(
      status: json['status'] == true,
      matched: json['matched'] == true,
      orderId: json['orderId'] ?? '',
      parsedAmount: (json['parsedAmount'] as num?)?.toDouble() ?? 0.0,
      parsedUtr: json['parsedUtr'] ?? '',
      message: json['message'],
    );
  }
}
