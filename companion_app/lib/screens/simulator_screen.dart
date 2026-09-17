import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../services/api_client.dart';

class SimulatorScreen extends StatefulWidget {
  const SimulatorScreen({super.key});

  @override
  State<SimulatorScreen> createState() => _SimulatorScreenState();
}

class _SimulatorScreenState extends State<SimulatorScreen> {
  // 0 = Bank SMS, 1 = UPI Push Notification (GPay/PhonePe)
  int _simulatorMode = 1;
  bool _isLoading = false;
  bool _hasMatchedAnyOrder = false;

  final TextEditingController _senderController = TextEditingController(text: 'AD-HDFCBK');
  final TextEditingController _messageController = TextEditingController(
    text: 'Dear Customer, your A/c credited with Rs 1.18 on 17-SEP-26 by UPI/419827391823/Ref No.',
  );

  String _selectedPackage = 'com.google.android.apps.nbu.paisa.user';
  final TextEditingController _notifTitleController = TextEditingController(
    text: 'RAHUL paid you ₹1.18',
  );
  final TextEditingController _notifBodyController = TextEditingController(
    text: 'Google Pay • UPI Ref 419827391823 • Paid successfully',
  );

  Map<String, dynamic>? _lastResult;

  final List<Map<String, String>> _upiApps = [
    {'name': 'Google Pay', 'package': 'com.google.android.apps.nbu.paisa.user'},
    {'name': 'PhonePe', 'package': 'com.phonepe.app'},
    {'name': 'Paytm', 'package': 'net.one97.paytm'},
    {'name': 'BHIM UPI', 'package': 'in.org.npci.upiapp'},
  ];

  @override
  void dispose() {
    _senderController.dispose();
    _messageController.dispose();
    _notifTitleController.dispose();
    _notifBodyController.dispose();
    super.dispose();
  }

  void _applyPreset({
    required int mode,
    String? sender,
    String? message,
    String? pkg,
    String? title,
    String? body,
  }) {
    setState(() {
      _simulatorMode = mode;
      if (sender != null) _senderController.text = sender;
      if (message != null) _messageController.text = message;
      if (pkg != null) _selectedPackage = pkg;
      if (title != null) _notifTitleController.text = title;
      if (body != null) _notifBodyController.text = body;
    });
  }

  Future<void> _runSimulation() async {
    setState(() {
      _isLoading = true;
      _lastResult = null;
    });

    try {
      Map<String, dynamic> result;
      if (_simulatorMode == 1) {
        final title = _notifTitleController.text.trim();
        final body = _notifBodyController.text.trim();
        if (title.isEmpty) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Please enter a notification title')),
          );
          setState(() => _isLoading = false);
          return;
        }

        result = await ApiClient.ingestNotification(
          packageName: _selectedPackage,
          title: title,
          message: body,
        );
      } else {
        final sender = _senderController.text.trim();
        final message = _messageController.text.trim();
        if (sender.isEmpty || message.isEmpty) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Please enter sender header and SMS message')),
          );
          setState(() => _isLoading = false);
          return;
        }

        result = await ApiClient.ingestSms(
          sender: sender,
          message: message,
        );
      }

      final isMatched = result['matched'] == true;
      if (isMatched) {
        _hasMatchedAnyOrder = true;
      }

      setState(() {
        _lastResult = result;
        _isLoading = false;
      });

      if (!mounted) return;

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            isMatched
                ? '🎉 Matched with Order: ${result['orderId'] ?? result['order_id'] ?? 'Verified'}'
                : (result['message']?.toString() ?? 'Simulation processed'),
          ),
          backgroundColor: isMatched ? const Color(0xFF10B981) : Colors.indigo.shade600,
          duration: const Duration(seconds: 4),
        ),
      );
    } catch (e) {
      setState(() {
        _lastResult = {'status': false, 'error': e.toString()};
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) {
        if (didPop) return;
        Navigator.pop(context, _hasMatchedAnyOrder);
      },
      child: Scaffold(
        backgroundColor: const Color(0xFF060B16),
        appBar: AppBar(
          backgroundColor: const Color(0xFF090D16),
          elevation: 0,
          leading: IconButton(
            icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.white70, size: 18),
            onPressed: () => Navigator.pop(context, _hasMatchedAnyOrder),
          ),
          title: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: const Color(0xFF6366F1).withValues(alpha: 0.15),
                  shape: BoxShape.circle,
                  border: Border.all(color: const Color(0xFF6366F1).withValues(alpha: 0.3)),
                ),
                child: const Icon(Icons.bolt_rounded, color: Color(0xFF818CF8), size: 16),
              ),
              const SizedBox(width: 8),
              Text(
                'Ingest Simulator',
                style: GoogleFonts.spaceGrotesk(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                ),
              ),
            ],
          ),
          actions: [
            Container(
              margin: const EdgeInsets.only(right: 14),
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.06),
                borderRadius: BorderRadius.circular(6),
                border: Border.all(color: Colors.white10),
              ),
              child: Text(
                'Sandbox',
                style: GoogleFonts.jetBrainsMono(
                  color: Colors.white60,
                  fontSize: 10,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ],
        ),
        body: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Info Banner
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      const Color(0xFF6366F1).withValues(alpha: 0.12),
                      const Color(0xFF00E5FF).withValues(alpha: 0.05),
                    ],
                  ),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFF6366F1).withValues(alpha: 0.3)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.info_outline_rounded, color: Color(0xFF818CF8), size: 20),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        'Simulate payment notifications & SMS locally to test automatic order verification without waiting for live bank alerts.',
                        style: GoogleFonts.dmSans(color: Colors.white70, fontSize: 11, height: 1.4),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // Mode Switcher (Push Notif vs Bank SMS)
              Container(
                padding: const EdgeInsets.all(4),
                decoration: BoxDecoration(
                  color: const Color(0xFF111827),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.white10),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: InkWell(
                        onTap: () => setState(() => _simulatorMode = 1),
                        borderRadius: BorderRadius.circular(9),
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 200),
                          padding: const EdgeInsets.symmetric(vertical: 10),
                          decoration: BoxDecoration(
                            color: _simulatorMode == 1
                                ? const Color(0xFF6366F1)
                                : Colors.transparent,
                            borderRadius: BorderRadius.circular(9),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                Icons.notifications_active_rounded,
                                size: 15,
                                color: _simulatorMode == 1 ? Colors.white : Colors.white54,
                              ),
                              const SizedBox(width: 6),
                              Text(
                                'GPay / UPI Notif',
                                style: GoogleFonts.spaceGrotesk(
                                  color: _simulatorMode == 1 ? Colors.white : Colors.white60,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 12,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                    Expanded(
                      child: InkWell(
                        onTap: () => setState(() => _simulatorMode = 0),
                        borderRadius: BorderRadius.circular(9),
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 200),
                          padding: const EdgeInsets.symmetric(vertical: 10),
                          decoration: BoxDecoration(
                            color: _simulatorMode == 0
                                ? const Color(0xFF6366F1)
                                : Colors.transparent,
                            borderRadius: BorderRadius.circular(9),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                Icons.sms_rounded,
                                size: 15,
                                color: _simulatorMode == 0 ? Colors.white : Colors.white54,
                              ),
                              const SizedBox(width: 6),
                              Text(
                                'Bank SMS',
                                style: GoogleFonts.spaceGrotesk(
                                  color: _simulatorMode == 0 ? Colors.white : Colors.white60,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 12,
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
              const SizedBox(height: 16),

              // Quick Presets
              Text(
                'Quick Test Presets',
                style: GoogleFonts.spaceGrotesk(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                  fontSize: 13,
                ),
              ),
              const SizedBox(height: 8),
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: [
                    _buildPresetChip(
                      label: 'GPay ₹1.18',
                      icon: Icons.payments_rounded,
                      color: const Color(0xFF00E5FF),
                      onTap: () => _applyPreset(
                        mode: 1,
                        pkg: 'com.google.android.apps.nbu.paisa.user',
                        title: 'RAHUL paid you ₹1.18',
                        body: 'Google Pay • UPI Ref 419827391823 • Paid successfully',
                      ),
                    ),
                    const SizedBox(width: 8),
                    _buildPresetChip(
                      label: 'PhonePe ₹100',
                      icon: Icons.flash_on_rounded,
                      color: const Color(0xFF8B5CF6),
                      onTap: () => _applyPreset(
                        mode: 1,
                        pkg: 'com.phonepe.app',
                        title: 'Received ₹100.00 on PhonePe',
                        body: 'From Ramesh Kumar • Transaction ID T24091712000001',
                      ),
                    ),
                    const SizedBox(width: 8),
                    _buildPresetChip(
                      label: 'HDFC SMS ₹1.18',
                      icon: Icons.account_balance_rounded,
                      color: const Color(0xFF10B981),
                      onTap: () => _applyPreset(
                        mode: 0,
                        sender: 'AD-HDFCBK',
                        message:
                            'Dear Customer, your A/c credited with Rs 1.18 on 17-SEP-26 by UPI/419827391823/Ref No.',
                      ),
                    ),
                    const SizedBox(width: 8),
                    _buildPresetChip(
                      label: 'SBI SMS ₹249',
                      icon: Icons.account_balance_wallet_rounded,
                      color: Colors.amberAccent,
                      onTap: () => _applyPreset(
                        mode: 0,
                        sender: 'AX-SBINB',
                        message:
                            'Your A/c ending 4821 is credited with INR 249.00 on 17-Sep-26 via UPI/Ref 419827391825/SBI.',
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 18),

              // Simulation Form Card
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
                    if (_simulatorMode == 1) ...[
                      // Select Provider App
                      Text(
                        'Target Provider App',
                        style: GoogleFonts.dmSans(color: Colors.white70, fontSize: 11),
                      ),
                      const SizedBox(height: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        decoration: BoxDecoration(
                          color: const Color(0xFF090D16),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: Colors.white10),
                        ),
                        child: DropdownButtonHideUnderline(
                          child: DropdownButton<String>(
                            value: _selectedPackage,
                            isExpanded: true,
                            dropdownColor: const Color(0xFF111827),
                            style: GoogleFonts.dmSans(color: Colors.white, fontSize: 12),
                            items: _upiApps.map((app) {
                              return DropdownMenuItem<String>(
                                value: app['package'],
                                child: Text(app['name']!),
                              );
                            }).toList(),
                            onChanged: (val) {
                              if (val != null) setState(() => _selectedPackage = val);
                            },
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),

                      // Notification Title
                      Text(
                        'Notification Title',
                        style: GoogleFonts.dmSans(color: Colors.white70, fontSize: 11),
                      ),
                      const SizedBox(height: 6),
                      TextField(
                        controller: _notifTitleController,
                        style: GoogleFonts.dmSans(color: Colors.white, fontSize: 12),
                        decoration: InputDecoration(
                          hintText: 'e.g. RAHUL paid you ₹1.18',
                          hintStyle: const TextStyle(color: Colors.white30, fontSize: 12),
                          filled: true,
                          fillColor: const Color(0xFF090D16),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(8),
                            borderSide: BorderSide.none,
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),

                      // Notification Body
                      Text(
                        'Notification Message / Body',
                        style: GoogleFonts.dmSans(color: Colors.white70, fontSize: 11),
                      ),
                      const SizedBox(height: 6),
                      TextField(
                        controller: _notifBodyController,
                        maxLines: 2,
                        style: GoogleFonts.dmSans(color: Colors.white, fontSize: 12),
                        decoration: InputDecoration(
                          hintText: 'e.g. UPI Ref 419827391823 • Paid successfully',
                          hintStyle: const TextStyle(color: Colors.white30, fontSize: 12),
                          filled: true,
                          fillColor: const Color(0xFF090D16),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(8),
                            borderSide: BorderSide.none,
                          ),
                        ),
                      ),
                    ] else ...[
                      // SMS Sender Header
                      Text(
                        'Sender Header',
                        style: GoogleFonts.dmSans(color: Colors.white70, fontSize: 11),
                      ),
                      const SizedBox(height: 6),
                      TextField(
                        controller: _senderController,
                        style: GoogleFonts.dmSans(color: Colors.white, fontSize: 12),
                        decoration: InputDecoration(
                          hintText: 'e.g. AD-HDFCBK or AX-SBINB',
                          hintStyle: const TextStyle(color: Colors.white30, fontSize: 12),
                          filled: true,
                          fillColor: const Color(0xFF090D16),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(8),
                            borderSide: BorderSide.none,
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),

                      // SMS Body
                      Text(
                        'Raw Bank SMS Message',
                        style: GoogleFonts.dmSans(color: Colors.white70, fontSize: 11),
                      ),
                      const SizedBox(height: 6),
                      TextField(
                        controller: _messageController,
                        maxLines: 3,
                        style: GoogleFonts.dmSans(color: Colors.white, fontSize: 12),
                        decoration: InputDecoration(
                          hintText: 'e.g. Dear Customer, your A/c credited with Rs 1.18...',
                          hintStyle: const TextStyle(color: Colors.white30, fontSize: 12),
                          filled: true,
                          fillColor: const Color(0xFF090D16),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(8),
                            borderSide: BorderSide.none,
                          ),
                        ),
                      ),
                    ],

                    const SizedBox(height: 16),

                    // Trigger Button
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: _simulatorMode == 1
                              ? const Color(0xFF6366F1)
                              : Colors.teal.shade600,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 13),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                        onPressed: _isLoading ? null : _runSimulation,
                        icon: _isLoading
                            ? const SizedBox(
                                width: 18,
                                height: 18,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: Colors.white,
                                ),
                              )
                            : const Icon(Icons.send_rounded, size: 16),
                        label: Text(
                          _isLoading
                              ? 'Pushing & Ingesting...'
                              : 'Push & Simulate Ingestion →',
                          style: GoogleFonts.spaceGrotesk(
                            fontWeight: FontWeight.bold,
                            fontSize: 13,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              // Simulation Result Card (If executed)
              if (_lastResult != null) ...[
                const SizedBox(height: 16),
                _buildResultCard(_lastResult!),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPresetChip({
    required String label,
    required IconData icon,
    required Color color,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: color.withValues(alpha: 0.3)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 14, color: color),
            const SizedBox(width: 6),
            Text(
              label,
              style: GoogleFonts.dmSans(
                color: Colors.white,
                fontSize: 11,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildResultCard(Map<String, dynamic> res) {
    final isMatched = res['matched'] == true;
    final orderId = (res['orderId'] ?? res['order_id'])?.toString();
    final message = res['message']?.toString() ?? (isMatched ? 'Payment auto-matched!' : 'No pending order matched');
    final status = res['status'] == true;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isMatched
            ? const Color(0xFF062319)
            : (status ? const Color(0xFF141A29) : const Color(0xFF270E14)),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: isMatched
              ? const Color(0xFF10B981)
              : (status ? Colors.indigo.shade400 : Colors.redAccent.shade400),
          width: 1.2,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                isMatched
                    ? Icons.check_circle_rounded
                    : (status ? Icons.info_rounded : Icons.error_outline_rounded),
                color: isMatched
                    ? const Color(0xFF10B981)
                    : (status ? const Color(0xFF00E5FF) : Colors.redAccent),
                size: 20,
              ),
              const SizedBox(width: 8),
              Text(
                isMatched ? 'Auto-Matched & Settled!' : 'Ingestion Response',
                style: GoogleFonts.spaceGrotesk(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                  fontSize: 14,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            message,
            style: GoogleFonts.dmSans(color: Colors.white70, fontSize: 12),
          ),
          if (orderId != null && orderId.isNotEmpty) ...[
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                color: Colors.black26,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.white12),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text('Matched Order: ', style: GoogleFonts.dmSans(color: Colors.white60, fontSize: 11)),
                  Text(orderId, style: GoogleFonts.jetBrainsMono(color: const Color(0xFF10B981), fontWeight: FontWeight.bold, fontSize: 12)),
                ],
              ),
            ),
          ],
          const SizedBox(height: 10),
          Text(
            'Raw Server Payload: $res',
            style: GoogleFonts.jetBrainsMono(color: Colors.white30, fontSize: 9),
          ),
        ],
      ),
    );
  }
}
