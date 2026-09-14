class SmsTransaction {
  final String id;
  final String sender;
  final String rawMessage;
  final double? amount;
  final String? utr;
  final String? bank;
  final DateTime timestamp;
  final bool isMatched;
  final String? matchedOrderId;

  SmsTransaction({
    required this.id,
    required this.sender,
    required this.rawMessage,
    this.amount,
    this.utr,
    this.bank,
    required this.timestamp,
    this.isMatched = false,
    this.matchedOrderId,
  });

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'sender': sender,
      'rawMessage': rawMessage,
      'amount': amount,
      'utr': utr,
      'bank': bank,
      'timestamp': timestamp.toIso8601String(),
      'isMatched': isMatched,
      'matchedOrderId': matchedOrderId,
    };
  }

  factory SmsTransaction.fromJson(Map<String, dynamic> json) {
    return SmsTransaction(
      id: json['id'] as String,
      sender: json['sender'] as String,
      rawMessage: json['rawMessage'] as String,
      amount: (json['amount'] as num?)?.toDouble(),
      utr: json['utr'] as String?,
      bank: json['bank'] as String?,
      timestamp: DateTime.parse(json['timestamp'] as String),
      isMatched: json['isMatched'] as bool? ?? false,
      matchedOrderId: json['matchedOrderId'] as String?,
    );
  }
}
