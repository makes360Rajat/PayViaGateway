import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';
import '../models/payment_models.dart';
import '../services/payvia_api_service.dart';
import '../services/screenshot_manager.dart';
import '../utils/app_theme.dart';
import 'payment_checkout_screen.dart';
import 'qr_scanner_screen.dart';

class MerchantOrderScreen extends StatefulWidget {
  const MerchantOrderScreen({super.key});

  @override
  State<MerchantOrderScreen> createState() => _MerchantOrderScreenState();
}

class _MerchantOrderScreenState extends State<MerchantOrderScreen> {
  final _formKey = GlobalKey<FormState>();
  final _amountController = TextEditingController(text: '1.00');
  final _customerNameController = TextEditingController(text: 'Aarav Mehta');
  final _mobileController = TextEditingController(text: '9876543210');
  final _remarkController = TextEditingController(text: 'Demo UPI Purchase #1042');

  bool _isLoading = false;
  String? _errorMessage;

  final List<double> _quickAmounts = const [1, 2, 5, 10, 100, 250, 500, 1000, 2500, 4999];
  final List<Map<String, dynamic>> _recentOrders = [];

  @override
  void dispose() {
    _amountController.dispose();
    _customerNameController.dispose();
    _mobileController.dispose();
    _remarkController.dispose();
    super.dispose();
  }

  Future<void> _handleCreateOrder() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final amount = double.parse(_amountController.text.trim());
      final req = CreateOrderRequest(
        amount: amount,
        customerName: _customerNameController.text.trim(),
        customerMobile: _mobileController.text.trim(),
        remark1: _remarkController.text.trim(),
      );

      final orderRes = await PayViaApiService().createOrder(req);

      setState(() {
        _recentOrders.insert(0, {
          'orderId': orderRes.orderId,
          'amount': orderRes.amount,
          'customer': req.customerName,
          'time': DateTime.now(),
          'token': orderRes.linkToken,
        });
      });

      if (!mounted) return;

      // Navigate to Payment Checkout Screen
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) => PaymentCheckoutScreen(
            order: orderRes,
            customerName: req.customerName,
            customerMobile: req.customerMobile,
          ),
        ),
      );
    } catch (e) {
      setState(() {
        _errorMessage = e.toString().replaceAll('Exception: ', '');
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Failed: $_errorMessage'),
          backgroundColor: AppTheme.rose,
        ),
      );
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  void _selectQuickAmount(double amount) {
    HapticFeedback.selectionClick();
    setState(() {
      _amountController.text = amount.toStringAsFixed(2);
    });
  }

  @override
  Widget build(BuildContext context) {
    final currencyFormat = NumberFormat.currency(locale: 'en_IN', symbol: '₹');

    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                gradient: AppTheme.emeraldGradient,
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.flash_on, color: Colors.black, size: 18),
            ),
            const SizedBox(width: 10),
            const Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text('PayVia360 Gateway', style: TextStyle(fontSize: 16), overflow: TextOverflow.ellipsis),
                  Text(
                    'Merchant Integration Hub',
                    style: TextStyle(fontSize: 11, color: AppTheme.emerald, fontWeight: FontWeight.w400),
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          // Scanner Shortcut Button
          IconButton(
            tooltip: 'Open QR Scanner & Simulator',
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
          const SizedBox(width: 8),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Merchant Profile Banner
              _buildMerchantHeader(),
              const SizedBox(height: 16),

              // Order Creation Form Card
              Container(
                decoration: AppTheme.glassCardDecoration(),
                padding: const EdgeInsets.all(18),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Flexible(
                          child: Text(
                            'CREATE PAYMENT ORDER',
                            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                  letterSpacing: 1.1,
                                  color: AppTheme.emerald,
                                  fontWeight: FontWeight.bold,
                                ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: AppTheme.emerald.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: AppTheme.emerald.withValues(alpha: 0.4)),
                          ),
                          child: const Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.lock, size: 11, color: AppTheme.emerald),
                              SizedBox(width: 4),
                              Text('UPI 2.0 Dynamic', style: TextStyle(fontSize: 10, color: AppTheme.emerald, fontWeight: FontWeight.bold)),
                            ],
                          ),
                        )
                      ],
                    ),
                    const SizedBox(height: 16),

                    // Amount Input
                    Text('Order Amount (INR)', style: Theme.of(context).textTheme.bodyMedium),
                    const SizedBox(height: 6),
                    TextFormField(
                      controller: _amountController,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.white),
                      decoration: InputDecoration(
                        prefixIcon: const Padding(
                          padding: EdgeInsets.only(left: 14, right: 8, top: 12),
                          child: Text('₹', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: AppTheme.emerald)),
                        ),
                        hintText: '0.00',
                        suffixIcon: IconButton(
                          icon: const Icon(Icons.clear, size: 18),
                          onPressed: () => _amountController.clear(),
                        ),
                      ),
                      validator: (value) {
                        if (value == null || value.trim().isEmpty) return 'Enter amount';
                        final num = double.tryParse(value);
                        if (num == null || num <= 0) return 'Enter a valid amount';
                        return null;
                      },
                    ),
                    const SizedBox(height: 12),

                    // Quick Amounts Chips
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: _quickAmounts.map((amt) {
                        final parsed = double.tryParse(_amountController.text);
                        final isSelected = parsed != null && (parsed == amt);
                        return ChoiceChip(
                          label: Text(
                            currencyFormat.format(amt).replaceAll('.00', ''),
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: isSelected ? Colors.black : Colors.white,
                            ),
                          ),
                          selected: isSelected,
                          selectedColor: AppTheme.emerald,
                          backgroundColor: AppTheme.bgElevated,
                          side: BorderSide(
                            color: isSelected ? AppTheme.emerald : AppTheme.borderSubtle,
                          ),
                          onSelected: (_) => _selectQuickAmount(amt),
                        );
                      }).toList(),
                    ),
                    const SizedBox(height: 20),

                    // Customer Name
                    Text('Customer Full Name', style: Theme.of(context).textTheme.bodyMedium),
                    const SizedBox(height: 6),
                    TextFormField(
                      controller: _customerNameController,
                      decoration: const InputDecoration(
                        prefixIcon: Icon(Icons.person_outline, size: 20, color: AppTheme.cyan),
                        hintText: 'e.g. Aarav Mehta',
                      ),
                      validator: (value) =>
                          value == null || value.trim().isEmpty ? 'Enter customer name' : null,
                    ),
                    const SizedBox(height: 14),

                    // Customer Mobile
                    Text('Customer Mobile (for SMS/WhatsApp)', style: Theme.of(context).textTheme.bodyMedium),
                    const SizedBox(height: 6),
                    TextFormField(
                      controller: _mobileController,
                      keyboardType: TextInputType.phone,
                      decoration: const InputDecoration(
                        prefixIcon: Icon(Icons.phone_android, size: 20, color: AppTheme.cyan),
                        hintText: '9876543210',
                      ),
                      validator: (value) =>
                          value == null || value.trim().length < 10 ? 'Enter valid 10-digit mobile' : null,
                    ),
                    const SizedBox(height: 14),

                    // Order Description / Remark
                    Text('Item / Order Note', style: Theme.of(context).textTheme.bodyMedium),
                    const SizedBox(height: 6),
                    TextFormField(
                      controller: _remarkController,
                      decoration: const InputDecoration(
                        prefixIcon: Icon(Icons.receipt_long_outlined, size: 20, color: AppTheme.cyan),
                        hintText: 'e.g. Order #1042 or Pro Subscription',
                      ),
                    ),
                    const SizedBox(height: 24),

                    // Submit Button
                    SizedBox(
                      width: double.infinity,
                      height: 52,
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.emerald,
                          foregroundColor: Colors.black,
                          elevation: 6,
                          shadowColor: AppTheme.emerald.withValues(alpha: 0.5),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        onPressed: _isLoading ? null : _handleCreateOrder,
                        child: _isLoading
                            ? const SizedBox(
                                width: 22,
                                height: 22,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2.5,
                                  color: Colors.black,
                                ),
                              )
                            : const Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(Icons.qr_code_2, size: 22),
                                  SizedBox(width: 8),
                                  Flexible(
                                    child: Text(
                                      'GENERATE DYNAMIC QR & PAY LINK',
                                      style: TextStyle(
                                        fontSize: 13,
                                        fontWeight: FontWeight.bold,
                                        letterSpacing: 0.5,
                                      ),
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                ],
                              ),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 16),

              // Dual-App Feature Card: Scanner and Screenshot Completer
              _buildScannerPromoCard(),

              if (_recentOrders.isNotEmpty) ...[
                const SizedBox(height: 20),
                Text(
                  'RECENT GENERATED ORDERS',
                  style: Theme.of(context).textTheme.titleSmall?.copyWith(
                        color: AppTheme.textSecondary,
                        letterSpacing: 1.1,
                        fontWeight: FontWeight.bold,
                      ),
                ),
                const SizedBox(height: 10),
                ..._recentOrders.map((ord) => _buildRecentOrderTile(ord)),
              ],

              const SizedBox(height: 30),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildMerchantHeader() {
    return Container(
      decoration: AppTheme.glassCardDecoration(
        borderColor: AppTheme.emerald.withValues(alpha: 0.3),
        bgColor: AppTheme.bgElevated,
      ),
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              gradient: AppTheme.emeraldGradient,
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Center(
              child: Icon(Icons.storefront, color: Colors.black, size: 24),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Flexible(
                      child: Text(
                        PayViaApiService().merchantBusinessName,
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    const SizedBox(width: 4),
                    const Icon(Icons.verified, color: AppTheme.emerald, size: 15),
                  ],
                ),
                const SizedBox(height: 3),
                Row(
                  children: [
                    Container(
                      width: 7,
                      height: 7,
                      decoration: const BoxDecoration(
                        color: AppTheme.emerald,
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 5),
                    const Expanded(
                      child: Text(
                        'Live Engine (payvia360.com) • Zero 0% Fee',
                        style: TextStyle(fontSize: 11, color: AppTheme.textSecondary),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: AppTheme.emerald.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(8),
            ),
            child: const Text(
              'ACTIVE',
              style: TextStyle(
                color: AppTheme.emerald,
                fontSize: 10,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildScannerPromoCard() {
    final screenshotCount = ScreenshotManager().screenshots.length;

    return Container(
      decoration: AppTheme.glassCardDecoration(
        borderColor: AppTheme.cyan.withValues(alpha: 0.3),
        bgColor: const Color(0xFF0C1B2A),
      ),
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: AppTheme.cyan.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(Icons.camera_enhance, color: AppTheme.cyan, size: 24),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'QR Scanner & Completer',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 2),
                Text(
                  screenshotCount > 0
                      ? '$screenshotCount screenshot(s) ready'
                      : 'Scan QR or load screenshot to complete',
                  style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary),
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.cyan,
              foregroundColor: Colors.black,
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
              minimumSize: const Size(60, 36),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (context) => const QRScannerScreen()),
              );
            },
            child: const Text('Scan QR', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
          ),
        ],
      ),
    );
  }

  Widget _buildRecentOrderTile(Map<String, dynamic> ord) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: AppTheme.glassCardDecoration(radius: 12),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: AppTheme.bgElevated,
              borderRadius: BorderRadius.circular(8),
            ),
            child: const Icon(Icons.qr_code, size: 18, color: AppTheme.emerald),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  ord['orderId'],
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.white),
                  overflow: TextOverflow.ellipsis,
                ),
                Text(
                  '${ord['customer']} • ${DateFormat('hh:mm a').format(ord['time'])}',
                  style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary),
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Text(
            '₹${(ord['amount'] as double).toStringAsFixed(2)}',
            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppTheme.emerald),
          ),
        ],
      ),
    );
  }
}
