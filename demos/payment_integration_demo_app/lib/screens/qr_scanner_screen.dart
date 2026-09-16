import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../models/payment_models.dart';
import '../services/payvia_api_service.dart';
import '../services/screenshot_manager.dart';
import '../utils/app_theme.dart';
import 'payment_success_screen.dart';

class QRScannerScreen extends StatefulWidget {
  final CapturedScreenshot? targetScreenshot;
  final String? targetOrderId;
  final String? defaultUpiApp;

  const QRScannerScreen({
    super.key,
    this.targetScreenshot,
    this.targetOrderId,
    this.defaultUpiApp,
  });

  @override
  State<QRScannerScreen> createState() => _QRScannerScreenState();
}

class _QRScannerScreenState extends State<QRScannerScreen>
    with SingleTickerProviderStateMixin {
  late MobileScannerController _scannerController;
  final ImagePicker _imagePicker = ImagePicker();

  int _selectedTab = 0; // 0 = Camera Scanner, 1 = Screenshots Gallery
  CapturedScreenshot? _activeScannedItem;
  bool _isTorchOn = false;
  bool _isFrontCamera = false;
  bool _hasScanned = false;

  // Payment dialog state
  String _selectedUpiApp = 'Google Pay';
  String _selectedBank = 'HDFC Bank •••• 4821 (Primary)';
  final _utrController = TextEditingController();
  final _amountController = TextEditingController(text: '1.00');
  final _orderIdController = TextEditingController(text: 'PV_DEMO1042');
  final _merchantVpaController =
      TextEditingController(text: 'pankajshop@paytm');
  final _customerNameController =
      TextEditingController(text: 'Aarav Mehta');

  bool _isSettling = false;

  final List<String> _bankAccounts = [
    'HDFC Bank •••• 4821 (Primary)',
    'ICICI Bank •••• 9921',
    'State Bank of India •••• 1042',
    'Axis Bank •••• 7731',
  ];

  @override
  void initState() {
    super.initState();
    _scannerController = MobileScannerController(
      detectionSpeed: DetectionSpeed.noDuplicates,
      facing: CameraFacing.back,
      torchEnabled: false,
    );

    _utrController.text = PayViaApiService.generateUtr();
    if (widget.defaultUpiApp != null) {
      _selectedUpiApp = widget.defaultUpiApp!;
    }

    if (widget.targetOrderId != null) {
      _orderIdController.text = widget.targetOrderId!;
    }

    if (widget.targetScreenshot != null) {
      _selectAndDecodeScreenshot(widget.targetScreenshot!);
    } else {
      final latest = ScreenshotManager().latestScreenshot;
      if (latest != null) {
        _activeScannedItem = latest;
        _populateFromScreenshot(latest);
      }
    }
  }

  @override
  void dispose() {
    _scannerController.dispose();
    _utrController.dispose();
    _amountController.dispose();
    _orderIdController.dispose();
    _merchantVpaController.dispose();
    _customerNameController.dispose();
    super.dispose();
  }

  void _populateFromScreenshot(CapturedScreenshot sc) {
    _amountController.text = sc.amount.toStringAsFixed(2);
    _orderIdController.text = sc.orderId;
    _merchantVpaController.text = sc.upiId;
    _customerNameController.text = sc.customerName;
  }

  void _selectAndDecodeScreenshot(CapturedScreenshot sc) {
    HapticFeedback.mediumImpact();
    setState(() {
      _activeScannedItem = sc;
      _populateFromScreenshot(sc);
    });

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Decoded QR for ${sc.orderId} (₹${sc.amount.toStringAsFixed(2)})'),
        backgroundColor: AppTheme.emerald,
        duration: const Duration(seconds: 2),
      ),
    );
  }

  void _parseUpiString(String raw) {
    debugPrint('Scanned QR String: $raw');
    HapticFeedback.heavyImpact();

    try {
      if (raw.startsWith('upi://pay') || raw.contains('pa=')) {
        final uri = Uri.parse(raw);
        final pa = uri.queryParameters['pa'] ?? '';
        final am = uri.queryParameters['am'] ?? '';
        final tn = uri.queryParameters['tn'] ?? uri.queryParameters['tr'] ?? '';

        setState(() {
          if (am.isNotEmpty) _amountController.text = am;
          if (pa.isNotEmpty) _merchantVpaController.text = pa;
          if (tn.isNotEmpty) _orderIdController.text = tn;
          _hasScanned = true;
        });

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('✅ Scanned UPI QR! Amount: ₹${_amountController.text} | Merchant: $pa'),
            backgroundColor: AppTheme.emerald,
            duration: const Duration(seconds: 3),
          ),
        );
      } else {
        // Fallback for order IDs or arbitrary codes
        setState(() {
          _orderIdController.text = raw;
          _hasScanned = true;
        });

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Scanned QR Code: $raw'),
            backgroundColor: AppTheme.cyan,
            duration: const Duration(seconds: 2),
          ),
        );
      }
    } catch (e) {
      debugPrint('Error parsing QR: $e');
    }
  }

  Future<void> _pickAndScanImageFromGallery() async {
    try {
      final XFile? image = await _imagePicker.pickImage(source: ImageSource.gallery);
      if (image == null) return;

      final BarcodeCapture? capture = await _scannerController.analyzeImage(image.path);
      bool detected = false;
      if (capture != null && capture.barcodes.isNotEmpty) {
        for (final barcode in capture.barcodes) {
          final String? raw = barcode.rawValue;
          if (raw != null && raw.isNotEmpty) {
            _parseUpiString(raw);
            detected = true;
            break;
          }
        }
      }

      if (!detected && mounted) {
        // If file scanner didn't parse, check if we have captured screenshot
        final latest = ScreenshotManager().latestScreenshot;
        if (latest != null) {
          _selectAndDecodeScreenshot(latest);
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Could not detect QR in image. Please pick a clear QR screenshot.'),
              backgroundColor: AppTheme.rose,
            ),
          );
        }
      }
    } catch (e) {
      debugPrint('Error picking image: $e');
    }
  }

  void _generateNewUtr() {
    HapticFeedback.selectionClick();
    setState(() {
      _utrController.text = PayViaApiService.generateUtr();
    });
  }

  Future<void> _handleCompletePayment() async {
    final amount = double.tryParse(_amountController.text) ?? 1.0;
    final orderId = _orderIdController.text.trim();
    final utr = _utrController.text.trim();
    final customer = _customerNameController.text.trim();

    if (utr.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please enter or generate a 12-digit UTR'),
          backgroundColor: AppTheme.rose,
        ),
      );
      return;
    }

    setState(() {
      _isSettling = true;
    });

    try {
      final result = await PayViaApiService().settlePaymentViaIngest(
        orderId: orderId,
        amount: amount,
        utr: utr,
        customerName: customer,
        upiApp: _selectedUpiApp,
      );

      if (!mounted) return;

      final checkoutData = CheckoutData(
        orderId: orderId.isNotEmpty ? orderId : (result.orderId.isNotEmpty ? result.orderId : 'PV_SETTLED'),
        amount: amount,
        status: 'TXN_SUCCESS',
        upiId: _merchantVpaController.text,
        merchantName: PayViaApiService().merchantBusinessName,
        upiIntentUrl: 'upi://pay?pa=${_merchantVpaController.text}&am=$amount',
        paidAt: DateTime.now(),
        utr: utr,
      );

      Navigator.pushReplacement(
        context,
        MaterialPageRoute(
          builder: (context) => PaymentSuccessScreen(
            checkoutData: checkoutData,
            customerName: customer,
          ),
        ),
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Settlement Error: $e'),
            backgroundColor: AppTheme.rose,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isSettling = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final screenshots = ScreenshotManager().screenshots;

    return Scaffold(
      appBar: AppBar(
        title: const Text('UPI Scanner & Simulator'),
        actions: [
          // Torch toggle
          IconButton(
            tooltip: 'Toggle Flash',
            icon: Icon(
              _isTorchOn ? Icons.flash_on : Icons.flash_off,
              color: _isTorchOn ? AppTheme.amber : Colors.white70,
            ),
            onPressed: () async {
              await _scannerController.toggleTorch();
              setState(() {
                _isTorchOn = !_isTorchOn;
              });
            },
          ),
          // Switch camera
          IconButton(
            tooltip: 'Switch Camera',
            icon: const Icon(Icons.flip_camera_ios, color: Colors.white70),
            onPressed: () async {
              await _scannerController.switchCamera();
              setState(() {
                _isFrontCamera = !_isFrontCamera;
              });
            },
          ),
          // Pick image from gallery
          IconButton(
            tooltip: 'Pick QR from Gallery',
            icon: const Icon(Icons.image, color: AppTheme.cyan),
            onPressed: _pickAndScanImageFromGallery,
          ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(48),
          child: Container(
            color: AppTheme.bgSurface,
            child: Row(
              children: [
                Expanded(
                  child: InkWell(
                    onTap: () => setState(() => _selectedTab = 0),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      decoration: BoxDecoration(
                        border: Border(
                          bottom: BorderSide(
                            color: _selectedTab == 0 ? AppTheme.emerald : Colors.transparent,
                            width: 2.5,
                          ),
                        ),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            Icons.camera_alt_outlined,
                            size: 18,
                            color: _selectedTab == 0 ? AppTheme.emerald : AppTheme.textMuted,
                          ),
                          const SizedBox(width: 8),
                          Text(
                            'LIVE CAMERA',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                              color: _selectedTab == 0 ? Colors.white : AppTheme.textSecondary,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                Expanded(
                  child: InkWell(
                    onTap: () => setState(() => _selectedTab = 1),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      decoration: BoxDecoration(
                        border: Border(
                          bottom: BorderSide(
                            color: _selectedTab == 1 ? AppTheme.cyan : Colors.transparent,
                            width: 2.5,
                          ),
                        ),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            Icons.photo_library_outlined,
                            size: 18,
                            color: _selectedTab == 1 ? AppTheme.cyan : AppTheme.textMuted,
                          ),
                          const SizedBox(width: 8),
                          Text(
                            'SAVED SCREENSHOTS (${screenshots.length})',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                              color: _selectedTab == 1 ? Colors.white : AppTheme.textSecondary,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
      body: _selectedTab == 0 ? _buildLiveScannerTab() : _buildScreenshotsTab(screenshots),
    );
  }

  Widget _buildLiveScannerTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          // Hardware Mobile Camera Viewfinder with HUD
          _buildCameraViewfinder(),
          const SizedBox(height: 12),

          // Quick Action Bar (Gallery Pick + Auto-Load Test Order)
          _buildQuickScanToolbar(),
          const SizedBox(height: 16),

          // Payment Confirmation & Settlement Sheet
          _buildPaymentSettlementCard(),
          const SizedBox(height: 30),
        ],
      ),
    );
  }

  Widget _buildCameraViewfinder() {
    return Container(
      height: 280,
      width: double.infinity,
      decoration: BoxDecoration(
        color: Colors.black,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppTheme.emerald.withValues(alpha: 0.5), width: 1.5),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(20),
        child: Stack(
          alignment: Alignment.center,
          children: [
            // Live Hardware Camera Stream
            MobileScanner(
              controller: _scannerController,
              onDetect: (BarcodeCapture capture) {
                final List<Barcode> barcodes = capture.barcodes;
                for (final barcode in barcodes) {
                  final String? raw = barcode.rawValue;
                  if (raw != null && raw.isNotEmpty) {
                    _parseUpiString(raw);
                    break;
                  }
                }
              },
            ),

            // Reticle Target Box
            Container(
              width: 200,
              height: 200,
              decoration: BoxDecoration(
                border: Border.all(color: AppTheme.emerald.withValues(alpha: 0.6), width: 1.5),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Stack(
                children: [
                  Positioned(top: 0, left: 0, child: _buildCorner(0)),
                  Positioned(top: 0, right: 0, child: _buildCorner(1)),
                  Positioned(bottom: 0, left: 0, child: _buildCorner(2)),
                  Positioned(bottom: 0, right: 0, child: _buildCorner(3)),
                ],
              ),
            ),

            // Top Status Badge
            Positioned(
              top: 12,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: Colors.black.withValues(alpha: 0.75),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: AppTheme.emerald.withValues(alpha: 0.4)),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 8,
                      height: 8,
                      decoration: const BoxDecoration(
                        color: AppTheme.emerald,
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 6),
                    const Text(
                      'Live Camera Scanner Active',
                      style: TextStyle(fontSize: 11, color: Colors.white, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
              ),
            ),

            // Bottom instructions / decoded info
            Positioned(
              bottom: 12,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                decoration: BoxDecoration(
                  color: Colors.black.withValues(alpha: 0.8),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: AppTheme.borderSubtle),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.qr_code_scanner, color: AppTheme.cyan, size: 14),
                    const SizedBox(width: 6),
                    Text(
                      _hasScanned
                          ? 'Decoded: ${_orderIdController.text} (₹${_amountController.text})'
                          : 'Point camera at any UPI QR code',
                      style: const TextStyle(fontSize: 11, color: Colors.white),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildQuickScanToolbar() {
    return Row(
      children: [
        Expanded(
          child: OutlinedButton.icon(
            style: OutlinedButton.styleFrom(
              foregroundColor: AppTheme.cyan,
              side: const BorderSide(color: AppTheme.cyan),
              padding: const EdgeInsets.symmetric(vertical: 10),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              backgroundColor: AppTheme.cyan.withValues(alpha: 0.08),
            ),
            icon: const Icon(Icons.image, size: 18),
            label: const Text(
              'Pick Gallery Image',
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
            ),
            onPressed: _pickAndScanImageFromGallery,
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: OutlinedButton.icon(
            style: OutlinedButton.styleFrom(
              foregroundColor: AppTheme.emerald,
              side: const BorderSide(color: AppTheme.emerald),
              padding: const EdgeInsets.symmetric(vertical: 10),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              backgroundColor: AppTheme.emerald.withValues(alpha: 0.08),
            ),
            icon: const Icon(Icons.auto_awesome, size: 18),
            label: const Text(
              'Load Active Order',
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
            ),
            onPressed: () {
              final latest = ScreenshotManager().latestScreenshot;
              if (latest != null) {
                _selectAndDecodeScreenshot(latest);
              } else {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('No active order screenshot found. Generate one from Merchant screen!'),
                    backgroundColor: AppTheme.amber,
                  ),
                );
              }
            },
          ),
        ),
      ],
    );
  }

  Widget _buildCorner(int cornerIndex) {
    const double size = 18;
    const double thickness = 3.5;
    const Color color = AppTheme.emerald;

    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        border: Border(
          top: cornerIndex <= 1 ? const BorderSide(color: color, width: thickness) : BorderSide.none,
          bottom: cornerIndex >= 2 ? const BorderSide(color: color, width: thickness) : BorderSide.none,
          left: (cornerIndex == 0 || cornerIndex == 2) ? const BorderSide(color: color, width: thickness) : BorderSide.none,
          right: (cornerIndex == 1 || cornerIndex == 3) ? const BorderSide(color: color, width: thickness) : BorderSide.none,
        ),
      ),
    );
  }

  Widget _buildPaymentSettlementCard() {
    return Container(
      decoration: AppTheme.glassCardDecoration(
        borderColor: AppTheme.emerald.withValues(alpha: 0.3),
        bgColor: AppTheme.bgElevated,
      ),
      padding: const EdgeInsets.all(18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Flexible(
                child: Text(
                  'UPI PAYMENT SIMULATOR',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 1.0,
                    color: AppTheme.emerald,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: AppTheme.cyan.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Text(
                  'Auto-Settlement',
                  style: TextStyle(fontSize: 10, color: AppTheme.cyan, fontWeight: FontWeight.bold),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),

          // Paying To
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppTheme.bgCard,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.storefront, color: AppTheme.emerald, size: 20),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      PayViaApiService().merchantBusinessName,
                      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white),
                      overflow: TextOverflow.ellipsis,
                    ),
                    Text(
                      _merchantVpaController.text,
                      style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
            ],
          ),
          const Divider(color: AppTheme.borderSubtle, height: 24),

          // Amount to Pay & Order ID
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Amount to Pay (INR)', style: TextStyle(fontSize: 11, color: AppTheme.textSecondary)),
                    const SizedBox(height: 4),
                    TextFormField(
                      controller: _amountController,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      style: const TextStyle(fontWeight: FontWeight.bold, color: AppTheme.emerald, fontSize: 16),
                      decoration: const InputDecoration(
                        isDense: true,
                        contentPadding: EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                        prefixText: '₹ ',
                        prefixStyle: TextStyle(color: AppTheme.emerald, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Gateway Order ID', style: TextStyle(fontSize: 11, color: AppTheme.textSecondary)),
                    const SizedBox(height: 4),
                    TextFormField(
                      controller: _orderIdController,
                      style: const TextStyle(fontFamily: 'monospace', fontSize: 13, color: Colors.white),
                      decoration: const InputDecoration(
                        isDense: true,
                        contentPadding: EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          // Quick Amount Preset Chips (₹1, ₹2, ₹5, ₹10, ₹100, ₹250)
          const SizedBox(height: 10),
          const Text('Quick Amount Presets', style: TextStyle(fontSize: 11, color: AppTheme.textSecondary)),
          const SizedBox(height: 6),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: [1.0, 2.0, 5.0, 10.0, 100.0, 250.0].map((amt) {
              final parsed = double.tryParse(_amountController.text);
              final isSelected = parsed != null && (parsed == amt);
              return ChoiceChip(
                visualDensity: VisualDensity.compact,
                label: Text(
                  '₹${amt.toInt()}',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    color: isSelected ? Colors.black : Colors.white,
                  ),
                ),
                selected: isSelected,
                selectedColor: AppTheme.emerald,
                backgroundColor: AppTheme.bgCard,
                side: BorderSide(
                  color: isSelected ? AppTheme.emerald : AppTheme.borderSubtle,
                ),
                onSelected: (_) {
                  HapticFeedback.selectionClick();
                  setState(() {
                    _amountController.text = amt.toStringAsFixed(2);
                  });
                },
              );
            }).toList(),
          ),
          const SizedBox(height: 14),

          // Bank Account Selector
          const Text('Debit From Bank Account', style: TextStyle(fontSize: 11, color: AppTheme.textSecondary)),
          const SizedBox(height: 6),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            decoration: BoxDecoration(
              color: AppTheme.bgCard,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: AppTheme.borderSubtle),
            ),
            child: DropdownButtonHideUnderline(
              child: DropdownButton<String>(
                value: _selectedBank,
                isExpanded: true,
                dropdownColor: AppTheme.bgCard,
                icon: const Icon(Icons.keyboard_arrow_down, color: AppTheme.cyan),
                items: _bankAccounts.map((b) {
                  return DropdownMenuItem(
                    value: b,
                    child: Row(
                      children: [
                        const Icon(Icons.account_balance, size: 16, color: AppTheme.cyan),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            b,
                            style: const TextStyle(fontSize: 12, color: Colors.white),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  );
                }).toList(),
                onChanged: (val) => setState(() => _selectedBank = val!),
              ),
            ),
          ),
          const SizedBox(height: 14),

          // Simulated 12-Digit UTR
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('12-Digit Bank UTR / Ref No.', style: TextStyle(fontSize: 11, color: AppTheme.textSecondary)),
              InkWell(
                onTap: _generateNewUtr,
                child: const Row(
                  children: [
                    Icon(Icons.refresh, size: 13, color: AppTheme.cyan),
                    SizedBox(width: 4),
                    Text('Generate New', style: TextStyle(fontSize: 11, color: AppTheme.cyan, fontWeight: FontWeight.bold)),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          TextFormField(
            controller: _utrController,
            style: const TextStyle(fontFamily: 'monospace', letterSpacing: 1.5, fontWeight: FontWeight.bold, color: Colors.white),
            decoration: const InputDecoration(
              isDense: true,
              contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              prefixIcon: Icon(Icons.receipt, size: 18, color: AppTheme.cyan),
            ),
          ),
          const SizedBox(height: 14),

          // UPI App Selector Chips
          const Text('Simulate UPI Payment App', style: TextStyle(fontSize: 11, color: AppTheme.textSecondary)),
          const SizedBox(height: 6),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: ['Google Pay', 'PhonePe', 'Paytm', 'BHIM'].map((app) {
              final isSel = _selectedUpiApp == app;
              return ChoiceChip(
                label: Text(app, style: TextStyle(fontSize: 11, color: isSel ? Colors.black : Colors.white, fontWeight: FontWeight.w600)),
                selected: isSel,
                selectedColor: AppTheme.emerald,
                backgroundColor: AppTheme.bgCard,
                side: BorderSide(color: isSel ? AppTheme.emerald : AppTheme.borderSubtle),
                onSelected: (_) => setState(() => _selectedUpiApp = app),
              );
            }).toList(),
          ),
          const SizedBox(height: 20),

          // Primary Complete Payment Button
          SizedBox(
            width: double.infinity,
            height: 52,
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.emerald,
                foregroundColor: Colors.black,
                elevation: 6,
                shadowColor: AppTheme.emerald.withValues(alpha: 0.5),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              onPressed: _isSettling ? null : _handleCompletePayment,
              child: _isSettling
                  ? const SizedBox(
                      width: 22,
                      height: 22,
                      child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.black),
                    )
                  : Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.check_circle_outline, size: 22),
                        const SizedBox(width: 8),
                        Flexible(
                          child: Text(
                            'PAY ₹${_amountController.text} & COMPLETE SETTLEMENT',
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, letterSpacing: 0.5),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildScreenshotsTab(List<CapturedScreenshot> screenshots) {
    if (screenshots.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: AppTheme.bgElevated,
                  shape: BoxShape.circle,
                  border: Border.all(color: AppTheme.borderSubtle),
                ),
                child: const Icon(Icons.photo_library_outlined, size: 48, color: AppTheme.cyan),
              ),
              const SizedBox(height: 16),
              const Text(
                'No Captured Screenshots Yet',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
              ),
              const SizedBox(height: 8),
              const Text(
                'Generate an order from the Merchant screen, tap "Take & Save QR Screenshot", then return here to scan it!',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 12, color: AppTheme.textSecondary),
              ),
              const SizedBox(height: 20),
              ElevatedButton.icon(
                icon: const Icon(Icons.add, size: 18),
                label: const Text('Create New Order'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.cyan,
                  foregroundColor: Colors.black,
                ),
                onPressed: () => Navigator.pop(context),
              ),
            ],
          ),
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: screenshots.length,
      itemBuilder: (context, index) {
        final sc = screenshots[index];
        final isSelected = _activeScannedItem?.id == sc.id;

        return Container(
          margin: const EdgeInsets.only(bottom: 14),
          decoration: AppTheme.glassCardDecoration(
            borderColor: isSelected ? AppTheme.emerald : AppTheme.borderSubtle,
            glowing: isSelected,
          ),
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  // Thumbnail preview
                  Container(
                    width: 64,
                    height: 64,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: AppTheme.borderSubtle),
                    ),
                    child: sc.imageBytes != null
                        ? ClipRRect(
                            borderRadius: BorderRadius.circular(8),
                            child: Image.memory(sc.imageBytes!, fit: BoxFit.cover),
                          )
                        : const Center(
                            child: Icon(Icons.qr_code_2, color: Colors.black, size: 36),
                          ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              '₹${sc.amount.toStringAsFixed(2)}',
                              style: const TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                                color: AppTheme.emerald,
                              ),
                            ),
                            Text(
                              DateFormat('hh:mm:ss a').format(sc.capturedAt),
                              style: const TextStyle(fontSize: 10, color: AppTheme.textMuted),
                            ),
                          ],
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'Order: ${sc.orderId}',
                          style: const TextStyle(fontFamily: 'monospace', fontSize: 11, color: Colors.white),
                          overflow: TextOverflow.ellipsis,
                        ),
                        Text(
                          'Customer: ${sc.customerName}',
                          style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const Divider(color: AppTheme.borderSubtle, height: 18),
              Row(
                children: [
                  Expanded(
                    child: Text(
                      sc.upiId,
                      style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  const SizedBox(width: 8),
                  ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: isSelected ? AppTheme.emerald : AppTheme.bgElevated,
                      foregroundColor: isSelected ? Colors.black : Colors.white,
                      side: BorderSide(color: isSelected ? AppTheme.emerald : AppTheme.cyan),
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                    icon: Icon(
                      isSelected ? Icons.check : Icons.qr_code_scanner,
                      size: 15,
                    ),
                    label: Text(
                      isSelected ? 'LOADED' : 'SCAN THIS',
                      style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
                    ),
                    onPressed: () {
                      _selectAndDecodeScreenshot(sc);
                      setState(() => _selectedTab = 0);
                    },
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }
}
