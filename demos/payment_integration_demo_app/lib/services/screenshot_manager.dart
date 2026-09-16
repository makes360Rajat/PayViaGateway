import 'package:flutter/foundation.dart';
import '../models/payment_models.dart';

class ScreenshotManager extends ChangeNotifier {
  static final ScreenshotManager _instance = ScreenshotManager._internal();
  factory ScreenshotManager() => _instance;
  ScreenshotManager._internal();

  final List<CapturedScreenshot> _screenshots = [];

  List<CapturedScreenshot> get screenshots => List.unmodifiable(_screenshots);
  CapturedScreenshot? get latestScreenshot =>
      _screenshots.isNotEmpty ? _screenshots.first : null;

  void saveScreenshot(CapturedScreenshot screenshot) {
    _screenshots.insert(0, screenshot);
    notifyListeners();
  }

  void removeScreenshot(String id) {
    _screenshots.removeWhere((s) => s.id == id);
    notifyListeners();
  }

  void clearAll() {
    _screenshots.clear();
    notifyListeners();
  }
}
