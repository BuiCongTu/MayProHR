import 'package:flutter/material.dart';

import '../../services/auth_service.dart';

class ResetPasswordScreen extends StatefulWidget {
  final String phone;
  final String otp;

  const ResetPasswordScreen({
    super.key,
    required this.phone,
    required this.otp,
  });

  @override
  State<ResetPasswordScreen> createState() => _ResetPasswordState();
}

class _ResetPasswordState extends State<ResetPasswordScreen> {
  final newPassCtrl = TextEditingController();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text("Reset Password")),
      body: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            Text("OTP: ${widget.otp}", style: TextStyle(fontSize: 16)),
            TextField(
              controller: newPassCtrl,
              decoration: InputDecoration(labelText: "New Password"),
              obscureText: true,
            ),

            const SizedBox(height: 20),

            ElevatedButton(
              onPressed: () async {
                bool ok = await AuthService.resetPassword(
                  widget.phone,
                  widget.otp,
                  newPassCtrl.text.trim(),
                );

                if (ok) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text("Password reset success!")),
                  );
                  Navigator.popUntil(context, (route) => route.isFirst);
                }
              },
              child: Text("Reset Password"),
            ),
          ],
        ),
      ),
    );
  }
}
