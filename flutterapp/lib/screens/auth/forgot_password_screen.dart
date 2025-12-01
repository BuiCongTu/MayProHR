import 'package:flutter/material.dart';

import '../../services/auth_service.dart';
import 'reset_password_screen.dart';

class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordState();
}

class _ForgotPasswordState extends State<ForgotPasswordScreen> {
  final phoneCtrl = TextEditingController();
  String? otp;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text("Forgot Password")),
      body: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            TextField(
              controller: phoneCtrl,
              decoration: InputDecoration(labelText: "Phone"),
            ),
            const SizedBox(height: 20),
            ElevatedButton(
              onPressed: () async {
                otp = await AuthService.forgotPassword(phoneCtrl.text.trim());
                if (otp != null) {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => ResetPasswordScreen(
                        phone: phoneCtrl.text.trim(),
                        otp: otp!,
                      ),
                    ),
                  );
                }
              },
              child: Text("Get OTP"),
            ),
          ],
        ),
      ),
    );
  }
}
