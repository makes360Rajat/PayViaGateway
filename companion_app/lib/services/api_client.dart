import 'dart:convert';
import 'dart:async';
import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class ApiClient {
  static const String _defaultServerUrl = 'https://payvia360.com';
  static const String _defaultDeviceToken = 'dev_tok_991823abce1283';
  static const MethodChannel _notifChannel = MethodChannel('com.payvia.gateway/notifications');
  
  static Future<int> getBatteryLevel() async {
    try {
      final int? level = await _notifChannel.invokeMethod<int>('getBatteryLevel');
      if (level != null && level > 0 && level <= 100) {
        return level;
      }
    } catch (_) {}
    return 100;
  }

  static Future<String> getServerUrl() async {
    final prefs = await SharedPreferences.getInstance();
    final saved = prefs.getString('server_url');
    if (saved == null || 
        saved.isEmpty || 
        saved.contains('192.168.') || 
        saved.contains('109.106.') || 
        saved.contains('localhost') || 
        saved.contains('10.0.2.2') ||
        saved.startsWith('http://')) {
      await prefs.setString('server_url', _defaultServerUrl);
      return _defaultServerUrl;
    }
    return saved;
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
      final currentBattery = await getBatteryLevel();
      
      final response = await http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'pairingCode': pairingCodeOrToken,
          'deviceToken': pairingCodeOrToken,
          'deviceName': deviceName,
          'batteryLevel': currentBattery,
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
      final currentBattery = await getBatteryLevel();

      final response = await http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'deviceToken': token,
          'batteryLevel': currentBattery,
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
      final currentBattery = await getBatteryLevel();

      final response = await http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'deviceToken': token,
          'sender': sender,
          'message': message,
          'batteryLevel': currentBattery,
          'timestamp': DateTime.now().toIso8601String(),
        }),
      );

      return jsonDecode(response.body);
    } catch (e) {
      return {'status': false, 'error': e.toString()};
    }
  }

  static Future<Map<String, dynamic>> ingestNotification({
    required String packageName,
    required String title,
    required String message,
  }) async {
    try {
      final token = await getDeviceToken();
      if (token == null) {
        return {'status': false, 'error': 'Device not paired'};
      }

      final baseUrl = await getServerUrl();
      final url = Uri.parse('$baseUrl/api/devices/notification-ingest');
      final currentBattery = await getBatteryLevel();

      final response = await http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'deviceToken': token,
          'packageName': packageName,
          'title': title,
          'message': message,
          'batteryLevel': currentBattery,
          'timestamp': DateTime.now().toIso8601String(),
        }),
      );

      return jsonDecode(response.body);
    } catch (e) {
      return {'status': false, 'error': e.toString()};
    }
  }
}

