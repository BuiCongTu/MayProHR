import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../configs/api_config.dart';

class AuthService {
  static const tokenKey = "jwt_token";
  static const roleKey = "role";

  //// Login
  static Future<Map<String, dynamic>?> login(String phone, String password) async {
    final url = Uri.parse('${ApiConfig.baseUrl}${ApiConfig.loginEndpoint}');
    try {
      final response = await http.post(url,
          headers: {"Content-Type": "application/json"},
          body: jsonEncode({"loginId": phone, "password": password}));

      if (response.statusCode == 200) {
        final responseData = jsonDecode(response.body);

        if (responseData['success'] == true && responseData['data'] != null) {
          final token = responseData['data']['token'] as String;
          final userData = responseData['data']['user'] as Map<String, dynamic>;

          final roleName = userData["roleName"] as String? ?? "User";

          final prefs = await SharedPreferences.getInstance();
          await prefs.setString(tokenKey, token);
          await prefs.setString(roleKey, roleName);

          return {"token": token, "role": roleName};
        } else {
          return {"error": responseData["message"] ?? "Login failed due to server logic."};
        }
      } else {
        final errorData = jsonDecode(response.body);
        return {"error": errorData["message"] ?? "Login failed with status code ${response.statusCode}"};
      }
    } catch (e) {
      return {"error": e.toString()};
    }
  }

  /// Get current user info
  // static Future<Map<String, dynamic>> getCurrentUser(String phone, String token) async {
  //   final url = Uri.parse('${ApiConfig.baseUrl}/api/auth/getemp/$phone');
  //   final response = await http.get(url, headers: {
  //     "Content-Type": "application/json",
  //     "Authorization": "Bearer $token",
  //   });
  //
  //   if (response.statusCode == 200) {
  //     final responseData = jsonDecode(response.body);
  //     final token = responseData['data']['token'] as String;
  //
  //     // Now pass the CLEAN token to the getCurrentUser method
  //     final userResponse = await getCurrentUser(phone, token);
  //
  //     final prefs = await SharedPreferences.getInstance();
  //     await prefs.setString(tokenKey, token);
  //     await prefs.setString(roleKey, userResponse["roleName"] ?? "User");
  //
  //     return {"token": token, "role": userResponse["roleName"]};
  //   } else {
  //     throw Exception("Failed to fetch user info");
  //   }
  // }

  /// Register
  static Future<bool> register(String phone, String password, String fullName) async {
    final url = Uri.parse('${ApiConfig.baseUrl}${ApiConfig.registerEndpoint}');
    try {
      final response = await http.post(url,
          headers: {"Content-Type": "application/json"},
          body: jsonEncode({"phone": phone, "password": password, "fullName": fullName}));

      return response.statusCode == 200;
    } catch (e) {
      return false;
    }
  }

  /// Forgot password -> backend trả OTP
  static Future<String?> forgotPassword(String phone) async {
    final url = Uri.parse('${ApiConfig.baseUrl}${ApiConfig.forgotPasswordEndpoint}');
    try {
      final response = await http.post(url,
          headers: {"Content-Type": "application/json"},
          body: jsonEncode({"phone": phone}));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data["otp"] ?? data["message"] ?? "OTP sent";
      } else {
        return null;
      }
    } catch (e) {
      return null;
    }
  }

  /// Reset password
  static Future<bool> resetPassword(String phone, String otp, String newPassword) async {
    final url = Uri.parse('${ApiConfig.baseUrl}${ApiConfig.resetPasswordEndpoint}');
    try {
      final response = await http.post(url,
          headers: {"Content-Type": "application/json"},
          body: jsonEncode({"phone": phone, "otp": otp, "newPassword": newPassword}));

      return response.statusCode == 200;
    } catch (e) {
      return false;
    }
  }

  /// Logout
  static Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(tokenKey);
    await prefs.remove(roleKey);
  }

  /// Get token
  static Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(tokenKey);
  }

  /// Get role
  static Future<String?> getRole() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(roleKey);
  }
}
