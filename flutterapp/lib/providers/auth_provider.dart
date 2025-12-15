import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/auth_service.dart';
import '../services/notification_service.dart';

class AuthProvider with ChangeNotifier {
  Map<String, dynamic>? currentUser;
  String? token;

  bool get isLoggedIn => token != null;

  Future<void> tryAutoLogin() async {
    final prefs = await SharedPreferences.getInstance();
    if (!prefs.containsKey(AuthService.tokenKey)) return;

    token = prefs.getString(AuthService.tokenKey);

    notifyListeners();

    // Sync FCM Token immediately after auto-login
    await _syncDeviceToken();
  }

  Future<Map<String, dynamic>> login(String phone, String password) async {
    final result = await AuthService.login(phone, password);
    if (result != null && result['error'] == null) {
      token = result["token"];
      currentUser = result["user"];
      notifyListeners();
      await _syncDeviceToken();
      return result;
    }
    else{
      return result ?? {"error": "Login failed"};
    }
  }

  Future<void> logout() async {
    await AuthService.logout();
    token = null;
    currentUser = null;
    notifyListeners();
  }
  Future<void> _syncDeviceToken() async {
    try {
      String? deviceToken = await NotificationService().getDeviceToken();
      if (deviceToken != null) {
        print("Syncing FCM Token to backend...");
        await AuthService.saveDeviceToken(deviceToken);
      }
    } catch (e) {
      print("Token sync error: $e");
    }
  }
}
