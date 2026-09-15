import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
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

class _HomeScreenState extends State<HomeScreen> with WidgetsBindingObserver {
  static const MethodChannel _notifChannel = MethodChannel('com.payvia.gateway/notifications');
  static const EventChannel _liveStreamChannel = EventChannel('com.payvia.gateway/live_stream');

  bool _isPaired = false;
  String? _deviceToken;
  String? _pairingCode;
  String _serverUrl = 'https://payvia360.com';
  bool _isOnline = false;
  bool _isNotifAccessGranted = false;
  bool _isBatteryOptIgnored = false;
  Timer? _heartbeatTimer;
  StreamSubscription? _liveStreamSubscription;
  final List<SmsTransaction> _transactions = [];

  // Mode: 0 = Bank SMS, 1 = UPI Push Notification (GPay/PhonePe)
  int _simulatorMode = 1;

  // Simulator Form for SMS
  final _senderController = TextEditingController(text: 'AD-HDFCBK');
  final _messageController = TextEditingController(
    text: 'Dear Customer, your A/c credited with Rs 1.00 on 15-SEP-26 by UPI/419827391823/Ref No.',
  );

  // Simulator Form for Notifications
  final _notifPackageController = TextEditingController(text: 'com.google.android.apps.nbu.paisa.user');
  final _notifTitleController = TextEditingController(text: 'RAHUL paid you ₹1.00');
  final _notifBodyController = TextEditingController(text: 'BYTE17894501153283049');

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _checkPairingStatus();
    _checkPermissions();
    _initLiveStreamListener();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      _checkPermissions();
      _rebindNotificationListener();
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _heartbeatTimer?.cancel();
    _liveStreamSubscription?.cancel();
    _senderController.dispose();
    _messageController.dispose();
    _notifPackageController.dispose();
    _notifTitleController.dispose();
    _notifBodyController.dispose();
    super.dispose();
  }

  void _initLiveStreamListener() {
    try {
      _liveStreamSubscription = _liveStreamChannel.receiveBroadcastStream().listen((dynamic event) {
        if (event is Map) {
          final packageName = (event['packageName'] ?? '').toString();
          final title = (event['title'] ?? '').toString();
          final message = (event['message'] ?? '').toString();
          final isMatched = event['isMatched'] == true;
          final orderId = event['orderId']?.toString();

          // Extract amount for live card display
          double? amt;
          final amtMatch = RegExp(r'(?:₹|Rs\.?|INR)?\s*([\d,]+\.?\d*)').firstMatch(title);
          if (amtMatch != null) {
            amt = double.tryParse(amtMatch.group(1)?.replaceAll(',', '') ?? '');
          }

          final providerName = packageName.contains('paisa')
              ? 'Google Pay (Live)'
              : (packageName.contains('phonepe')
                  ? 'PhonePe (Live)'
                  : (packageName.contains('paytm') ? 'Paytm (Live)' : 'Push Notification (Live)'));

          final txn = SmsTransaction(
            id: DateTime.now().millisecondsSinceEpoch.toString(),
            sender: providerName,
            rawMessage: '[$title] $message',
            amount: amt,
            utr: null,
            bank: 'Auto-Captured Notification',
            timestamp: DateTime.now(),
            isMatched: isMatched,
            matchedOrderId: orderId,
          );

          setState(() {
            _transactions.insert(0, txn);
          });

          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(
                  isMatched
                      ? '⚡ LIVE: Payment matched with Order: $orderId'
                      : '⚡ LIVE: Captured notification from $providerName',
                ),
                backgroundColor: isMatched ? Colors.green.shade700 : Colors.indigo.shade700,
                duration: const Duration(seconds: 4),
              ),
            );
          }
        }
      }, onError: (_) {});
    } catch (_) {}
  }

  Future<void> _checkPermissions() async {
    try {
      final bool notifGranted = await _notifChannel.invokeMethod('isNotificationAccessGranted') ?? false;
      final bool batteryIgnored = await _notifChannel.invokeMethod('isBatteryOptimizationIgnored') ?? false;
      if (mounted) {
        setState(() {
          _isNotifAccessGranted = notifGranted;
          _isBatteryOptIgnored = batteryIgnored;
        });
      }
    } catch (_) {}
  }

  Future<void> _rebindNotificationListener() async {
    try {
      await _notifChannel.invokeMethod('rebindNotificationListener');
    } catch (_) {}
  }

  Future<void> _openNotificationSettings() async {
    try {
      await _notifChannel.invokeMethod('openNotificationAccessSettings');
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Could not open settings: $e')),
        );
      }
    }
  }

  Future<void> _requestIgnoreBatteryOptimization() async {
    try {
      await _notifChannel.invokeMethod('requestIgnoreBatteryOptimization');
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Could not request battery optimization: $e')),
        );
      }
    }
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
                : 'SMS processed (${parsed.amount != null ? '₹${parsed.amount}' : 'No Amount'})',
          ),
          backgroundColor: isMatched ? Colors.green.shade700 : Colors.indigo.shade700,
        ),
      );
    }
  }

  Future<void> _simulateIncomingNotification() async {
    final pkg = _notifPackageController.text.trim();
    final title = _notifTitleController.text.trim();
    final body = _notifBodyController.text.trim();

    if (title.isEmpty) return;

    // Ingest to API Gateway
    final result = await ApiClient.ingestNotification(
      packageName: pkg,
      title: title,
      message: body,
    );

    final isMatched = result['matched'] == true;
    final matchedOrderId = result['orderId'] as String?;

    // Quick parse for UI
    double? amt;
    final amtMatch = RegExp(r'(?:₹|Rs\.?|INR)?\s*([\d,]+\.?\d*)').firstMatch(title);
    if (amtMatch != null) {
      amt = double.tryParse(amtMatch.group(1)?.replaceAll(',', '') ?? '');
    }

    final txn = SmsTransaction(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      sender: pkg.contains('paisa') ? 'Google Pay' : (pkg.contains('phonepe') ? 'PhonePe' : 'Push Notification'),
      rawMessage: '[$title] $body',
      amount: amt,
      utr: null,
      bank: 'UPI Notification',
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
                ? '🎉 Notification auto-matched with Order: $matchedOrderId!'
                : (result['message']?.toString() ?? 'Notification processed'),
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
              'PayVia Auto-Gateway',
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
            // Notification Access Permission Alert Banner
            if (!_isNotifAccessGranted) ...[
              Container(
                margin: const EdgeInsets.only(bottom: 12),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: Colors.amber.shade900.withValues(alpha: 0.3),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.amber.shade500),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.notifications_active, color: Colors.amberAccent, size: 28),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'GPay / PhonePe Notification Access Required',
                            style: GoogleFonts.dmSans(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                              fontSize: 13,
                            ),
                          ),
                          const SizedBox(height: 2),
                          const Text(
                            'To auto-verify UPI push notifications, enable Notification Access for PayVia Companion in Android Settings.',
                            style: TextStyle(color: Colors.white70, fontSize: 11),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.amber.shade600,
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                      onPressed: _openNotificationSettings,
                      child: const Text('Enable', style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold, fontSize: 12)),
                    ),
                  ],
                ),
              ),
            ],

            // Battery Optimization Warning Banner
            if (!_isBatteryOptIgnored) ...[
              Container(
                margin: const EdgeInsets.only(bottom: 16),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: Colors.orange.shade900.withValues(alpha: 0.25),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.orange.shade400.withValues(alpha: 0.6)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.battery_alert, color: Colors.orangeAccent, size: 28),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Disable Battery Optimization (24/7 Mode)',
                            style: GoogleFonts.dmSans(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                              fontSize: 13,
                            ),
                          ),
                          const SizedBox(height: 2),
                          const Text(
                            'Android Doze mode puts network to sleep when screen is locked. Set to "Don\'t Optimize" for uninterrupted verification.',
                            style: TextStyle(color: Colors.white70, fontSize: 11),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.orange.shade600,
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                      onPressed: _requestIgnoreBatteryOptimization,
                      child: const Text('Allow', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12)),
                    ),
                  ],
                ),
              ),
            ],

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
                      Expanded(
                        child: Row(
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
                            Expanded(
                              child: Text(
                                _isPaired
                                    ? (_isOnline ? 'Active Gateway Online' : 'Device Paired (Connecting...)')
                                    : 'Device Not Paired',
                                overflow: TextOverflow.ellipsis,
                                style: GoogleFonts.dmSans(
                                  color: Colors.white,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 12,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                      ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: _isPaired ? Colors.white.withValues(alpha: 0.08) : Colors.indigo.shade600,
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        ),
                        onPressed: () async {
                          await Navigator.push<bool>(
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
                              color: Colors.indigo.shade600.withValues(alpha: 0.3),
                              borderRadius: BorderRadius.circular(4),
                              border: Border.all(color: Colors.indigo.shade400.withValues(alpha: 0.4)),
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

            // Ingestion Simulator Box (Dual Mode: Push Notification vs SMS)
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
                  Wrap(
                    alignment: WrapAlignment.spaceBetween,
                    crossAxisAlignment: WrapCrossAlignment.center,
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      Text(
                        'Gateway Ingest Simulator',
                        style: GoogleFonts.spaceGrotesk(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                          fontSize: 13,
                        ),
                      ),
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          ChoiceChip(
                            visualDensity: VisualDensity.compact,
                            padding: const EdgeInsets.symmetric(horizontal: 4),
                            label: const Text('GPay / Notif', style: TextStyle(fontSize: 10)),
                            selected: _simulatorMode == 1,
                            selectedColor: Colors.indigo.shade600,
                            onSelected: (val) {
                              if (val) setState(() => _simulatorMode = 1);
                            },
                          ),
                          const SizedBox(width: 6),
                          ChoiceChip(
                            visualDensity: VisualDensity.compact,
                            padding: const EdgeInsets.symmetric(horizontal: 4),
                            label: const Text('Bank SMS', style: TextStyle(fontSize: 10)),
                            selected: _simulatorMode == 0,
                            selectedColor: Colors.indigo.shade600,
                            onSelected: (val) {
                              if (val) setState(() => _simulatorMode = 0);
                            },
                          ),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  if (_simulatorMode == 1) ...[
                    // Notification Form
                    TextField(
                      controller: _notifTitleController,
                      style: const TextStyle(color: Colors.white, fontSize: 12),
                      decoration: InputDecoration(
                        labelText: 'Notification Title (e.g. RAHUL paid you ₹1.00)',
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
                      controller: _notifBodyController,
                      style: const TextStyle(color: Colors.white, fontSize: 12),
                      decoration: InputDecoration(
                        labelText: 'Notification Body / Order ID (e.g. BYTE17894501153283049)',
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
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.teal.shade600,
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        ),
                        onPressed: _simulateIncomingNotification,
                        icon: const Icon(Icons.bolt, color: Colors.white, size: 18),
                        label: const Text('Auto-Match Notification →', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                      ),
                    ),
                  ] else ...[
                    // SMS Form
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
                    'No SMS or Notifications captured yet.\nIncoming payments will appear here in real-time.',
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
                          if (txn.matchedOrderId != null)
                            Text(
                              'Order: ${txn.matchedOrderId}',
                              style: GoogleFonts.jetBrainsMono(color: Colors.greenAccent, fontSize: 11, fontWeight: FontWeight.bold),
                            )
                          else if (txn.utr != null)
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
