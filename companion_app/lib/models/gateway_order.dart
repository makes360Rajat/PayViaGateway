class GatewayOrder {
  final String id;
  final String orderId;
  final double amount;
  final String currency;
  final String status;
  final String? customerName;
  final String? customerMobile;
  final String? utr;
  final String? provider;
  final String? remark1;
  final String? paymentUrl;
  final DateTime createdAt;
  final DateTime? paidAt;

  GatewayOrder({
    required this.id,
    required this.orderId,
    required this.amount,
    this.currency = 'INR',
    required this.status,
    this.customerName,
    this.customerMobile,
    this.utr,
    this.provider,
    this.remark1,
    this.paymentUrl,
    required this.createdAt,
    this.paidAt,
  });

  bool get isVerified => status == 'TXN_SUCCESS';
  bool get isPending => status == 'PENDING';
  bool get isRejected => status == 'CANCELLED' || status == 'FAILED' || status == 'EXPIRED';

  factory GatewayOrder.fromJson(Map<String, dynamic> json) {
    return GatewayOrder(
      id: (json['id'] ?? '').toString(),
      orderId: (json['orderId'] ?? '').toString(),
      amount: (json['amount'] as num?)?.toDouble() ?? 0.0,
      currency: (json['currency'] ?? 'INR').toString(),
      status: (json['status'] ?? 'PENDING').toString(),
      customerName: json['customerName'] as String?,
      customerMobile: json['customerMobile'] as String?,
      utr: json['utr'] as String?,
      provider: json['provider'] as String?,
      remark1: json['remark1'] as String?,
      paymentUrl: json['paymentUrl'] as String?,
      createdAt: _parseIST(json['createdAt']),
      paidAt: json['paidAt'] != null ? _parseIST(json['paidAt']) : null,
    );
  }

  static DateTime _parseIST(dynamic val) {
    if (val == null) {
      return DateTime.now().toUtc().add(const Duration(hours: 5, minutes: 30));
    }
    final dt = DateTime.tryParse(val.toString().trim());
    if (dt == null) {
      return DateTime.now().toUtc().add(const Duration(hours: 5, minutes: 30));
    }
    // Always convert UTC timestamp to Indian Standard Time (UTC+05:30)
    return dt.toUtc().add(const Duration(hours: 5, minutes: 30));
  }
}
