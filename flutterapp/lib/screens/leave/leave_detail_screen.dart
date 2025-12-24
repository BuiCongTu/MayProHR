import 'package:flutter/material.dart';
import '../../models/leave_request_model.dart';

class LeaveDetailScreen extends StatelessWidget {
  final LeaveRequestModel request;
  const LeaveDetailScreen({super.key, required this.request});

  @override
  Widget build(BuildContext context) {
    final dateText =
        '${request.startDate.toString().substring(0, 10)} → ${request.endDate.toString().substring(0, 10)}';

    return Scaffold(
      appBar: AppBar(title: const Text('Chi tiết đơn nghỉ')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Mã đơn: ${request.id ?? "(chưa có)"}'),
                const SizedBox(height: 8),
                Text('UserId: ${request.userId}'),
                const SizedBox(height: 8),
                Text('Thời gian: $dateText'),
                const SizedBox(height: 8),
                Text('LeaveReasonId: ${request.leaveReasonId}'),
                const SizedBox(height: 8),
                Text('Lý do: ${request.reason}'),
                const SizedBox(height: 8),
                Text('Trạng thái: ${(request.status ?? 'pending').toUpperCase()}'),
              ],
            ),
          ),
        ),
      ),
    );
  }
}