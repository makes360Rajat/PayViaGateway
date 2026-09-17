import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../models/gateway_order.dart';
import '../models/sms_transaction.dart';
import '../services/api_client.dart';
import 'pairing_screen.dart';
import 'simulator_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> with WidgetsBindingObserver {
  static const MethodChannel _notifChannel = MethodChannel('com.payvia.gateway/notifications');
  static const EventChannel _liveStreamChannel = EventChannel('com.payvia.gateway/live_stream');

  bool _isPaired = false;
  String? _pairingCode;
  String _serverUrl = 'https://payvia360.com';
  bool _isOnline = false;
  bool _isNotifAccessGranted = false;
  bool _isBatteryOptIgnored = false;
  int _batteryLevel = 100;
  Timer? _heartbeatTimer;
  StreamSubscription? _liveStreamSubscription;
  final List<SmsTransaction> _transactions = [];

  // Orders List State (Connected Admin Orders)
  final ScrollController _scrollController = ScrollController();
  List<GatewayOrder> _orders = [];
  bool _isLoadingOrders = false;
  bool _isLoadingMore = false;
  bool _hasMoreOrders = true;
  String _selectedOrderTab = 'ALL'; // 'ALL', 'VERIFIED', 'PENDING', 'REJECTED', 'LIVE'
  static const int _orderLimit = 15;
  int _totalOrders = 0;
  int _countAll = 0;
  int _countVerified = 0;
  int _countPending = 0;
  int _countRejected = 0;
  Timer? _ordersPollTimer;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _scrollController.addListener(_onScroll);
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
    _scrollController.dispose();
    _heartbeatTimer?.cancel();
    _ordersPollTimer?.cancel();
    _liveStreamSubscription?.cancel();
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

          if (isMatched) {
            _loadOrders(showLoading: false);
          }
        }
      }, onError: (_) {});
    } catch (_) {}
  }

  Future<void> _checkPermissions() async {
    try {
      final bool notifGranted = await _notifChannel.invokeMethod('isNotificationAccessGranted') ?? false;
      final bool batteryIgnored = await _notifChannel.invokeMethod('isBatteryOptimizationIgnored') ?? false;
      final int battery = await ApiClient.getBatteryLevel();
      if (mounted) {
        setState(() {
          _isNotifAccessGranted = notifGranted;
          _isBatteryOptIgnored = batteryIgnored;
          _batteryLevel = battery;
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
    final battery = await ApiClient.getBatteryLevel();
    if (token != null && token.isNotEmpty) {
      setState(() {
        _isPaired = true;
        _pairingCode = code;
        _serverUrl = url;
        _batteryLevel = battery;
      });
      _startHeartbeat();
      _startOrdersPoll();
    } else {
      _ordersPollTimer?.cancel();
      setState(() {
        _isPaired = false;
        _pairingCode = code;
        _serverUrl = url;
        _batteryLevel = battery;
        _orders = [];
      });
    }
  }

  void _startHeartbeat() {
    _heartbeatTimer?.cancel();
    _heartbeatTimer = Timer.periodic(const Duration(seconds: 30), (timer) async {
      final success = await ApiClient.sendHeartbeat();
      final battery = await ApiClient.getBatteryLevel();
      if (mounted) {
        setState(() {
          _isOnline = success;
          _batteryLevel = battery;
        });
      }
    });
    ApiClient.sendHeartbeat().then((s) async {
      final battery = await ApiClient.getBatteryLevel();
      if (mounted) {
        setState(() {
          _isOnline = s;
          _batteryLevel = battery;
        });
      }
    });
  }

  void _startOrdersPoll() {
    _ordersPollTimer?.cancel();
    if (!_isPaired) return;
    _loadOrders(showLoading: _orders.isEmpty, reset: true);
    _ordersPollTimer = Timer.periodic(const Duration(seconds: 8), (timer) {
      if (_isPaired && mounted) {
        _loadOrders(showLoading: false, reset: false);
      }
    });
  }

  void _onScroll() {
    if (!_scrollController.hasClients) return;
    final maxScroll = _scrollController.position.maxScrollExtent;
    final currentScroll = _scrollController.position.pixels;
    if (currentScroll >= maxScroll - 200 &&
        !_isLoadingMore &&
        _hasMoreOrders &&
        !_isLoadingOrders &&
        _selectedOrderTab != 'LIVE') {
      _loadMoreOrders();
    }
  }

  Future<void> _loadMoreOrders() async {
    if (!_isPaired || _isLoadingMore || !_hasMoreOrders) return;
    if (_orders.length >= _totalOrders) {
      setState(() => _hasMoreOrders = false);
      return;
    }

    setState(() => _isLoadingMore = true);

    try {
      final res = await ApiClient.fetchOrders(
        status: _selectedOrderTab,
        limit: _orderLimit,
        offset: _orders.length,
      );

      if (!mounted) return;

      if (res['status'] == true) {
        final List rawOrders = (res['orders'] as List?) ?? (res['data'] as List?) ?? [];
        final nextBatch = rawOrders.map((o) => GatewayOrder.fromJson(Map<String, dynamic>.from(o))).toList();
        final counts = res['counts'] as Map<String, dynamic>? ?? {};
        final pagination = res['pagination'] as Map<String, dynamic>? ?? {};
        final total = (pagination['total'] as num?)?.toInt() ?? (res['total'] as num?)?.toInt() ?? _totalOrders;

        setState(() {
          _orders.addAll(nextBatch);
          _countAll = (counts['all'] as num?)?.toInt() ?? _countAll;
          _countVerified = (counts['verified'] as num?)?.toInt() ?? _countVerified;
          _countPending = (counts['pending'] as num?)?.toInt() ?? _countPending;
          _countRejected = (counts['rejected'] as num?)?.toInt() ?? _countRejected;
          _totalOrders = total;
          _hasMoreOrders = _orders.length < _totalOrders && nextBatch.isNotEmpty;
          _isLoadingMore = false;
        });
      } else {
        setState(() => _isLoadingMore = false);
      }
    } catch (_) {
      if (mounted) setState(() => _isLoadingMore = false);
    }
  }

  Future<void> _loadOrders({bool showLoading = true, bool reset = true}) async {
    if (!_isPaired) return;
    if (showLoading && mounted) {
      setState(() {
        _isLoadingOrders = true;
      });
    }

    try {
      final fetchLimit = reset ? _orderLimit : (_orders.length > _orderLimit ? _orders.length : _orderLimit);
      final res = await ApiClient.fetchOrders(
        status: _selectedOrderTab,
        limit: fetchLimit,
        offset: 0,
      );

      if (!mounted) return;

      if (res['status'] == true) {
        final List rawOrders = (res['orders'] as List?) ?? (res['data'] as List?) ?? [];
        final parsed = rawOrders.map((o) => GatewayOrder.fromJson(Map<String, dynamic>.from(o))).toList();
        final counts = res['counts'] as Map<String, dynamic>? ?? {};
        final pagination = res['pagination'] as Map<String, dynamic>? ?? {};
        final total = (pagination['total'] as num?)?.toInt() ?? (res['total'] as num?)?.toInt() ?? 0;

        setState(() {
          _orders = parsed;
          _countAll = (counts['all'] as num?)?.toInt() ?? _countAll;
          _countVerified = (counts['verified'] as num?)?.toInt() ?? _countVerified;
          _countPending = (counts['pending'] as num?)?.toInt() ?? _countPending;
          _countRejected = (counts['rejected'] as num?)?.toInt() ?? _countRejected;
          _totalOrders = total;
          _hasMoreOrders = _orders.length < total;
          _isLoadingOrders = false;
        });
      } else {
        if (mounted) {
          setState(() {
            _isLoadingOrders = false;
          });
        }
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _isLoadingOrders = false;
        });
      }
    }
  }

  Future<void> _showSettleOrderDialog(GatewayOrder order) async {
    final utrController = TextEditingController();
    final bool? confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF111827),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: Color(0xFF10B981), width: 1.2),
        ),
        title: Row(
          children: [
            const Icon(Icons.verified_rounded, color: Color(0xFF10B981), size: 22),
            const SizedBox(width: 8),
            Text(
              'Manual Settlement',
              style: GoogleFonts.spaceGrotesk(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Mark this order as settled and verified?',
              style: GoogleFonts.dmSans(color: Colors.white70, fontSize: 13),
            ),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.05),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: Colors.white10),
              ),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Order ID:', style: GoogleFonts.dmSans(color: Colors.white54, fontSize: 12)),
                      Text(order.orderId, style: GoogleFonts.jetBrainsMono(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12)),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Amount:', style: GoogleFonts.dmSans(color: Colors.white54, fontSize: 12)),
                      Text('₹${order.amount.toStringAsFixed(2)}', style: GoogleFonts.spaceGrotesk(color: const Color(0xFF10B981), fontWeight: FontWeight.bold, fontSize: 14)),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),
            TextField(
              controller: utrController,
              style: GoogleFonts.jetBrainsMono(color: Colors.white, fontSize: 13),
              decoration: InputDecoration(
                labelText: 'Bank Reference / UTR (Optional)',
                labelStyle: GoogleFonts.dmSans(color: Colors.white60, fontSize: 12),
                hintText: 'e.g. 419827391823',
                hintStyle: GoogleFonts.jetBrainsMono(color: Colors.white30, fontSize: 12),
                filled: true,
                fillColor: const Color(0xFF090D16),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
                prefixIcon: const Icon(Icons.tag_rounded, color: Colors.white54, size: 18),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: Text('Dismiss', style: GoogleFonts.dmSans(color: Colors.white60)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF10B981),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            onPressed: () => Navigator.pop(ctx, true),
            child: Text('Confirm Settle', style: GoogleFonts.dmSans(fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );

    if (confirm == true) {
      final res = await ApiClient.settleOrder(order.id, utr: utrController.text.trim());
      if (!mounted) return;
      if (res['status'] == true) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('✅ Order ${order.orderId} successfully verified & settled!'),
            backgroundColor: const Color(0xFF10B981),
          ),
        );
        _loadOrders(showLoading: false);
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed: ${res['error'] ?? 'Could not settle order'}'),
            backgroundColor: Colors.redAccent,
          ),
        );
      }
    }
  }

  Future<void> _showCancelOrderDialog(GatewayOrder order) async {
    final bool? confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF111827),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: Colors.redAccent, width: 1.2),
        ),
        title: Row(
          children: [
            const Icon(Icons.cancel_outlined, color: Colors.redAccent, size: 22),
            const SizedBox(width: 8),
            Text(
              'Cancel / Reject Order',
              style: GoogleFonts.spaceGrotesk(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
            ),
          ],
        ),
        content: Text(
          'Are you sure you want to cancel Order ${order.orderId} of ₹${order.amount.toStringAsFixed(2)}? This action cannot be undone.',
          style: GoogleFonts.dmSans(color: Colors.white70, fontSize: 13),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: Text('No, Keep', style: GoogleFonts.dmSans(color: Colors.white60)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.redAccent.shade700,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            onPressed: () => Navigator.pop(ctx, true),
            child: Text('Yes, Cancel', style: GoogleFonts.dmSans(fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );

    if (confirm == true) {
      final res = await ApiClient.cancelOrder(order.id);
      if (!mounted) return;
      if (res['status'] == true) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Order ${order.orderId} cancelled.'),
            backgroundColor: Colors.redAccent.shade700,
          ),
        );
        _loadOrders(showLoading: false);
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed: ${res['error'] ?? 'Could not cancel order'}'),
            backgroundColor: Colors.redAccent,
          ),
        );
      }
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
              'PayVia',
              style: GoogleFonts.spaceGrotesk(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: Colors.white,
              ),
            ),
          ],
        ),
        actions: [
          // Simulator Button on Top
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 10),
            child: GestureDetector(
              onTap: () async {
                final matched = await Navigator.push<bool>(
                  context,
                  MaterialPageRoute(builder: (_) => const SimulatorScreen()),
                );
                if (matched == true) {
                  _loadOrders(showLoading: false);
                }
              },
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: const Color(0xFF6366F1).withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: const Color(0xFF818CF8).withValues(alpha: 0.5)),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.bolt_rounded, size: 14, color: Color(0xFF818CF8)),
                    const SizedBox(width: 4),
                    Text(
                      'Simulator',
                      style: GoogleFonts.spaceGrotesk(
                        color: const Color(0xFF818CF8),
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(width: 6),
          // Prominent Pair Button on Top
          Padding(
            padding: const EdgeInsets.only(top: 10, bottom: 10, right: 12),
            child: GestureDetector(
              onTap: () async {
                final result = await Navigator.push<bool>(
                  context,
                  MaterialPageRoute(builder: (_) => const PairingScreen()),
                );
                if (result == true) {
                  _checkPairingStatus();
                }
              },
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF0099FF), Color(0xFF6366F1)],
                  ),
                  borderRadius: BorderRadius.circular(10),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF0099FF).withValues(alpha: 0.4),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.qr_code_scanner_rounded, size: 14, color: Colors.white),
                    const SizedBox(width: 5),
                    Text(
                      _isPaired ? 'Paired' : 'Pair Device',
                      style: GoogleFonts.spaceGrotesk(
                        color: Colors.white,
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
         /* IconButton(
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
          ),*/
        ],
      ),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Top Notification Access Permission Alert Banner (if not granted)
          if (!_isNotifAccessGranted) _buildCompactNotifBanner(),

          // Top Battery Optimization Warning Banner (if not ignored)
          if (!_isBatteryOptIgnored) _buildCompactBatteryBanner(),

          if (!_isPaired)
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(16),
                child: _buildPairPrompt(),
              ),
            )
          else ...[
            // Fixed / Pinned Tabs Header: Title + Battery/Refresh + Horizontal Tab Chips
            _buildTabsHeader(),

            // Scrollable Content (Orders or Live Stream) that scrolls smoothly UNDER the pinned tabs!
            Expanded(
              child: _buildScrollableContent(),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildCompactNotifBanner() {
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 8, 16, 0),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.amber.shade900.withValues(alpha: 0.25),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: Colors.amber.shade500.withValues(alpha: 0.6)),
      ),
      child: Row(
        children: [
          const Icon(Icons.notifications_active, color: Colors.amberAccent, size: 20),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              'Notification access needed to auto-verify UPI payments',
              style: GoogleFonts.dmSans(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w500),
            ),
          ),
          const SizedBox(width: 8),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.amber.shade600,
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              minimumSize: Size.zero,
              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
            ),
            onPressed: _openNotificationSettings,
            child: const Text('Enable', style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold, fontSize: 11)),
          ),
        ],
      ),
    );
  }

  Widget _buildCompactBatteryBanner() {
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 6, 16, 0),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.orange.shade900.withValues(alpha: 0.25),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: Colors.orange.shade400.withValues(alpha: 0.6)),
      ),
      child: Row(
        children: [
          const Icon(Icons.battery_alert_rounded, color: Colors.orangeAccent, size: 20),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              'Disable battery optimization for 24/7 background syncing',
              style: GoogleFonts.dmSans(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w500),
            ),
          ),
          const SizedBox(width: 8),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.orange.shade600,
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              minimumSize: Size.zero,
              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
            ),
            onPressed: _requestIgnoreBatteryOptimization,
            child: const Text('Allow', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 11)),
          ),
        ],
      ),
    );
  }

  Widget _buildTabsHeader() {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 10),
      decoration: BoxDecoration(
        color: const Color(0xFF060B16), // Solid background so items scroll cleanly under it
        border: Border(
          bottom: BorderSide(
            color: Colors.white.withValues(alpha: 0.08),
            width: 1,
          ),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          // Section Header Row: Title + Target status + Battery & Refresh
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    width: 8,
                    height: 8,
                    decoration: BoxDecoration(
                      color: _isOnline ? const Color(0xFF10B981) : Colors.amber,
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(
                          color: (_isOnline ? const Color(0xFF10B981) : Colors.amber).withValues(alpha: 0.6),
                          blurRadius: 6,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Connected Admin Orders',
                        style: GoogleFonts.spaceGrotesk(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                          fontSize: 15,
                        ),
                      ),
                      const SizedBox(height: 1),
                      Text(
                        '$_serverUrl • ${_pairingCode ?? "ACTIVE"}',
                        style: GoogleFonts.dmSans(
                          color: const Color(0xFF88A0CB),
                          fontSize: 10,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
              Row(
                children: [
                  // Battery level chip
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.05),
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(color: Colors.white10),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          _batteryLevel > 20 ? Icons.battery_charging_full_rounded : Icons.battery_alert_rounded,
                          size: 13,
                          color: _batteryLevel > 20 ? const Color(0xFF10B981) : Colors.redAccent,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          '$_batteryLevel%',
                          style: GoogleFonts.jetBrainsMono(
                            color: Colors.white70,
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 6),
                  // Refresh button
                  InkWell(
                    onTap: _isLoadingOrders ? null : () => _loadOrders(showLoading: true, reset: true),
                    borderRadius: BorderRadius.circular(8),
                    child: Container(
                      padding: const EdgeInsets.all(5),
                      decoration: BoxDecoration(
                        color: const Color(0xFF00E5FF).withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: const Color(0xFF00E5FF).withValues(alpha: 0.3)),
                      ),
                      child: _isLoadingOrders
                          ? const SizedBox(
                              width: 16,
                              height: 16,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: Color(0xFF00E5FF),
                              ),
                            )
                          : const Icon(Icons.refresh_rounded, color: Color(0xFF00E5FF), size: 16),
                    ),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 10),

          // Horizontal Scrollable Tabs: ALL, VERIFIED, PENDING, REJECTED, LIVE STREAM
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            physics: const BouncingScrollPhysics(),
            child: Row(
              children: [
                _buildOrderTab('ALL', 'All', _countAll),
                const SizedBox(width: 8),
                _buildOrderTab('VERIFIED', 'Verified', _countVerified, activeColor: const Color(0xFF10B981)),
                const SizedBox(width: 8),
                _buildOrderTab('PENDING', 'Pending', _countPending, activeColor: Colors.amberAccent),
                const SizedBox(width: 8),
                _buildOrderTab('REJECTED', 'Rejected', _countRejected, activeColor: Colors.redAccent),
                const SizedBox(width: 8),
                _buildOrderTab('LIVE', '⚡ Live Stream', _transactions.length, activeColor: const Color(0xFF818CF8)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildScrollableContent() {
    return RefreshIndicator(
      color: const Color(0xFF00E5FF),
      backgroundColor: const Color(0xFF111827),
      onRefresh: () async {
        if (_selectedOrderTab == 'LIVE') {
          await Future.delayed(const Duration(milliseconds: 300));
        } else {
          await _loadOrders(showLoading: false, reset: true);
        }
      },
      child: _selectedOrderTab == 'LIVE'
          ? _buildLiveStreamList()
          : _buildOrdersMobileList(),
    );
  }

  Widget _buildOrdersMobileList() {
    if (_isLoadingOrders && _orders.isEmpty) {
      return const Center(
        child: CircularProgressIndicator(color: Color(0xFF00E5FF)),
      );
    }

    if (_orders.isEmpty) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.symmetric(vertical: 48, horizontal: 24),
        children: [
          Container(
            padding: const EdgeInsets.symmetric(vertical: 36, horizontal: 20),
            decoration: BoxDecoration(
              color: const Color(0xFF090D16),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.white10),
            ),
            child: Column(
              children: [
                Icon(Icons.inbox_outlined, size: 40, color: Colors.white.withValues(alpha: 0.25)),
                const SizedBox(height: 12),
                Text(
                  'No ${_selectedOrderTab.toLowerCase()} orders found',
                  style: GoogleFonts.dmSans(color: Colors.white70, fontSize: 14, fontWeight: FontWeight.w500),
                ),
                const SizedBox(height: 6),
                Text(
                  'Pull down to refresh or wait for incoming customer checkouts.',
                  textAlign: TextAlign.center,
                  style: GoogleFonts.dmSans(color: Colors.white38, fontSize: 11),
                ),
              ],
            ),
          ),
        ],
      );
    }

    return ListView.separated(
      controller: _scrollController,
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
      itemCount: _orders.length + 1,
      separatorBuilder: (_, __) => const SizedBox(height: 10),
      itemBuilder: (context, index) {
        if (index == _orders.length) {
          return _buildListFooter();
        }
        final order = _orders[index];
        return _buildOrderCard(order);
      },
    );
  }

  Widget _buildLiveStreamList() {
    if (_transactions.isEmpty) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.symmetric(vertical: 48, horizontal: 24),
        children: [
          Container(
            padding: const EdgeInsets.symmetric(vertical: 36, horizontal: 20),
            decoration: BoxDecoration(
              color: const Color(0xFF090D16),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.white10),
            ),
            child: Column(
              children: [
                const Icon(Icons.stream_rounded, size: 40, color: Color(0xFF818CF8)),
                const SizedBox(height: 12),
                Text(
                  'No Live Notifications Captured Yet',
                  style: GoogleFonts.dmSans(color: Colors.white70, fontSize: 14, fontWeight: FontWeight.w500),
                ),
                const SizedBox(height: 6),
                Text(
                  'Incoming push notifications from Google Pay, PhonePe, and bank SMS will appear here in real time.',
                  textAlign: TextAlign.center,
                  style: GoogleFonts.dmSans(color: Colors.white38, fontSize: 11),
                ),
              ],
            ),
          ),
        ],
      );
    }

    return ListView.separated(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
      itemCount: _transactions.length,
      separatorBuilder: (_, __) => const SizedBox(height: 10),
      itemBuilder: (context, index) {
        final txn = _transactions[index];
        return _buildLiveTransactionCard(txn);
      },
    );
  }

  Widget _buildLiveTransactionCard(SmsTransaction txn) {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFF0E1524),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: txn.isMatched ? const Color(0xFF10B981).withValues(alpha: 0.4) : Colors.white12,
        ),
      ),
      padding: const EdgeInsets.all(12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Icon(
                    txn.isMatched ? Icons.check_circle_rounded : Icons.notifications_active_rounded,
                    size: 15,
                    color: txn.isMatched ? const Color(0xFF10B981) : const Color(0xFF818CF8),
                  ),
                  const SizedBox(width: 6),
                  Text(
                    txn.bank ?? txn.sender,
                    style: GoogleFonts.dmSans(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12),
                  ),
                ],
              ),
              if (txn.amount != null)
                Text(
                  '₹${txn.amount!.toStringAsFixed(2)}',
                  style: GoogleFonts.spaceGrotesk(
                    color: const Color(0xFF10B981),
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                  ),
                ),
            ],
          ),
          const SizedBox(height: 6),
          if (txn.matchedOrderId != null &&
              txn.matchedOrderId != 'null' &&
              txn.matchedOrderId!.trim().isNotEmpty) ...[
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(
                color: const Color(0xFF10B981).withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(6),
              ),
              child: Text(
                'Auto-Matched Order: ${txn.matchedOrderId}',
                style: GoogleFonts.jetBrainsMono(
                  color: const Color(0xFF10B981),
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            const SizedBox(height: 4),
          ],
          Text(
            txn.rawMessage,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: GoogleFonts.dmSans(color: Colors.white60, fontSize: 11),
          ),
          const SizedBox(height: 4),
          Text(
            '${DateFormat('hh:mm:ss a').format(txn.timestamp.toUtc().add(const Duration(hours: 5, minutes: 30)))} IST',
            style: GoogleFonts.jetBrainsMono(color: Colors.white38, fontSize: 10),
          ),
        ],
      ),
    );
  }

  Widget _buildListFooter() {
    if (_isLoadingMore) {
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: 20),
        child: Center(
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const SizedBox(
                width: 16,
                height: 16,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: Color(0xFF00E5FF),
                ),
              ),
              const SizedBox(width: 10),
              Text(
                'Loading more orders...',
                style: GoogleFonts.dmSans(
                  color: const Color(0xFF00E5FF),
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
      );
    }

    if (!_hasMoreOrders && _orders.isNotEmpty) {
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: 20),
        child: Center(
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.check_circle_outline_rounded, size: 14, color: Colors.white.withValues(alpha: 0.3)),
              const SizedBox(width: 6),
              Text(
                'All ${_orders.length} orders loaded',
                style: GoogleFonts.dmSans(
                  color: Colors.white38,
                  fontSize: 11,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
      );
    }

    return const SizedBox(height: 16);
  }

  Widget _buildPairPrompt() {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: const Color(0xFF111827),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white12),
      ),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFF00E5FF).withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.phonelink_ring_rounded, color: Color(0xFF00E5FF), size: 36),
          ),
          const SizedBox(height: 12),
          Text(
            'Pair Device to View Admin Orders',
            style: GoogleFonts.spaceGrotesk(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15),
          ),
          const SizedBox(height: 6),
          Text(
            'Connect this companion app to your merchant gateway to review live store orders, verify settlements, or cancel orders.',
            textAlign: TextAlign.center,
            style: GoogleFonts.dmSans(color: Colors.white60, fontSize: 12),
          ),
          const SizedBox(height: 16),
          ElevatedButton.icon(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF00E5FF),
              foregroundColor: const Color(0xFF060B16),
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            onPressed: () async {
              final res = await Navigator.push<bool>(
                context,
                MaterialPageRoute(builder: (_) => const PairingScreen()),
              );
              if (res == true) {
                _checkPairingStatus();
              }
            },
            icon: const Icon(Icons.qr_code_rounded, size: 16),
            label: Text('Pair Device Now', style: GoogleFonts.spaceGrotesk(fontWeight: FontWeight.bold, fontSize: 13)),
          ),
        ],
      ),
    );
  }

  Widget _buildOrderTab(String key, String label, int count, {Color? activeColor}) {
    final isSelected = _selectedOrderTab == key;
    final themeColor = activeColor ?? const Color(0xFF00E5FF);

    return InkWell(
      borderRadius: BorderRadius.circular(20),
      onTap: () {
        if (_selectedOrderTab != key) {
          setState(() {
            _selectedOrderTab = key;
            _hasMoreOrders = true;
          });
          if (_scrollController.hasClients) {
            _scrollController.jumpTo(0);
          }
          if (key != 'LIVE') {
            _loadOrders(showLoading: true, reset: true);
          }
        }
      },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: isSelected ? themeColor.withValues(alpha: 0.15) : Colors.white.withValues(alpha: 0.04),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? themeColor : Colors.white12,
            width: isSelected ? 1.4 : 1,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              label,
              style: GoogleFonts.dmSans(
                color: isSelected ? Colors.white : Colors.white60,
                fontSize: 12,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
              ),
            ),
            const SizedBox(width: 6),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
              decoration: BoxDecoration(
                color: isSelected ? themeColor.withValues(alpha: 0.3) : Colors.white.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(
                count.toString(),
                style: GoogleFonts.jetBrainsMono(
                  color: isSelected ? (activeColor ?? const Color(0xFF00E5FF)) : Colors.white54,
                  fontSize: 10,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildOrderCard(GatewayOrder order) {
    Color borderColor;
    Color statusBg;
    Color statusFg;
    String statusText;

    if (order.isVerified) {
      borderColor = const Color(0xFF10B981).withValues(alpha: 0.35);
      statusBg = const Color(0xFF10B981).withValues(alpha: 0.15);
      statusFg = const Color(0xFF10B981);
      statusText = 'Verified';
    } else if (order.isPending) {
      borderColor = Colors.amber.shade500.withValues(alpha: 0.35);
      statusBg = Colors.amber.shade500.withValues(alpha: 0.15);
      statusFg = Colors.amberAccent;
      statusText = 'Pending';
    } else {
      borderColor = Colors.redAccent.shade400.withValues(alpha: 0.3);
      statusBg = Colors.redAccent.withValues(alpha: 0.15);
      statusFg = Colors.redAccent;
      statusText = order.status;
    }

    final dateStr = '${DateFormat('dd MMM yyyy, hh:mm a').format(order.createdAt)} IST';

    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFF0E1524),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: borderColor),
      ),
      padding: const EdgeInsets.all(12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Top Row: Order ID & Status Badge
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Row(
                  children: [
                    const Icon(Icons.receipt_long_rounded, size: 15, color: Colors.white54),
                    const SizedBox(width: 6),
                    Flexible(
                      child: Text(
                        order.orderId,
                        overflow: TextOverflow.ellipsis,
                        style: GoogleFonts.jetBrainsMono(
                          color: Colors.white,
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: statusBg,
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(color: statusFg.withValues(alpha: 0.4)),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 5,
                      height: 5,
                      decoration: BoxDecoration(color: statusFg, shape: BoxShape.circle),
                    ),
                    const SizedBox(width: 5),
                    Text(
                      statusText,
                      style: GoogleFonts.dmSans(
                        color: statusFg,
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),

          // Amount & Customer Info
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                '₹${order.amount.toStringAsFixed(2)}',
                style: GoogleFonts.spaceGrotesk(
                  color: order.isVerified
                      ? const Color(0xFF10B981)
                      : (order.isPending ? Colors.white : Colors.redAccent),
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              if (order.customerName != null || order.customerMobile != null)
                Text(
                  [
                    if (order.customerName != null && order.customerName!.isNotEmpty) order.customerName,
                    if (order.customerMobile != null && order.customerMobile!.isNotEmpty) order.customerMobile,
                  ].join(' • '),
                  style: GoogleFonts.dmSans(color: Colors.white60, fontSize: 11),
                ),
            ],
          ),
          const SizedBox(height: 6),

          // Meta Info: Time, UTR
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                dateStr,
                style: GoogleFonts.dmSans(color: Colors.white38, fontSize: 10),
              ),
              if (order.utr != null && order.utr!.isNotEmpty)
                Text(
                  'UTR: ${order.utr}',
                  style: GoogleFonts.jetBrainsMono(
                    color: const Color(0xFF00E5FF),
                    fontSize: 10,
                    fontWeight: FontWeight.w600,
                  ),
                ),
            ],
          ),

          // Authority to Settle / Cancel manually if order is Pending
          if (order.isPending) ...[
            const SizedBox(height: 10),
            Container(height: 1, color: Colors.white10),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF10B981),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      elevation: 0,
                    ),
                    onPressed: () => _showSettleOrderDialog(order),
                    icon: const Icon(Icons.check_circle_rounded, size: 14),
                    label: Text(
                      'Settle Order',
                      style: GoogleFonts.dmSans(fontWeight: FontWeight.bold, fontSize: 12),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton.icon(
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.redAccent,
                      side: BorderSide(color: Colors.redAccent.withValues(alpha: 0.6)),
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                    onPressed: () => _showCancelOrderDialog(order),
                    icon: const Icon(Icons.cancel_outlined, size: 14),
                    label: Text(
                      'Cancel Order',
                      style: GoogleFonts.dmSans(fontWeight: FontWeight.bold, fontSize: 12),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}
