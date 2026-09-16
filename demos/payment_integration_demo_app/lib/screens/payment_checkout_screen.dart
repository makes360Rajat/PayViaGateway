import 'dart:async';
import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:url_launcher/url_launcher.dart';
import '../models/payment_models.dart';
import '../services/payvia_api_service.dart';
import '../services/screenshot_manager.dart';
import '../utils/app_theme.dart';
import 'payment_success_screen.dart';
import 'qr_scanner_screen.dart';

class PaymentCheckoutScreen extends StatefulWidget {
  final OrderResponse order;
  final String customerName;
  final String customerMobile;

  const PaymentCheckoutScreen({
    super.key,
    required this.order,
    required this.customerName,
    required this.customerMobile,
  });

  @override
  State<PaymentCheckoutScreen> createState() => _PaymentCheckoutScreenState();
}

class _PaymentCheckoutScreenState extends State<PaymentCheckoutScreen>
    with SingleTickerProviderStateMixin {
  final GlobalKey _qrRepaintBoundaryKey = GlobalKey();

  CheckoutData? _checkoutData;
  bool _isLoading = true;
  String? _errorMessage;
  Timer? _pollingTimer;
  Timer? _countdownTimer;
  int _remainingSeconds = 900; // 15 minutes
  bool _isTakingScreenshot = false;
  bool _isSettled = false;

  late AnimationController _pulseController;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    )..repeat(reverse: true);

    _loadCheckoutDetails();
    _startCountdown();
    _startPolling();
  }

  @override
  void dispose() {
    _pollingTimer?.cancel();
    _countdownTimer?.cancel();
    _pulseController.dispose();
    super.dispose();
  }

  void _startCountdown() {
    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_remainingSeconds > 0) {
        setState(() {
          _remainingSeconds--;
        });
      } else {
        timer.cancel();
      }
    });
  }

  Future<void> _loadCheckoutDetails() async {
    try {
      final data =
          await PayViaApiService().fetchCheckoutData(widget.order.linkToken);
      if (mounted) {
        setState(() {
          _checkoutData = data;
          _isLoading = false;
        });
        if (data.isPaid && !_isSettled) {
          _handlePaymentSuccess(data);
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = e.toString();
          _isLoading = false;
        });
      }
    }
  }

  void _startPolling() {
    _pollingTimer = Timer.periodic(const Duration(seconds: 2), (timer) async {
      if (_isSettled || !mounted) {
        timer.cancel();
        return;
      }
      try {
        final data =
            await PayViaApiService().fetchCheckoutData(widget.order.linkToken);
        if (data.isPaid && !_isSettled) {
          _isSettled = true;
          timer.cancel();
          if (mounted) {
            _handlePaymentSuccess(data);
          }
        }
      } catch (_) {}
    });
  }

  void _handlePaymentSuccess(CheckoutData data) {
    HapticFeedback.heavyImpact();
    Navigator.pushReplacement(
      context,
      MaterialPageRoute(
        builder: (context) => PaymentSuccessScreen(
          checkoutData: data,
          customerName: widget.customerName,
        ),
      ),
    );
  }

  Future<void> _launchUpiIntent(String appName) async {
    if (_checkoutData == null) return;
    HapticFeedback.selectionClick();

    final merchantName = Uri.encodeComponent(_checkoutData!.merchantName);
    final upiUriStr = _checkoutData!.upiIntentUrl.isNotEmpty
        ? _checkoutData!.upiIntentUrl
        : 'upi://pay?pa=${_checkoutData!.upiId}&pn=$merchantName&am=${_checkoutData!.amount}&cu=INR&tn=${_checkoutData!.orderId}';

    try {
      final uri = Uri.parse(upiUriStr);
      final canLaunch = await canLaunchUrl(uri);
      if (canLaunch) {
        final launched = await launchUrl(
          uri,
          mode: LaunchMode.externalApplication,
        );
        if (launched) {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('Opening $appName on device...'),
                backgroundColor: AppTheme.emerald,
                duration: const Duration(seconds: 2),
              ),
            );
          }
          return;
        }
      }
    } catch (err) {
      debugPrint('Error launching UPI app intent: $err');
    }

    if (!mounted) return;

    // Fallback if UPI app is not installed (e.g. tablet without GPay or emulator)
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Opening $appName Payment Simulator...'),
        backgroundColor: AppTheme.cyan,
        duration: const Duration(seconds: 2),
      ),
    );

    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => QRScannerScreen(
          targetOrderId: _checkoutData?.orderId,
          defaultUpiApp: appName,
        ),
      ),
    );
  }

  Future<void> _captureQrScreenshot() async {
    if (_checkoutData == null) return;

    setState(() {
      _isTakingScreenshot = true;
    });

    HapticFeedback.mediumImpact();

    try {
      Uint8List? pngBytes;
      try {
        final boundary = _qrRepaintBoundaryKey.currentContext?.findRenderObject()
            as RenderRepaintBoundary?;
        if (boundary != null) {
          final image = await boundary.toImage(pixelRatio: 2.5);
          final byteData = await image.toByteData(format: ui.ImageByteFormat.png);
          pngBytes = byteData?.buffer.asUint8List();
        }
      } catch (err) {
        debugPrint('RenderRepaintBoundary capture error: $err');
      }

      final captured = CapturedScreenshot(
        id: 'SC_${DateTime.now().millisecondsSinceEpoch}',
        orderId: _checkoutData!.orderId,
        amount: _checkoutData!.amount,
        upiId: _checkoutData!.upiId,
        merchantName: _checkoutData!.merchantName,
        upiIntentUrl: _checkoutData!.upiIntentUrl,
        customerName: widget.customerName,
        capturedAt: DateTime.now(),
        imageBytes: pngBytes,
      );

      ScreenshotManager().saveScreenshot(captured);

      if (!mounted) return;

      // Show Animated Shutter / Feedback Dialog
      ScaffoldMessenger.of(context).clearSnackBars();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          duration: const Duration(seconds: 4),
          backgroundColor: AppTheme.bgElevated,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
            side: const BorderSide(color: AppTheme.emerald, width: 1),
          ),
          content: Row(
            children: [
              const Icon(Icons.check_circle, color: AppTheme.emerald, size: 22),
              const SizedBox(width: 10),
              const Expanded(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '📸 QR Screenshot Captured!',
                      style: TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                          fontSize: 13),
                    ),
                    Text(
                      'Saved to demo scanner memory',
                      style:
                          TextStyle(color: AppTheme.textSecondary, fontSize: 11),
                    ),
                  ],
                ),
              ),
              ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.emerald,
                  foregroundColor: Colors.black,
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  minimumSize: const Size(60, 32),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8)),
                ),
                onPressed: () {
                  ScaffoldMessenger.of(context).hideCurrentSnackBar();
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => QRScannerScreen(
                        targetScreenshot: captured,
                      ),
                    ),
                  );
                },
                child: const Text('Scan Now',
                    style:
                        TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
              ),
            ],
          ),
        ),
      );
    } catch (e) {
      debugPrint('Screenshot error: $e');
    } finally {
      if (mounted) {
        setState(() {
          _isTakingScreenshot = false;
        });
      }
    }
  }

  String _formatTimer(int totalSec) {
    final m = totalSec ~/ 60;
    final s = totalSec % 60;
    return '${m.toString().padLeft(2, '0')}:${s.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    final currencyFormat = NumberFormat.currency(locale: 'en_IN', symbol: '₹');

    return Scaffold(
      appBar: AppBar(
        title: const Text('Checkout & UPI QR'),
        actions: [
          IconButton(
            tooltip: 'Screenshot Gallery & Scanner',
            icon: const Icon(Icons.qr_code_scanner, color: AppTheme.cyan),
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => const QRScannerScreen(),
                ),
              );
            },
          ),
        ],
      ),
      body: _isLoading
          ? const Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  CircularProgressIndicator(color: AppTheme.emerald),
                  SizedBox(height: 16),
                  Text('Fetching dynamic UPI QR code...'),
                ],
              ),
            )
          : _errorMessage != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24.0),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.error_outline,
                            color: AppTheme.rose, size: 48),
                        const SizedBox(height: 12),
                        Text(_errorMessage!, textAlign: TextAlign.center),
                        const SizedBox(height: 16),
                        ElevatedButton(
                          onPressed: _loadCheckoutDetails,
                          child: const Text('Retry'),
                        )
                      ],
                    ),
                  ),
                )
              : SingleChildScrollView(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    children: [
                      // Expiry and Status Indicator
                      _buildTimerAndStatus(),
                      const SizedBox(height: 16),

                      // QR Code Card wrapped in RepaintBoundary for capture
                      RepaintBoundary(
                        key: _qrRepaintBoundaryKey,
                        child: _buildQrCard(currencyFormat),
                      ),
                      const SizedBox(height: 16),

                      // Action Button 1: Capture Screenshot
                      _buildScreenshotButton(),
                      const SizedBox(height: 12),

                      // Action Button 2: Launch Simulator / Scan QR
                      _buildScanQrButton(),
                      const SizedBox(height: 20),

                      // UPI Apps Intent Launchers
                      _buildUpiAppsGrid(),
                      const SizedBox(height: 20),

                      // Real-time settlement status banner
                      _buildPollingBanner(),
                      const SizedBox(height: 30),
                    ],
                  ),
                ),
    );
  }

  Widget _buildTimerAndStatus() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: AppTheme.bgElevated,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.borderSubtle),
      ),
      child: Row(
        children: [
          Expanded(
            child: Row(
              children: [
                AnimatedBuilder(
                  animation: _pulseController,
                  builder: (context, child) {
                    return Container(
                      width: 10,
                      height: 10,
                      decoration: BoxDecoration(
                        color: AppTheme.emerald,
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(
                            color: AppTheme.emerald.withValues(alpha: 0.6 * _pulseController.value),
                            blurRadius: 8 * _pulseController.value,
                            spreadRadius: 2 * _pulseController.value,
                          ),
                        ],
                      ),
                    );
                  },
                ),
                const SizedBox(width: 8),
                const Expanded(
                  child: Text(
                    'Awaiting UPI Payment...',
                    style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: Colors.white),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: AppTheme.amber.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: AppTheme.amber.withValues(alpha: 0.4)),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.timer_outlined, size: 14, color: AppTheme.amber),
                const SizedBox(width: 4),
                Text(
                  _formatTimer(_remainingSeconds),
                  style: const TextStyle(
                    color: AppTheme.amber,
                    fontWeight: FontWeight.bold,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildQrCard(NumberFormat currencyFormat) {
    final upiUri = _checkoutData?.upiIntentUrl ??
        'upi://pay?pa=${_checkoutData?.upiId}&pn=${Uri.encodeComponent(_checkoutData?.merchantName ?? 'PayVia')}&am=${_checkoutData?.amount}&cu=INR&tn=${_checkoutData?.orderId}';

    return Container(
      decoration: AppTheme.glassCardDecoration(
        borderColor: AppTheme.emerald.withValues(alpha: 0.4),
        glowing: true,
      ),
      padding: const EdgeInsets.all(20),
      child: Column(
        children: [
          // Merchant Info
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.verified, color: AppTheme.emerald, size: 18),
              const SizedBox(width: 6),
              Flexible(
                child: Text(
                  _checkoutData?.merchantName ?? 'PayVia Verified Merchant',
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            _checkoutData?.upiId ?? 'payvia.merchant@upi',
            style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary),
          ),
          const SizedBox(height: 14),

          // Amount Display
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
            decoration: BoxDecoration(
              gradient: AppTheme.emeraldGradient.scale(0.15),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppTheme.emerald.withValues(alpha: 0.3)),
            ),
            child: Text(
              currencyFormat.format(_checkoutData?.amount ?? widget.order.amount),
              style: const TextStyle(
                fontSize: 30,
                fontWeight: FontWeight.bold,
                color: AppTheme.emerald,
                letterSpacing: 0.5,
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Rendered QR Code
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              boxShadow: [
                BoxShadow(
                  color: AppTheme.emerald.withValues(alpha: 0.2),
                  blurRadius: 16,
                  spreadRadius: 2,
                ),
              ],
            ),
            child: QrImageView(
              data: upiUri,
              version: QrVersions.auto,
              size: 200.0,
              backgroundColor: Colors.white,
              eyeStyle: const QrEyeStyle(
                eyeShape: QrEyeShape.square,
                color: Color(0xFF070B0F),
              ),
              dataModuleStyle: const QrDataModuleStyle(
                dataModuleShape: QrDataModuleShape.square,
                color: Color(0xFF070B0F),
              ),
            ),
          ),
          const SizedBox(height: 14),

          // Order ID badge
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Flexible(
                child: Text(
                  'ORDER: ${_checkoutData?.orderId ?? widget.order.orderId}',
                  style: const TextStyle(
                    fontSize: 11,
                    fontFamily: 'monospace',
                    color: AppTheme.textSecondary,
                    letterSpacing: 0.5,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              const SizedBox(width: 6),
              InkWell(
                onTap: () {
                  Clipboard.setData(ClipboardData(
                      text: _checkoutData?.orderId ?? widget.order.orderId));
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Order ID copied to clipboard'),
                      duration: Duration(seconds: 1),
                    ),
                  );
                },
                child: const Icon(Icons.copy, size: 14, color: AppTheme.cyan),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildScreenshotButton() {
    return SizedBox(
      width: double.infinity,
      height: 48,
      child: OutlinedButton.icon(
        style: OutlinedButton.styleFrom(
          foregroundColor: AppTheme.cyan,
          side: const BorderSide(color: AppTheme.cyan, width: 1.5),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          backgroundColor: AppTheme.cyan.withValues(alpha: 0.08),
        ),
        icon: _isTakingScreenshot
            ? const SizedBox(
                width: 18,
                height: 18,
                child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.cyan),
              )
            : const Icon(Icons.camera_alt_outlined, size: 20),
        label: const Text(
          'TAKE & SAVE QR SCREENSHOT',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, letterSpacing: 0.5),
        ),
        onPressed: _isTakingScreenshot ? null : _captureQrScreenshot,
      ),
    );
  }

  Widget _buildScanQrButton() {
    return SizedBox(
      width: double.infinity,
      height: 52,
      child: ElevatedButton.icon(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppTheme.emerald,
          foregroundColor: Colors.black,
          elevation: 6,
          shadowColor: AppTheme.emerald.withValues(alpha: 0.5),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
        icon: const Icon(Icons.qr_code_scanner, size: 22),
        label: const Text(
          'SCAN QR / COMPLETE FROM SCREENSHOT',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, letterSpacing: 0.5),
        ),
        onPressed: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => QRScannerScreen(
                targetOrderId: _checkoutData?.orderId,
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildUpiAppsGrid() {
    final apps = [
      {'name': 'Google Pay', 'icon': Icons.account_balance_wallet, 'color': const Color(0xFF4285F4)},
      {'name': 'PhonePe', 'icon': Icons.payment, 'color': const Color(0xFF5F259F)},
      {'name': 'Paytm', 'icon': Icons.currency_rupee, 'color': const Color(0xFF00B9F1)},
      {'name': 'BHIM', 'icon': Icons.send_to_mobile, 'color': const Color(0xFF009688)},
    ];

    return Container(
      decoration: AppTheme.glassCardDecoration(radius: 12),
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'PAY DIRECTLY VIA UPI APPS',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 0.8,
                  color: AppTheme.textSecondary,
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: AppTheme.emerald.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: const Text('1-Tap Intent', style: TextStyle(fontSize: 9, color: AppTheme.emerald, fontWeight: FontWeight.bold)),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: apps.map((app) {
              final appName = app['name'] as String;
              return InkWell(
                borderRadius: BorderRadius.circular(10),
                onTap: () => _launchUpiIntent(appName),
                child: Column(
                  children: [
                    Container(
                      width: 52,
                      height: 52,
                      decoration: BoxDecoration(
                        color: (app['color'] as Color).withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: (app['color'] as Color).withValues(alpha: 0.5)),
                      ),
                      child: Icon(app['icon'] as IconData, color: app['color'] as Color, size: 26),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      appName,
                      style: const TextStyle(fontSize: 11, color: Colors.white, fontWeight: FontWeight.w600),
                    ),
                  ],
                ),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }

  Widget _buildPollingBanner() {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppTheme.bgElevated,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppTheme.borderSubtle),
      ),
      child: const Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          SizedBox(
            width: 14,
            height: 14,
            child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.cyan),
          ),
          SizedBox(width: 10),
          Expanded(
            child: Text(
              'Listening to live PayVia360 settlement gateway...',
              style: TextStyle(fontSize: 11, color: AppTheme.textSecondary),
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }
}
