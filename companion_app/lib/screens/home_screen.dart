import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../models/sms_transaction.dart';
import '../services/api_client.dart';
import '../services/sms_parser.dart';
import 'pairing_screen.dart';
import 'regex_tester_screen.dart';
import 'settings_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  bool _isPaired = false;
  String? _deviceToken;
  String? _pairingCode;
  String _serverUrl = 'http://192.168.1.9:5001';
  bool _isOnline = false;
  Timer? _heartbeatTimer;
  final List<SmsTransaction> _transactions = [];

  // Simulator Form
  final _senderController = TextEditingController(text: 'AD-HDFCBK');
  final _messageController = TextEditingController(
    text: 'Dear Customer, your A/c credited with Rs 499.00 on 11-SEP-26 by UPI/419827391823/Ref No.',
  );

  @override
  void initState() {
    super.initState();
    _checkPairingStatus();
  }

  @override
  void dispose() {
    _heartbeatTimer?.cancel();
    _senderController.dispose();
    _messageController.dispose();
    super.dispose();
  }

  Future<void> _checkPairingStatus() async {
    final token = await ApiClient.getDeviceToken();
    final code = await ApiClient.getPairingCode();
    final url = await ApiClient.getServerUrl();
    if (token != null && token.isNotEmpty) {
      setState(() {
        _isPaired = true;
        _deviceToken = token;
        _pairingCode = code;
        _serverUrl = url;
      });
      _startHeartbeat();
    } else {
      setState(() {
        _isPaired = false;
        _deviceToken = null;
        _pairingCode = code;
        _serverUrl = url;
      });
    }
  }

  void _startHeartbeat() {
    _heartbeatTimer?.cancel();
    _heartbeatTimer = Timer.periodic(const Duration(seconds: 30), (timer) async {
      final success = await ApiClient.sendHeartbeat();
      if (mounted) {
        setState(() {
          _isOnline = success;
        });
      }
    });
    ApiClient.sendHeartbeat().then((s) => setState(() => _isOnline = s));
  }

  Future<void> _simulateIncomingSms() async {
    final sender = _senderController.text.trim();
    final message = _messageController.text.trim();

    if (sender.isEmpty || message.isEmpty) return;

    final parsed = SmsParser.parse(sender, message);
    
    // Ingest to API Gateway
    final result = await ApiClient.ingestSms(
      sender: sender,
      message: message,
    );

    final isMatched = result['matched'] == true;
    final matchedOrderId = result['orderId'] as String?;

    final txn = SmsTransaction(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      sender: sender,
      rawMessage: message,
      amount: parsed.amount,
      utr: parsed.utr,
      bank: parsed.bank,
      timestamp: DateTime.now(),
      isMatched: isMatched,
      matchedOrderId: matchedOrderId,
    );

    setState(() {
      _transactions.insert(0, txn);
    });

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            isMatched
                ? '🎉 Matched with Order: $matchedOrderId'
                : 'Sms processed (${parsed.amount != null ? '₹${parsed.amount}' : 'No Amount'})',
          ),
          backgroundColor: isMatched ? Colors.green.shade700 : Colors.indigo.shade700,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF090D16),
      appBar: AppBar(
        backgroundColor: const Color(0xFF111827),
        elevation: 0,
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: Colors.indigo.shade600,
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.shield_outlined, color: Colors.white, size: 18),
            ),
            const SizedBox(width: 8),
            Text(
              'PayVia SMS Gateway',
              style: GoogleFonts.spaceGrotesk(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: Colors.white,
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.code, color: Colors.indigoAccent),
            tooltip: 'Regex Sandbox',
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const RegexTesterScreen()),
              );
            },
          ),
          IconButton(
            icon: const Icon(Icons.settings, color: Colors.white70),
            onPressed: () async {
              await Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const SettingsScreen()),
              );
              _checkPairingStatus();
            },
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Status Card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFF111827),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: _isPaired ? Colors.indigo.shade500 : Colors.amber.shade500,
                ),
              ),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          Container(
                            height: 10,
                            width: 10,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: _isOnline ? Colors.greenAccent : Colors.amber,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            _isPaired
                                ? (_isOnline ? 'Active Gateway Online' : 'Device Paired (Connecting...)')
                                : 'Device Not Paired',
                            style: GoogleFonts.dmSans(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                              fontSize: 13,
                            ),
                          ),
                        ],
                      ),
                      ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: _isPaired ? Colors.white.withOpacity(0.08) : Colors.indigo.shade600,
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        ),
                        onPressed: () async {
                          final paired = await Navigator.push<bool>(
                            context,
                            MaterialPageRoute(builder: (_) => const PairingScreen()),
                          );
                          _checkPairingStatus();
                        },
                        icon: const Icon(Icons.qr_code, size: 14, color: Colors.white),
                        label: Text(
                          _isPaired ? 'Pair / Change ID' : 'Pair Device',
                          style: const TextStyle(fontSize: 11, color: Colors.white, fontWeight: FontWeight.bold),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  // Server IP Indicator
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: Colors.black45,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: Colors.white10),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.dns, size: 14, color: Colors.tealAccent),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Text(
                            'Server: $_serverUrl',
                            style: GoogleFonts.jetBrainsMono(color: Colors.white70, fontSize: 11),
                          ),
                        ),
                        if (_pairingCode != null) ...[
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: Colors.indigo.shade600.withOpacity(0.3),
                              borderRadius: BorderRadius.circular(4),
                              border: Border.all(color: Colors.indigo.shade400.withOpacity(0.4)),
                            ),
                            child: Text(
                              _pairingCode!,
                              style: GoogleFonts.jetBrainsMono(
                                color: Colors.amberAccent,
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                  if (_isPaired && _deviceToken != null) ...[
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(
                        color: Colors.black45,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.key, size: 14, color: Colors.indigoAccent),
                          const SizedBox(width: 6),
                          Expanded(
                            child: Text(
                              'Token: ${_deviceToken!.length > 16 ? _deviceToken!.substring(0, 16) : _deviceToken}...',
                              style: GoogleFonts.jetBrainsMono(color: Colors.white70, fontSize: 11),
                            ),
                          ),
                          InkWell(
                            onTap: () async {
                              await ApiClient.disconnectDevice();
                              _checkPairingStatus();
                            },
                            child: const Text(
                              'Disconnect',
                              style: TextStyle(color: Colors.redAccent, fontSize: 11, fontWeight: FontWeight.bold),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ],
              ),
            ),

            const SizedBox(height: 16),

            // SMS Simulator Box
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFF111827),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.white10),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Simulate Bank SMS Ingestion',
                        style: GoogleFonts.spaceGrotesk(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                          fontSize: 13,
                        ),
                      ),
                      const Icon(Icons.flash_on, color: Colors.amber, size: 16),
                    ],
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _senderController,
                    style: const TextStyle(color: Colors.white, fontSize: 12),
                    decoration: InputDecoration(
                      labelText: 'Sender Header (e.g. AD-HDFCBK)',
                      labelStyle: const TextStyle(color: Colors.white60, fontSize: 11),
                      filled: true,
                      fillColor: const Color(0xFF090D16),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                        borderSide: BorderSide.none,
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _messageController,
                    maxLines: 2,
                    style: const TextStyle(color: Colors.white, fontSize: 12),
                    decoration: InputDecoration(
                      labelText: 'Raw Bank SMS Message',
                      labelStyle: const TextStyle(color: Colors.white60, fontSize: 11),
                      filled: true,
                      fillColor: const Color(0xFF090D16),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                        borderSide: BorderSide.none,
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.indigo.shade600,
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                      onPressed: _simulateIncomingSms,
                      child: const Text('Parse & Push to Gateway →', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 16),

            // Live Activity Stream
            Text(
              'Captured Transaction Stream',
              style: GoogleFonts.spaceGrotesk(
                color: Colors.white,
                fontWeight: FontWeight.bold,
                fontSize: 14,
              ),
            ),
            const SizedBox(height: 8),

            if (_transactions.isEmpty)
              Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: const Color(0xFF111827),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: const Center(
                  child: Text(
                    'No SMS captured yet.\nIncoming bank credit SMS will appear here in real-time.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: Colors.white54, fontSize: 12),
                  ),
                ),
              )
            else
              ListView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: _transactions.length,
                itemBuilder: (context, index) {
                  final txn = _transactions[index];
                  return Card(
                    color: const Color(0xFF111827),
                    margin: const EdgeInsets.only(bottom: 8),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                      side: BorderSide(
                        color: txn.isMatched ? Colors.green.shade500 : Colors.white10,
                      ),
                    ),
                    child: ListTile(
                      title: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            txn.bank ?? txn.sender,
                            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12),
                          ),
                          if (txn.amount != null)
                            Text(
                              '₹${txn.amount!.toStringAsFixed(2)}',
                              style: const TextStyle(color: Colors.greenAccent, fontWeight: FontWeight.bold, fontSize: 13),
                            ),
                        ],
                      ),
                      subtitle: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const SizedBox(height: 4),
                          if (txn.utr != null)
                            Text(
                              'UTR: ${txn.utr}',
                              style: GoogleFonts.jetBrainsMono(color: Colors.indigoAccent, fontSize: 11),
                            ),
                          const SizedBox(height: 2),
                          Text(
                            txn.rawMessage,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(color: Colors.white60, fontSize: 10),
                          ),
                        ],
                      ),
                      trailing: txn.isMatched
                          ? const Icon(Icons.check_circle, color: Colors.greenAccent, size: 20)
                          : const Icon(Icons.sync, color: Colors.white38, size: 20),
                    ),
                  );
                },
              ),
          ],
        ),
      ),
    );
  }
}
