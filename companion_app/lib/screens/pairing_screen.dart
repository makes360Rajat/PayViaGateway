import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../services/api_client.dart';

class PairingScreen extends StatefulWidget {
  const PairingScreen({super.key});

  @override
  State<PairingScreen> createState() => _PairingScreenState();
}

class _PairingScreenState extends State<PairingScreen> {
  // Domain URL is permanently locked and non-editable
  final String _productionDomain = 'https://payvia360.com';
  final TextEditingController _serverUrlController = TextEditingController(text: 'https://payvia360.com');
  final TextEditingController _tokenController = TextEditingController(text: '');
  final TextEditingController _deviceNameController = TextEditingController(text: 'Android SMS Gateway Phone');

  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _serverUrlController.text = _productionDomain;

    ApiClient.getPairingCode().then((code) {
      if (mounted && code != null && code.isNotEmpty && code != 'PAIR-8892' && code != 'PAIR-8173') {
        setState(() {
          _tokenController.text = code;
        });
      }
    });

    _tokenController.addListener(() {
      if (mounted) setState(() {});
    });
    _deviceNameController.addListener(() {
      if (mounted) setState(() {});
    });
  }

  @override
  void dispose() {
    _serverUrlController.dispose();
    _tokenController.dispose();
    _deviceNameController.dispose();
    super.dispose();
  }

  Future<void> _handlePair() async {
    final inputCode = _tokenController.text.trim();
    final url = _productionDomain;
    final name = _deviceNameController.text.trim();

    if (inputCode.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please enter Pairing ID / Code'),
          backgroundColor: Colors.redAccent,
        ),
      );
      return;
    }

    setState(() => _isLoading = true);
    await ApiClient.setServerUrl(url);
    final success = await ApiClient.pairDevice(
      pairingCodeOrToken: inputCode,
      deviceName: name.isEmpty ? 'Android SMS Gateway Phone' : name,
      serverUrl: url,
    );
    setState(() => _isLoading = false);

    if (success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Row(
            children: [
              const Icon(Icons.check_circle_rounded, color: Colors.white, size: 20),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Successfully paired with PayVia Gateway!',
                  style: GoogleFonts.spaceGrotesk(fontWeight: FontWeight.bold),
                ),
              ),
            ],
          ),
          backgroundColor: const Color(0xFF10B981),
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
      );
      Navigator.pop(context, true);
    } else if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Pairing failed for "$inputCode". Verify code on web dashboard.'),
          backgroundColor: Colors.redAccent,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF050B18),
      body: Container(
        decoration: const BoxDecoration(
          gradient: RadialGradient(
            center: Alignment(0.8, -0.6),
            radius: 1.2,
            colors: [
              Color(0xFF0F1E42),
              Color(0xFF050B18),
            ],
          ),
        ),
        child: SafeArea(
          child: Column(
            children: [
              // Top Navigation Header with NO Overlap
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Top Row: Back button on left, Secure badge on right
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        // Circular back button
                        GestureDetector(
                          onTap: () => Navigator.pop(context),
                          child: Container(
                            height: 40,
                            width: 40,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: const Color(0xFF0E1A33).withValues(alpha: 0.9),
                              border: Border.all(color: const Color(0xFF1F3563)),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withValues(alpha: 0.35),
                                  blurRadius: 8,
                                ),
                              ],
                            ),
                            child: const Icon(
                              Icons.arrow_back_rounded,
                              color: Colors.white,
                              size: 20,
                            ),
                          ),
                        ),

                        // Secure & Encrypted badge
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                          decoration: BoxDecoration(
                            color: const Color(0xFF00E5FF).withValues(alpha: 0.08),
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(
                              color: const Color(0xFF00E5FF).withValues(alpha: 0.35),
                            ),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(
                                Icons.shield_outlined,
                                size: 13,
                                color: Color(0xFF00E5FF),
                              ),
                              const SizedBox(width: 5),
                              Text(
                                'Secure & Encrypted',
                                style: GoogleFonts.dmSans(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w600,
                                  color: const Color(0xFF00E5FF),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),

                    // Title & Subtitle with plenty of horizontal space
                    Wrap(
                      crossAxisAlignment: WrapCrossAlignment.center,
                      children: [
                        Text(
                          'Pair Device with ',
                          style: GoogleFonts.spaceGrotesk(
                            fontSize: 22,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                        ShaderMask(
                          shaderCallback: (bounds) => const LinearGradient(
                            colors: [Color(0xFF00E5FF), Color(0xFF9D4EDD)],
                          ).createShader(bounds),
                          child: Text(
                            'Gateway',
                            style: GoogleFonts.spaceGrotesk(
                              fontSize: 22,
                              fontWeight: FontWeight.bold,
                              color: Colors.white,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 3),
                    Text(
                      'Connect your device to start processing payments',
                      style: GoogleFonts.dmSans(
                        fontSize: 12,
                        color: const Color(0xFF7B8DAE),
                      ),
                    ),
                  ],
                ),
              ),

              // Scrollable Form Body
              Expanded(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 6),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // Top Banner with 3D Hologram QR graphic
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                            colors: [
                              Color(0xFF0F224D),
                              Color(0xFF09142C),
                            ],
                          ),
                          borderRadius: BorderRadius.circular(22),
                          border: Border.all(
                            color: const Color(0xFF2563EB).withValues(alpha: 0.7),
                            width: 1.5,
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: const Color(0xFF1D4ED8).withValues(alpha: 0.3),
                              blurRadius: 20,
                              spreadRadius: 1,
                            ),
                          ],
                        ),
                        child: Row(
                          children: [
                            // 3D Holographic QR image
                            ClipRRect(
                              borderRadius: BorderRadius.circular(16),
                              child: Container(
                                width: 68,
                                height: 68,
                                decoration: BoxDecoration(
                                  color: const Color(0xFF071228),
                                  borderRadius: BorderRadius.circular(16),
                                  border: Border.all(
                                    color: const Color(0xFF00E5FF).withValues(alpha: 0.5),
                                  ),
                                  boxShadow: [
                                    BoxShadow(
                                      color: const Color(0xFF00E5FF).withValues(alpha: 0.25),
                                      blurRadius: 12,
                                    ),
                                  ],
                                ),
                                child: Image.asset(
                                  'assets/images/qr_hologram.png',
                                  fit: BoxFit.cover,
                                  errorBuilder: (context, error, stackTrace) {
                                    return const Center(
                                      child: Icon(
                                        Icons.qr_code_2_rounded,
                                        size: 42,
                                        color: Color(0xFF00E5FF),
                                      ),
                                    );
                                  },
                                ),
                              ),
                            ),
                            const SizedBox(width: 14),

                            // Banner text
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  RichText(
                                    text: TextSpan(
                                      children: [
                                        TextSpan(
                                          text: 'Connect via ',
                                          style: GoogleFonts.spaceGrotesk(
                                            fontSize: 14,
                                            fontWeight: FontWeight.bold,
                                            color: Colors.white,
                                          ),
                                        ),
                                        TextSpan(
                                          text: 'Pairing ID / Code',
                                          style: GoogleFonts.spaceGrotesk(
                                            fontSize: 14,
                                            fontWeight: FontWeight.bold,
                                            color: const Color(0xFF00E5FF),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    'Find your Pairing Code (e.g. PAIR-8892) on the Web Dashboard under "Android SMS Gateway".',
                                    style: GoogleFonts.dmSans(
                                      fontSize: 11,
                                      color: const Color(0xFF93A4C5),
                                      height: 1.3,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 22),

                      // SECTION 1: Production URL (NON-EDITABLE DOMAIN)
                      _buildSectionHeader(
                        icon: Icons.cloud_done_rounded,
                        title: 'Production URL',
                        iconColor: const Color(0xFF00E5FF),
                      ),
                      const SizedBox(height: 10),

                      // Domain Input Field (locked / not editable)
                      Container(
                        height: 56,
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        decoration: BoxDecoration(
                          color: const Color(0xFF09142A),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color: const Color(0xFF0088FF),
                            width: 1.5,
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: const Color(0xFF0088FF).withValues(alpha: 0.2),
                              blurRadius: 10,
                            ),
                          ],
                        ),
                        child: Row(
                          children: [
                            const Icon(
                              Icons.link_rounded,
                              color: Color(0xFF00E5FF),
                              size: 22,
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Text(
                                _productionDomain,
                                style: GoogleFonts.jetBrainsMono(
                                  color: Colors.white,
                                  fontSize: 14,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                            const Icon(
                              Icons.check_circle_rounded,
                              color: Color(0xFF10B981),
                              size: 20,
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 22),

                      // SECTION 2: Pairing ID / Code or Device Token
                      _buildSectionHeader(
                        icon: Icons.search_rounded,
                        title: 'Pairing ID / Code or Device Token',
                        iconColor: const Color(0xFF00E5FF),
                      ),
                      const SizedBox(height: 10),

                      // Code Input Field
                      Container(
                        height: 56,
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        decoration: BoxDecoration(
                          color: const Color(0xFF09142A),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color: const Color(0xFF0088FF),
                            width: 1.5,
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: const Color(0xFF0088FF).withValues(alpha: 0.2),
                              blurRadius: 10,
                            ),
                          ],
                        ),
                        child: Row(
                          children: [
                            const Icon(
                              Icons.qr_code_scanner_rounded,
                              color: Color(0xFFFFB800),
                              size: 22,
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: TextField(
                                controller: _tokenController,
                                textCapitalization: TextCapitalization.characters,
                                cursorColor: const Color(0xFF00E5FF),
                                style: GoogleFonts.jetBrainsMono(
                                  color: Colors.white,
                                  fontSize: 15,
                                  fontWeight: FontWeight.bold,
                                  letterSpacing: 1.2,
                                ),
                                decoration: InputDecoration(
                                  border: InputBorder.none,
                                  isDense: true,
                                  hintText: 'e.g. PAIR-8173',
                                  hintStyle: TextStyle(
                                    color: Colors.white.withValues(alpha: 0.3),
                                    letterSpacing: 1.0,
                                  ),
                                  contentPadding: EdgeInsets.zero,
                                ),
                              ),
                            ),
                            if (_tokenController.text.trim().isNotEmpty)
                              const Icon(
                                Icons.check_circle_rounded,
                                color: Color(0xFF10B981),
                                size: 20,
                              ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 22),

                      // SECTION 3: Device Nickname
                      _buildSectionHeader(
                        icon: Icons.smartphone_rounded,
                        title: 'Device Nickname',
                        iconColor: const Color(0xFF00E5FF),
                      ),
                      const SizedBox(height: 10),

                      // Device Name Input Field
                      Container(
                        height: 56,
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        decoration: BoxDecoration(
                          color: const Color(0xFF09142A),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color: const Color(0xFF1C315B),
                            width: 1.5,
                          ),
                        ),
                        child: Row(
                          children: [
                            const Icon(
                              Icons.smartphone_rounded,
                              color: Color(0xFF00E5FF),
                              size: 20,
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: TextField(
                                controller: _deviceNameController,
                                cursorColor: const Color(0xFF00E5FF),
                                style: GoogleFonts.dmSans(
                                  color: Colors.white,
                                  fontSize: 14,
                                ),
                                decoration: InputDecoration(
                                  border: InputBorder.none,
                                  isDense: true,
                                  hintText: 'e.g. Android SMS Gateway Phone',
                                  hintStyle: TextStyle(
                                    color: Colors.white.withValues(alpha: 0.3),
                                  ),
                                  contentPadding: EdgeInsets.zero,
                                ),
                              ),
                            ),
                            if (_deviceNameController.text.isNotEmpty)
                              GestureDetector(
                                onTap: () => _deviceNameController.clear(),
                                child: Container(
                                  padding: const EdgeInsets.all(4),
                                  child: const Icon(
                                    Icons.close,
                                    color: Colors.white54,
                                    size: 18,
                                  ),
                                ),
                              ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 32),

                      // CTA BUTTON: Connect & Sync Gateway
                      Container(
                        height: 56,
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(28),
                          gradient: const LinearGradient(
                            colors: [
                              Color(0xFF0099FF),
                              Color(0xFF4F46E5),
                              Color(0xFF8B5CF6),
                            ],
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: const Color(0xFF4F46E5).withValues(alpha: 0.45),
                              blurRadius: 18,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        child: ElevatedButton(
                          onPressed: _isLoading ? null : _handlePair,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.transparent,
                            shadowColor: Colors.transparent,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(28),
                            ),
                          ),
                          child: _isLoading
                              ? const SizedBox(
                                  height: 22,
                                  width: 22,
                                  child: CircularProgressIndicator(
                                    color: Colors.white,
                                    strokeWidth: 2.5,
                                  ),
                                )
                              : Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    const Icon(
                                      Icons.link_rounded,
                                      color: Colors.white,
                                      size: 20,
                                    ),
                                    const SizedBox(width: 8),
                                    Text(
                                      'Connect & Sync Gateway',
                                      style: GoogleFonts.spaceGrotesk(
                                        fontSize: 15,
                                        fontWeight: FontWeight.bold,
                                        color: Colors.white,
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    const Icon(
                                      Icons.arrow_forward_rounded,
                                      color: Colors.white,
                                      size: 18,
                                    ),
                                  ],
                                ),
                        ),
                      ),
                      const SizedBox(height: 28),

                      // Carousel indicator dots at bottom
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Container(
                            height: 6,
                            width: 6,
                            decoration: const BoxDecoration(
                              shape: BoxShape.circle,
                              color: Color(0xFF1F3563),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Container(
                            height: 6,
                            width: 18,
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(3),
                              color: const Color(0xFF00E5FF),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Container(
                            height: 6,
                            width: 6,
                            decoration: const BoxDecoration(
                              shape: BoxShape.circle,
                              color: Color(0xFF1F3563),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSectionHeader({
    required IconData icon,
    required String title,
    String? subtitle,
    required Color iconColor,
  }) {
    return Row(
      children: [
        Container(
          height: 32,
          width: 32,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: const Color(0xFF0A1836),
            border: Border.all(
              color: iconColor.withValues(alpha: 0.4),
            ),
          ),
          child: Icon(
            icon,
            size: 16,
            color: iconColor,
          ),
        ),
        const SizedBox(width: 10),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: GoogleFonts.spaceGrotesk(
                color: Colors.white,
                fontSize: 14,
                fontWeight: FontWeight.bold,
              ),
            ),
            if (subtitle != null && subtitle.isNotEmpty) ...[
              const SizedBox(height: 1),
              Text(
                subtitle,
                style: GoogleFonts.dmSans(
                  color: const Color(0xFF7B8DAE),
                  fontSize: 11,
                ),
              ),
            ],
          ],
        ),
      ],
    );
  }
}
