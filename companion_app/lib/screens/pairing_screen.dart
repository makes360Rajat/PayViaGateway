import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../services/api_client.dart';

class PairingScreen extends StatefulWidget {
  const PairingScreen({super.key});

  @override
  State<PairingScreen> createState() => _PairingScreenState();
}

class _PairingScreenState extends State<PairingScreen> {
  final _serverUrlController = TextEditingController(text: 'http://localhost:5001');
  final _tokenController = TextEditingController();
  final _deviceNameController = TextEditingController(text: 'Android SMS Gateway Phone');
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    ApiClient.getServerUrl().then((url) {
      _serverUrlController.text = url;
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
    final token = _tokenController.text.trim();
    final url = _serverUrlController.text.trim();
    final name = _deviceNameController.text.trim();

    if (token.isEmpty || url.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter Device Token and Server URL')),
      );
      return;
    }

    setState(() => _isLoading = true);
    await ApiClient.setServerUrl(url);
    final success = await ApiClient.pairDevice(
      deviceToken: token,
      deviceName: name,
    );
    setState(() => _isLoading = false);

    if (success && mounted) {
      Navigator.pop(context, true);
    } else if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Pairing failed. Verify token or server URL.'),
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
        title: Text(
          'Pair with Gateway',
          style: GoogleFonts.spaceGrotesk(color: Colors.white, fontWeight: FontWeight.bold),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Icon(Icons.qr_code_scanner, size: 64, color: Colors.indigoAccent),
            const SizedBox(height: 16),
            Text(
              'Enter Pairing Details',
              textAlign: TextAlign.center,
              style: GoogleFonts.spaceGrotesk(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white),
            ),
            const SizedBox(height: 8),
            const Text(
              'Obtain your Device Token from the web dashboard under "Android SMS Gateway" → "Pair New Android Phone".',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.white60, fontSize: 12),
            ),
            const SizedBox(height: 24),
            TextField(
              controller: _serverUrlController,
              style: const TextStyle(color: Colors.white, fontSize: 13),
              decoration: InputDecoration(
                labelText: 'Gateway Server URL',
                labelStyle: const TextStyle(color: Colors.white60),
                filled: true,
                fillColor: const Color(0xFF111827),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _tokenController,
              style: GoogleFonts.jetBrainsMono(color: Colors.white, fontSize: 13),
              decoration: InputDecoration(
                labelText: 'Device Token (e.g. dev_tok_...)',
                labelStyle: const TextStyle(color: Colors.white60),
                filled: true,
                fillColor: const Color(0xFF111827),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _deviceNameController,
              style: const TextStyle(color: Colors.white, fontSize: 13),
              decoration: InputDecoration(
                labelText: 'Device Nickname',
                labelStyle: const TextStyle(color: Colors.white60),
                filled: true,
                fillColor: const Color(0xFF111827),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.indigo.shade600,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              onPressed: _isLoading ? null : _handlePair,
              child: _isLoading
                  ? const CircularProgressIndicator(color: Colors.white)
                  : const Text('Connect & Activate Gateway', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
  }
}
