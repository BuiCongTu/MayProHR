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
      appBar: AppBar(title: const Text('Leave Request Details')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Leave Code: ${request.id ?? "(Null)"}'),
                const SizedBox(height: 8),
                Text('Employee code: ${request.userId}'),
                const SizedBox(height: 8),
                Text('Start - End Date: $dateText'),
                const SizedBox(height: 8),
                Text('LeaveReasonId: ${request.leaveReasonId}'),
                const SizedBox(height: 8),
                Text('Reson: ${request.type}'),
                const SizedBox(height: 8),
                Text('Status: ${(request.status ?? 'pending').toUpperCase()}'),
              ],
            ),
          ),
        ),
      ),
    );
  }
}