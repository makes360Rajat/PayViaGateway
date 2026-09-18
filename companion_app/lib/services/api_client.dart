import 'dart:convert';
import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class ApiClient {
  static const String _defaultServerUrl = 'https://payvia360.com';
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
    final token = prefs.getString('device_token');
    if (token == null ||
        token.isEmpty ||
        token == 'dev_tok_991823abce1283' ||
        token == 'PAIR-8892' ||
        token == 'PAIR-8173') {
      return null;
    }
    return token;
  }

  static Future<void> setDeviceToken(String token) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('device_token', token);
  }

  static Future<void> clearPairing() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('device_token');
    await prefs.remove('pairing_code');
  }

  static Future<void> disconnectDevice() async {
    await clearPairing();
  }

  static Future<String?> getPairingCode() async {
    final prefs = await SharedPreferences.getInstance();
    final code = prefs.getString('pairing_code');
    if (code == null ||
        code.isEmpty ||
        code == 'PAIR-8892' ||
        code == 'PAIR-8173') {
      return null;
    }
    return code;
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

  static Future<Map<String, dynamic>> sendHeartbeat() async {
    try {
      final token = await getDeviceToken();
      if (token == null) {
        return {
          'isSuccess': false,
          'isDisconnected': true,
          'isPaused': false,
        };
      }

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

      Map<String, dynamic> data = {};
      try {
        data = jsonDecode(response.body) as Map<String, dynamic>;
      } catch (_) {}

      final isDisconnected = response.statusCode == 404 || 
                             data['code'] == 'DEVICE_DISCONNECTED' || 
                             data['error'] == 'DEVICE_DISCONNECTED' ||
                             data['error'] == 'Device not recognized or not paired' ||
                             data['error'] == 'Device has been disconnected or removed from dashboard' ||
                             data['isDisconnected'] == true;
      final isPaused = data['isPaused'] == true || 
                       data['status'] == 'PAUSED' || 
                       (data['data'] is Map && data['data']['status'] == 'PAUSED');

      return {
        'isSuccess': response.statusCode == 200 && data['status'] == true,
        'isPaused': isPaused,
        'isDisconnected': isDisconnected,
        'deviceStatus': isPaused ? 'PAUSED' : 'ACTIVE',
        'raw': data,
      };
    } catch (e) {
      return {
        'isSuccess': false,
        'isPaused': false,
        'isDisconnected': false,
        'error': e.toString(),
      };
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

  static Future<Map<String, dynamic>> fetchOrders({
    String status = 'ALL',
    int limit = 20,
    int offset = 0,
  }) async {
    try {
      final token = await getDeviceToken();
      if (token == null) {
        return {'status': false, 'error': 'Device not paired'};
      }

      final baseUrl = await getServerUrl();
      final uri = Uri.parse('$baseUrl/api/devices/orders').replace(
        queryParameters: {
          'deviceToken': token,
          'status': status,
          'limit': limit.toString(),
          'offset': offset.toString(),
        },
      );

      final response = await http.get(
        uri,
        headers: {
          'Content-Type': 'application/json',
          'x-device-token': token,
        },
      );

      debugPrint('>>> API URI: $uri | STATUS: ${response.statusCode} | BODY: ${response.body.length > 100 ? response.body.substring(0, 100) : response.body}');

      Map<String, dynamic> data = {};
      try {
        data = jsonDecode(response.body) as Map<String, dynamic>;
      } catch (_) {}

      if (response.statusCode == 404 || data['code'] == 'DEVICE_DISCONNECTED' || data['isDisconnected'] == true) {
        return {
          'status': false,
          'code': 'DEVICE_DISCONNECTED',
          'isDisconnected': true,
          'error': data['error'] ?? 'Device was disconnected or removed from dashboard',
          'orders': [],
          'data': [],
        };
      }

      return data;
    } catch (e) {
      debugPrint('>>> FETCH ORDERS ERR: $e');
      return {'status': false, 'error': e.toString()};
    }
  }

  static Future<Map<String, dynamic>> settleOrder(String orderId, {String? utr}) async {
    try {
      final token = await getDeviceToken();
      if (token == null) {
        return {'status': false, 'error': 'Device not paired'};
      }

      final baseUrl = await getServerUrl();
      final url = Uri.parse('$baseUrl/api/devices/orders/$orderId/settle');

      final response = await http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'deviceToken': token,
          if (utr != null && utr.isNotEmpty) 'utr': utr,
        }),
      );

      return jsonDecode(response.body);
    } catch (e) {
      return {'status': false, 'error': e.toString()};
    }
  }

  static Future<Map<String, dynamic>> cancelOrder(String orderId) async {
    try {
      final token = await getDeviceToken();
      if (token == null) {
        return {'status': false, 'error': 'Device not paired'};
      }

      final baseUrl = await getServerUrl();
      final url = Uri.parse('$baseUrl/api/devices/orders/$orderId/cancel');

      final response = await http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'deviceToken': token,
        }),
      );

      return jsonDecode(response.body);
    } catch (e) {
      return {'status': false, 'error': e.toString()};
    }
  }
}

