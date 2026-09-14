import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../services/api_client.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  final _serverUrlController = TextEditingController();

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
    super.dispose();
  }

  Future<void> _handleSave() async {
    await ApiClient.setServerUrl(_serverUrlController.text.trim());
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Settings saved successfully')),
      );
    }
  }

  Future<void> _handleUnpair() async {
    if (await showDialog<bool>(
          context: context,
          builder: (ctx) => AlertDialog(
            backgroundColor: const Color(0xFF111827),
            title: const Text('Unpair Device?', style: TextStyle(color: Colors.white)),
            content: const Text(
              'This phone will stop forwarding SMS to the gateway.',
              style: TextStyle(color: Colors.white70),
            ),
            actions: [
              TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
              TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Unpair', style: TextStyle(color: Colors.redAccent))),
            ],
          ),
        ) ==
        true) {
      await ApiClient.setDeviceToken('');
      if (mounted) Navigator.pop(context);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF090D16),
      appBar: AppBar(
        backgroundColor: const Color(0xFF111827),
        title: Text('Gateway Settings', style: GoogleFonts.spaceGrotesk(color: Colors.white, fontWeight: FontWeight.bold)),
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            TextField(
              controller: _serverUrlController,
              style: const TextStyle(color: Colors.white, fontSize: 13),
              decoration: InputDecoration(
                labelText: 'Gateway Base URL',
                labelStyle: const TextStyle(color: Colors.white60),
                filled: true,
                fillColor: const Color(0xFF111827),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
              ),
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.indigo.shade600,
                padding: const EdgeInsets.symmetric(vertical: 12),
              ),
              onPressed: _handleSave,
              child: const Text('Save Server URL', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            ),
            const SizedBox(height: 24),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFF111827),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.white10),
              ),
              child: const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Battery Optimization & Permissions', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                  SizedBox(height: 8),
                  Text(
                    'To ensure 24/7 background operation without Android OS killing the background worker, whitelist PayVia Gateway from Battery Optimization in your phone settings.',
                    style: TextStyle(color: Colors.white60, fontSize: 12),
                  ),
                ],
              ),
            ),
            const Spacer(),
            OutlinedButton(
              style: OutlinedButton.styleFrom(
                foregroundColor: Colors.redAccent,
                side: const BorderSide(color: Colors.redAccent),
                padding: const EdgeInsets.symmetric(vertical: 12),
              ),
              onPressed: _handleUnpair,
              child: const Text('Unpair This Device'),
            ),
          ],
        ),
      ),
    );
  }
}
