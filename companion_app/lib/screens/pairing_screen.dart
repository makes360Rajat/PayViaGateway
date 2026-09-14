import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../services/api_client.dart';

class PairingScreen extends StatefulWidget {
  const PairingScreen({super.key});

  @override
  State<PairingScreen> createState() => _PairingScreenState();
}

class _PairingScreenState extends State<PairingScreen> {
  final _serverUrlController = TextEditingController(text: 'https://payvia360.com');
  final _tokenController = TextEditingController(text: 'PAIR-4852');
  final _deviceNameController = TextEditingController(text: 'Android SMS Gateway Phone');
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    ApiClient.getServerUrl().then((url) {
      if (mounted && url.isNotEmpty) {
        _serverUrlController.text = url;
      }
    });
    ApiClient.getPairingCode().then((code) {
      if (mounted && code != null && code.isNotEmpty) {
        _tokenController.text = code;
      }
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
    final url = _serverUrlController.text.trim();
    final name = _deviceNameController.text.trim();

    if (inputCode.isEmpty || url.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter Pairing ID / Code and Server URL')),
      );
      return;
    }

    setState(() => _isLoading = true);
    await ApiClient.setServerUrl(url);
    final success = await ApiClient.pairDevice(
      pairingCodeOrToken: inputCode,
      deviceName: name.isEmpty ? 'Android SMS Gateway' : name,
      serverUrl: url,
    );
    setState(() => _isLoading = false);

    if (success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('✅ Successfully paired with PayVia Gateway!'),
          backgroundColor: Colors.green.shade700,
        ),
      );
      Navigator.pop(context, true);
    } else if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Pairing failed for "$inputCode". Verify Pairing ID or Server IP.'),
          backgroundColor: Colors.redAccent,
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
        title: Text(
          'Pair Device with Gateway',
          style: GoogleFonts.spaceGrotesk(color: Colors.white, fontWeight: FontWeight.bold),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.indigo.shade900.withOpacity(0.3),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.indigo.shade500.withOpacity(0.3)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.qr_code_2_rounded, size: 40, color: Colors.indigoAccent),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Connect via Pairing ID / Code',
                          style: GoogleFonts.spaceGrotesk(
                            fontSize: 15,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                        const SizedBox(height: 4),
                        const Text(
                          'Find your Pairing Code (e.g. PAIR-8892) on the Web Dashboard under "Android SMS Gateway".',
                          style: TextStyle(color: Colors.white60, fontSize: 11),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Server URL Section
            Text(
              'Gateway Server IP / URL',
              style: GoogleFonts.spaceGrotesk(color: Colors.white70, fontSize: 13, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _serverUrlController,
              style: GoogleFonts.jetBrainsMono(color: Colors.white, fontSize: 13),
              decoration: InputDecoration(
                prefixIcon: const Icon(Icons.link, color: Colors.indigoAccent, size: 20),
                hintText: 'https://payvia360.com',
                hintStyle: const TextStyle(color: Colors.white30),
                filled: true,
                fillColor: const Color(0xFF111827),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: Colors.white12),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: Colors.indigoAccent),
                ),
              ),
            ),
            const SizedBox(height: 8),
            // Quick IP selector pills
            Wrap(
              spacing: 8,
              runSpacing: 6,
              children: [
                _buildIpChip('payvia360.com (Cloud)', 'https://payvia360.com'),
                _buildIpChip('localhost:5001 (Dev)', 'http://localhost:5001'),
                _buildIpChip('10.0.2.2 (Emulator)', 'http://10.0.2.2:5001'),
              ],
            ),
            const SizedBox(height: 20),

            // Pairing ID / Code
            Text(
              'Pairing ID / Code or Device Token',
              style: GoogleFonts.spaceGrotesk(color: Colors.white70, fontSize: 13, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _tokenController,
              textCapitalization: TextCapitalization.characters,
              style: GoogleFonts.jetBrainsMono(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold),
              decoration: InputDecoration(
                prefixIcon: const Icon(Icons.pin_rounded, color: Colors.amberAccent, size: 20),
                hintText: 'e.g. PAIR-8892 or dev_tok_...',
                hintStyle: const TextStyle(color: Colors.white30),
                filled: true,
                fillColor: const Color(0xFF111827),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: Colors.white12),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: Colors.indigoAccent),
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Device Name
            Text(
              'Device Nickname',
              style: GoogleFonts.spaceGrotesk(color: Colors.white70, fontSize: 13, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _deviceNameController,
              style: const TextStyle(color: Colors.white, fontSize: 13),
              decoration: InputDecoration(
                prefixIcon: const Icon(Icons.smartphone, color: Colors.tealAccent, size: 20),
                hintText: 'e.g. Samsung Gateway / OnePlus 11',
                hintStyle: const TextStyle(color: Colors.white30),
                filled: true,
                fillColor: const Color(0xFF111827),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: Colors.white12),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: Colors.indigoAccent),
                ),
              ),
            ),
            const SizedBox(height: 28),

            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF4F46E5),
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                elevation: 4,
              ),
              onPressed: _isLoading ? null : _handlePair,
              child: _isLoading
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                    )
                  : Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.link, color: Colors.white, size: 18),
                        const SizedBox(width: 8),
                        Text(
                          'Connect & Sync Gateway',
                          style: GoogleFonts.spaceGrotesk(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                        ),
                      ],
                    ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildIpChip(String label, String url) {
    final isSelected = _serverUrlController.text == url;
    return InkWell(
      onTap: () {
        setState(() {
          _serverUrlController.text = url;
        });
      },
      borderRadius: BorderRadius.circular(20),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
        decoration: BoxDecoration(
          color: isSelected ? Colors.indigo.shade600 : Colors.white.withOpacity(0.06),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? Colors.indigoAccent : Colors.white12,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: isSelected ? Colors.white : Colors.white70,
            fontSize: 10,
            fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
          ),
        ),
      ),
    );
  }
}
