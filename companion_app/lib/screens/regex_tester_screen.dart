import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../services/sms_parser.dart';

class RegexTesterScreen extends StatefulWidget {
  const RegexTesterScreen({super.key});

  @override
  State<RegexTesterScreen> createState() => _RegexTesterScreenState();
}

class _RegexTesterScreenState extends State<RegexTesterScreen> {
  final _senderController = TextEditingController(text: 'VK-SBIINB');
  final _bodyController = TextEditingController(
    text: 'Your A/C 9812 credited by Rs 1499.50 on 11Sep26 transfer from UPI Ref No 419827391899.',
  );
  ParsedSmsResult? _result;

  @override
  void initState() {
    super.initState();
    _testParse();
  }

  void _testParse() {
    setState(() {
      _result = SmsParser.parse(
        _senderController.text.trim(),
        _bodyController.text.trim(),
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF090D16),
      appBar: AppBar(
        backgroundColor: const Color(0xFF111827),
        title: Text(
          'Bank SMS Regex Sandbox',
          style: GoogleFonts.spaceGrotesk(color: Colors.white, fontWeight: FontWeight.bold),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              'Test Indian Bank SMS Patterns',
              style: GoogleFonts.spaceGrotesk(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
            ),
            const SizedBox(height: 6),
            const Text(
              'Paste any incoming bank credit SMS below to test real-time parsing of Amount, 12-digit UTR, and Bank identification.',
              style: TextStyle(color: Colors.white60, fontSize: 12),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _senderController,
              onChanged: (_) => _testParse(),
              style: const TextStyle(color: Colors.white, fontSize: 12),
              decoration: InputDecoration(
                labelText: 'Sender (e.g. AD-HDFCBK, VK-SBIINB, BP-ICICIB)',
                labelStyle: const TextStyle(color: Colors.white60),
                filled: true,
                fillColor: const Color(0xFF111827),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _bodyController,
              onChanged: (_) => _testParse(),
              maxLines: 4,
              style: const TextStyle(color: Colors.white, fontSize: 12),
              decoration: InputDecoration(
                labelText: 'SMS Body Text',
                labelStyle: const TextStyle(color: Colors.white60),
                filled: true,
                fillColor: const Color(0xFF111827),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
              ),
            ),
            const SizedBox(height: 20),
            if (_result != null)
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFF111827),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: _result!.isValid ? Colors.green.shade500 : Colors.red.shade500,
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(
                          _result!.isValid ? Icons.check_circle : Icons.error_outline,
                          color: _result!.isValid ? Colors.greenAccent : Colors.redAccent,
                        ),
                        const SizedBox(width: 8),
                        Text(
                          _result!.isValid ? 'Valid Bank Payment SMS' : 'Could Not Parse Valid Amount/UTR',
                          style: TextStyle(
                            color: _result!.isValid ? Colors.greenAccent : Colors.redAccent,
                            fontWeight: FontWeight.bold,
                            fontSize: 13,
                          ),
                        ),
                      ],
                    ),
                    const Divider(color: Colors.white10, height: 24),
                    _buildRow('Detected Bank:', _result!.bank),
                    _buildRow('Extracted Amount:', _result!.amount != null ? '₹${_result!.amount!.toStringAsFixed(2)}' : 'None'),
                    _buildRow('Extracted 12-Digit UTR:', _result!.utr ?? 'None'),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: Colors.white54, fontSize: 12)),
          Text(value, style: GoogleFonts.jetBrainsMono(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12)),
        ],
      ),
    );
  }
}
