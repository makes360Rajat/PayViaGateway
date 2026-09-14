import 'dart:convert';
import 'dart:async';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class ApiClient {
  static const String _defaultServerUrl = 'https://payvia360.com';
  static const String _defaultDeviceToken = 'dev_tok_991823abce1283';
  
  static Future<String> getServerUrl() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('server_url') ?? _defaultServerUrl;
  }

  static Future<void> setServerUrl(String url) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('server_url', url);
  }

  static Future<String?> getDeviceToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('device_token') ?? _defaultDeviceToken;
  }

  static Future<void> setDeviceToken(String token) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('device_token', token);
  }

  static Future<void> disconnectDevice() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('device_token');
    await prefs.remove('pairing_code');
  }

  static Future<String?> getPairingCode() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('pairing_code') ?? 'PAIR-8892';
  }

  static Future<void> setPairingCode(String code) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('pairing_code', code);
  }

  static Future<bool> pairDevice({
    required String pairingCodeOrToken,
    required String deviceName,
    String? serverUrl,
  }) async {
    try {
      if (serverUrl != null && serverUrl.isNotEmpty) {
        await setServerUrl(serverUrl);
      }
      final baseUrl = await getServerUrl();
      final url = Uri.parse('$baseUrl/api/devices/pair');
      
      final response = await http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'pairingCode': pairingCodeOrToken,
          'deviceToken': pairingCodeOrToken,
          'deviceName': deviceName,
          'batteryLevel': 95,
          'simSlots': [
            {'slot': 1, 'operator': 'Primary SIM 5G'}
          ],
        }),
      );

      final data = jsonDecode(response.body);
      if (response.statusCode == 200 && data['status'] == true) {
        final assignedToken = (data['data']?['deviceToken'] ?? pairingCodeOrToken).toString();
        final assignedCode = (data['data']?['pairingCode'] ?? pairingCodeOrToken).toString();
        await setDeviceToken(assignedToken);
        await setPairingCode(assignedCode);
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  static Future<bool> sendHeartbeat() async {
    try {
      final token = await getDeviceToken();
      if (token == null) return false;

      final baseUrl = await getServerUrl();
      final url = Uri.parse('$baseUrl/api/devices/heartbeat');

      final response = await http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'deviceToken': token,
          'batteryLevel': 92,
        }),
      );

      return response.statusCode == 200;
    } catch (e) {
      return false;
    }
  }

  static Future<Map<String, dynamic>> ingestSms({
    required String sender,
    required String message,
  }) async {
    try {
      final token = await getDeviceToken();
      if (token == null) {
        return {'status': false, 'error': 'Device not paired'};
      }

      final baseUrl = await getServerUrl();
      final url = Uri.parse('$baseUrl/api/devices/sms-ingest');

      final response = await http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'deviceToken': token,
          'sender': sender,
          'message': message,
          'timestamp': DateTime.now().toIso8601String(),
        }),
      );

      return jsonDecode(response.body);
    } catch (e) {
      return {'status': false, 'error': e.toString()};
    }
  }
}
