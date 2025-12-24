import 'package:flutter/material.dart';

import '../../models/leave_request_model.dart';
import '../../services/leave_service.dart';
import 'leave_detail_screen.dart';
import 'leave_form_screen.dart';

class LeaveListScreen extends StatefulWidget {
  final int userId;
  const LeaveListScreen({super.key, required this.userId});

  @override
  State<LeaveListScreen> createState() => _LeaveListScreenState();
}

class _LeaveListScreenState extends State<LeaveListScreen> {
  final LeaveService _service = LeaveService();
  late Future<List<LeaveRequestModel>> _future;

  @override
  void initState() {
    super.initState();
    _future = _service.getMyLeaveRequests(userId: widget.userId);
  }

  Future<void> _reload() async {
    setState(() {
      _future = _service.getMyLeaveRequests(userId: widget.userId);
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Đơn xin nghỉ phép'),
        actions: [
          IconButton(
            onPressed: _reload,
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () async {
          final created = await Navigator.push<bool>(
            context,
            MaterialPageRoute(
              builder: (_) => LeaveFormScreen(userId: widget.userId),
            ),
          );
          if (created == true) _reload();
        },
        icon: const Icon(Icons.add),
        label: const Text('Tạo đơn'),
      ),
      body: FutureBuilder<List<LeaveRequestModel>>(
        future: _future,
        builder: (context, snap) {
          if (snap.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snap.hasError) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Text('Lỗi: ${snap.error}'),
              ),
            );
          }

          final items = snap.data ?? [];
          if (items.isEmpty) {
            return const Center(child: Text('Chưa có đơn nghỉ phép.'));
          }

          return RefreshIndicator(
            onRefresh: _reload,
            child: ListView.separated(
              padding: const EdgeInsets.all(12),
              itemCount: items.length,
              separatorBuilder: (_, __) => const SizedBox(height: 8),
              itemBuilder: (context, i) {
                final lr = items[i];
                final dateText =
                    '${lr.startDate.toString().substring(0, 10)} → ${lr.endDate.toString().substring(0, 10)}';

                return ListTile(
                  tileColor: Colors.grey.shade100,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  title: Text(dateText),
                  subtitle: Text('Lý do: ${lr.reason.isEmpty ? "(trống)" : lr.reason}'),
                  trailing: Text((lr.status ?? 'pending').toUpperCase()),
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => LeaveDetailScreen(request: lr),
                      ),
                    );
                  },
                );
              },
            ),
          );
        },
      ),
    );
  }
}