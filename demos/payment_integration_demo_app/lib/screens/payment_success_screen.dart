import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';
import '../models/payment_models.dart';
import '../utils/app_theme.dart';

class PaymentSuccessScreen extends StatelessWidget {
  final CheckoutData checkoutData;
  final String customerName;

  const PaymentSuccessScreen({
    super.key,
    required this.checkoutData,
    required this.customerName,
  });

  @override
  Widget build(BuildContext context) {
    final currencyFormat = NumberFormat.currency(locale: 'en_IN', symbol: '₹');
    final formattedTime = DateFormat('dd MMM yyyy, hh:mm:ss a')
        .format(checkoutData.paidAt ?? DateTime.now());

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) {
        if (!didPop) {
          Navigator.of(context).popUntil((route) => route.isFirst);
        }
      },
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Payment Receipt'),
          automaticallyImplyLeading: false,
          actions: [
            IconButton(
              icon: const Icon(Icons.close),
              onPressed: () {
                Navigator.of(context).popUntil((route) => route.isFirst);
              },
            ),
          ],
        ),
        body: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            children: [
              const SizedBox(height: 10),

              // Animated Success Checkmark Badge
              Container(
                width: 90,
                height: 90,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: AppTheme.emeraldGradient,
                  boxShadow: [
                    BoxShadow(
                      color: AppTheme.emerald.withValues(alpha: 0.4),
                      blurRadius: 30,
                      spreadRadius: 6,
                    ),
                  ],
                ),
                child: const Center(
                  child: Icon(Icons.check, size: 54, color: Colors.black),
                ),
              ),
              const SizedBox(height: 20),

              // Success Title
              const Text(
                'Payment Completed!',
                style: TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                'Settled instantly via PayVia360 Gateway',
                style: TextStyle(
                  fontSize: 13,
                  color: AppTheme.emerald.withValues(alpha: 0.9),
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(height: 20),

              // Amount Card
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 16),
                decoration: BoxDecoration(
                  color: AppTheme.bgElevated,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppTheme.emerald.withValues(alpha: 0.4)),
                ),
                child: Column(
                  children: [
                    const Text(
                      'TOTAL AMOUNT PAID',
                      style: TextStyle(
                        fontSize: 11,
                        letterSpacing: 1.0,
                        color: AppTheme.textSecondary,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      currencyFormat.format(checkoutData.amount),
                      style: const TextStyle(
                        fontSize: 34,
                        fontWeight: FontWeight.bold,
                        color: AppTheme.emerald,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              // Receipt Details Card
              Container(
                decoration: AppTheme.glassCardDecoration(),
                padding: const EdgeInsets.all(18),
                child: Column(
                  children: [
                    _buildReceiptRow(
                      'Merchant',
                      checkoutData.merchantName,
                      isVerified: true,
                    ),
                    const Divider(color: AppTheme.borderSubtle, height: 20),
                    _buildReceiptRow(
                      'UPI VPA ID',
                      checkoutData.upiId,
                    ),
                    const Divider(color: AppTheme.borderSubtle, height: 20),
                    _buildReceiptRow(
                      'Customer Name',
                      customerName,
                    ),
                    const Divider(color: AppTheme.borderSubtle, height: 20),
                    _buildReceiptRow(
                      'Order ID',
                      checkoutData.orderId,
                      isMonospace: true,
                      canCopy: true,
                      context: context,
                    ),
                    const Divider(color: AppTheme.borderSubtle, height: 20),
                    _buildReceiptRow(
                      'Bank UTR Ref',
                      checkoutData.utr ?? '425891726301',
                      isMonospace: true,
                      canCopy: true,
                      highlight: true,
                      context: context,
                    ),
                    const Divider(color: AppTheme.borderSubtle, height: 20),
                    _buildReceiptRow(
                      'Payment Status',
                      'TXN_SUCCESS',
                      isStatusBadge: true,
                    ),
                    const Divider(color: AppTheme.borderSubtle, height: 20),
                    _buildReceiptRow(
                      'Timestamp',
                      formattedTime,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              // Action Buttons
              SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.emerald,
                    foregroundColor: Colors.black,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  icon: const Icon(Icons.add_shopping_cart, size: 20),
                  label: const Text(
                    'CREATE ANOTHER PAYMENT ORDER',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                  ),
                  onPressed: () {
                    Navigator.of(context).popUntil((route) => route.isFirst);
                  },
                ),
              ),
              const SizedBox(height: 12),

              SizedBox(
                width: double.infinity,
                height: 48,
                child: OutlinedButton.icon(
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppTheme.cyan,
                    side: const BorderSide(color: AppTheme.cyan),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  icon: const Icon(Icons.home, size: 20),
                  label: const Text(
                    'RETURN TO MERCHANT HUB',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                  ),
                  onPressed: () {
                    Navigator.of(context).popUntil((route) => route.isFirst);
                  },
                ),
              ),
              const SizedBox(height: 30),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildReceiptRow(
    String label,
    String value, {
    bool isVerified = false,
    bool isMonospace = false,
    bool canCopy = false,
    bool highlight = false,
    bool isStatusBadge = false,
    BuildContext? context,
  }) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary),
        ),
        const SizedBox(width: 8),
        Flexible(
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (isStatusBadge)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: AppTheme.emerald.withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: AppTheme.emerald),
                  ),
                  child: const Row(
                    children: [
                      Icon(Icons.check_circle, size: 12, color: AppTheme.emerald),
                      SizedBox(width: 4),
                      Text(
                        'SUCCESS',
                        style: TextStyle(
                          color: AppTheme.emerald,
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                )
              else
                Flexible(
                  child: Text(
                    value,
                    style: TextStyle(
                      fontSize: 12,
                      fontFamily: isMonospace ? 'monospace' : null,
                      fontWeight: highlight || isVerified
                          ? FontWeight.bold
                          : FontWeight.w600,
                      color: highlight ? AppTheme.cyan : Colors.white,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              if (isVerified) ...[
                const SizedBox(width: 4),
                const Icon(Icons.verified, color: AppTheme.emerald, size: 14),
              ],
              if (canCopy && context != null) ...[
                const SizedBox(width: 6),
                InkWell(
                  onTap: () {
                    Clipboard.setData(ClipboardData(text: value));
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text('$label copied to clipboard'),
                        duration: const Duration(seconds: 1),
                      ),
                    );
                  },
                  child: const Icon(Icons.copy, size: 14, color: AppTheme.cyan),
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }
}
