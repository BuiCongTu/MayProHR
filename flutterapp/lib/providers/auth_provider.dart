import 'package:flutter/material.dart';

import '../services/auth_service.dart';
import '../services/notification_service.dart';

class AuthProvider with ChangeNotifier {
  Map<String, dynamic>? currentUser;
  String? token;

  Future<bool> login(String phone, String password) async {
    final result = await AuthService.login(phone, password);
    if (result != null) {
      token = result["token"];
      currentUser = result["user"];
      try {
        String? deviceToken = await NotificationService().getDeviceToken();
        if (deviceToken != null) {
          await AuthService.saveDeviceToken(deviceToken);
        }
      } catch (e) {
        print("Non-blocking notification error: $e");
      }
      notifyListeners();
      return true;
    }
    return false;
  }

  Future<void> logout() async {
    await AuthService.logout();
    token = null;
    currentUser = null;
    notifyListeners();
  }

  bool get isLoggedIn => token != null;
}
