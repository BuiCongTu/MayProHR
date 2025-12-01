import 'package:flutter/material.dart';

import '../services/auth_service.dart';

class AuthProvider with ChangeNotifier {
  Map<String, dynamic>? currentUser;
  String? token;

  Future<bool> login(String phone, String password) async {
    final result = await AuthService.login(phone, password);
    if (result != null) {
      token = result["token"];
      currentUser = result["user"];
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
