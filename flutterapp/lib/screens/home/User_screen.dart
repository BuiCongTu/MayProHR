import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../providers/auth_provider.dart';
import '../auth/login_screen.dart';
import '../overtime/my_overtime_screen.dart';
import '../payroll/my_payroll_select_screen.dart';
import '../attendance/AttendanceCalendarScreen.dart';
import '../../configs/AttendanceApi.dart';
import '../../services/storage_service.dart';

class UserHome extends StatelessWidget {
  const UserHome({super.key});

  int? _extractUserId(Map<String, dynamic>? u) {
    if (u == null) return null;

    final v1 = u['userId'];
    if (v1 is int) return v1;
    if (v1 is String) return int.tryParse(v1);

    final v2 = u['id'];
    if (v2 is int) return v2;
    if (v2 is String) return int.tryParse(v2);

    return null;
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text("Employee Dashboard"),
        actions: [
          IconButton(
            onPressed: () {
              auth.logout();
              Navigator.of(context).pushAndRemoveUntil(
                MaterialPageRoute(builder: (context) => const LoginScreen()),
                    (Route<dynamic> route) => false,
              );
            },
            icon: const Icon(Icons.logout),
          ),
        ],
      ),
      body: Container(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Card(
              color: Colors.blue[50],
              elevation: 0,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Row(
                  children: [
                    CircleAvatar(
                      backgroundColor: Colors.blue,
                      child: Text(
                        auth.currentUser?["fullName"]?[0] ?? "U",
                        style: const TextStyle(color: Colors.white),
                      ),
                    ),
                    const SizedBox(width: 16),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          "Welcome,",
                          style: TextStyle(color: Colors.grey[600]),
                        ),
                        Text(
                          auth.currentUser?["fullName"] ?? "Employee",
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 24),

            const Text(
              "Features",
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),

            Expanded(
              child: GridView.count(
                crossAxisCount: 2,
                crossAxisSpacing: 16,
                mainAxisSpacing: 16,
                children: [
                  _buildMenuCard(
                    context,
                    title: "Payroll",
                    icon: Icons.monetization_on,
                    color: Colors.blue,
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) => const MyPayrollSelectScreen(),
                        ),
                      );
                    },
                  ),

                  _buildMenuCard(
                    context,
                    title: "My Overtime",
                    icon: Icons.access_time_filled,
                    color: Colors.orange,
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) => const MyOvertimeScreen(),
                        ),
                      );
                    },
                  ),

                  _buildMenuCard(
                    context,
                    title: "Attendance",
                    icon: Icons.calendar_month,
                    color: Colors.purple,
                    onTap: () async {
                      final userId = _extractUserId(
                        auth.currentUser?.cast<String, dynamic>(),
                      );

                      if (userId == null) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text('Không lấy được userId. Vui lòng đăng nhập lại.'),
                          ),
                        );
                        return;
                      }

                      final api = AttendanceApi(
                        getToken: () => StorageService().getToken(),
                      );

                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => AttendanceCalendarScreen(
                            api: api,
                            userId: userId,
                          ),
                        ),
                      );
                    },
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMenuCard(
      BuildContext context, {
        required String title,
        required IconData icon,
        required Color color,
        required VoidCallback onTap,
      }) {

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Card(
        elevation: 2,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: color.withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, size: 32, color: color),
            ),
            const SizedBox(height: 12),
            Text(
              title,
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
            ),
          ],
        ),
      ),
    );
  }
}