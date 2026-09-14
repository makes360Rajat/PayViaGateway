class ParsedSmsResult {
  final double? amount;
  final String? utr;
  final String bank;
  final bool isValid;

  ParsedSmsResult({
    this.amount,
    this.utr,
    required this.bank,
    required this.isValid,
  });
}

class SmsParser {
  static final List<Map<String, dynamic>> _patterns = [
    {
      'bank': 'HDFC Bank',
      'sender': RegExp(r'HDFCBK|HDFC', caseSensitive: false),
      'body': RegExp(r'(?:deposited|credited|received)\s+(?:by\s+)?(?:INR|Rs\.?)\s*([\d,]+\.?\d*).*?(?:UPI|Ref|UTR|ref\s*no\.?)\s*[:\-\/]?\s*(\d{12})', caseSensitive: false),
      'amountIdx': 1,
      'utrIdx': 2,
    },
    {
      'bank': 'State Bank of India (SBI)',
      'sender': RegExp(r'SBIINB|SBIPSG|SBIUPI', caseSensitive: false),
      'body': RegExp(r'(?:credited\s+by|received)\s+(?:Rs\.?|INR)\s*([\d,]+\.?\d*).*?(?:Ref\s+No|UTR|ref\s*no\.?)\s*[:\-\/]?\s*(\d{12})', caseSensitive: false),
      'amountIdx': 1,
      'utrIdx': 2,
    },
    {
      'bank': 'ICICI Bank',
      'sender': RegExp(r'ICICIB|ICICI', caseSensitive: false),
      'body': RegExp(r'(?:credited\s+with|received)\s+(?:INR|Rs\.?)\s*([\d,]+\.?\d*).*?(?:UPI|Ref|UTR)\s*[:\-\/]?\s*(\d{12})', caseSensitive: false),
      'amountIdx': 1,
      'utrIdx': 2,
    },
    {
      'bank': 'Axis Bank',
      'sender': RegExp(r'AXISBK|AXIS', caseSensitive: false),
      'body': RegExp(r'(?:credited\s+with|received)\s+(?:INR|Rs\.?)\s*([\d,]+\.?\d*).*?(?:UPI|Ref|UTR)\s*[:\-\/]?\s*(\d{12})', caseSensitive: false),
      'amountIdx': 1,
      'utrIdx': 2,
    },
    {
      'bank': 'Kotak Mahindra Bank',
      'sender': RegExp(r'KOTAKB|KOTAK', caseSensitive: false),
      'body': RegExp(r'(?:credited\s+with|received)\s+(?:INR|Rs\.?)\s*([\d,]+\.?\d*).*?(?:Ref|UTR|reference)\s*[:\-\/]?\s*(\d{12})', caseSensitive: false),
      'amountIdx': 1,
      'utrIdx': 2,
    },
    {
      'bank': 'Paytm Payments Bank',
      'sender': RegExp(r'PAYTMB|PAYTM', caseSensitive: false),
      'body': RegExp(r'(?:credited|received)\s+(?:Rs\.?|INR)\s*([\d,]+\.?\d*).*?(?:UPI\s+Ref|UTR|reference)\s*[:\-\/]?\s*(\d{12})', caseSensitive: false),
      'amountIdx': 1,
      'utrIdx': 2,
    },
    {
      'bank': 'Generic Indian UPI Message',
      'sender': RegExp(r'.*'),
      'body': RegExp(r'(?:credit(?:ed)?|received|deposited)\s+(?:of|by|with)?\s*(?:INR|Rs\.?|₹)\s*([\d,]+\.?\d*).*?(?:ref(?:\s*no)?|utr|txn(?:\s*id)?|upi(?:\s*ref)?)\s*[:\-\/]?\s*(\d{12})', caseSensitive: false),
      'amountIdx': 1,
      'utrIdx': 2,
    }
  ];

  static ParsedSmsResult parse(String sender, String message) {
    for (final pattern in _patterns) {
      final senderReg = pattern['sender'] as RegExp;
      if (senderReg.hasMatch(sender)) {
        final bodyReg = pattern['body'] as RegExp;
        final match = bodyReg.firstMatch(message);
        if (match != null) {
          final rawAmount = match.group(pattern['amountIdx'] as int)?.replaceAll(',', '');
          final amount = double.tryParse(rawAmount ?? '');
          final utr = match.group(pattern['utrIdx'] as int);

          if (amount != null && utr != null && utr.length == 12) {
            return ParsedSmsResult(
              amount: amount,
              utr: utr,
              bank: pattern['bank'] as String,
              isValid: true,
            );
          }
        }
      }
    }

    return ParsedSmsResult(
      bank: 'Unknown',
      isValid: false,
    );
  }
}
