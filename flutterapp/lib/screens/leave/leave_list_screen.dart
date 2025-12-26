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

  String _yearFilter = 'ALL';
  String _monthFilter = 'ALL'; // "01".."12" hoặc ALL
  String _statusFilter = 'ALL'; // ALL | pending | approved | rejected | ...

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

  List<String> _buildYearOptions(List<LeaveRequestModel> items) {
    final years = <int>{};
    for (final lr in items) {
      final dt = lr.startDate;
      if (dt != null) years.add(dt.year);
    }
    final sorted = years.toList()..sort((a, b) => b.compareTo(a));
    return ['ALL', ...sorted.map((y) => y.toString())];
  }

  List<String> _buildMonthOptions() {
    final months = List.generate(12, (i) => (i + 1).toString().padLeft(2, '0'));
    return ['ALL', ...months];
  }

  List<String> _buildStatusOptions(List<LeaveRequestModel> items) {
    final statuses = <String>{};
    for (final lr in items) {
      final st = (lr.status ?? 'pending').toLowerCase().trim();
      if (st.isNotEmpty) statuses.add(st);
    }
    final sorted = statuses.toList()..sort();
    return ['ALL', ...sorted];
  }

  List<LeaveRequestModel> _applyFilters(List<LeaveRequestModel> items) {
    return items.where((lr) {
      final start = lr.startDate;
      if (start == null) return false;

      if (_yearFilter != 'ALL') {
        final y = int.tryParse(_yearFilter);
        if (y == null || start.year != y) return false;
      }

      if (_monthFilter != 'ALL') {
        final m = int.tryParse(_monthFilter);
        if (m == null || start.month != m) return false;
      }

      if (_statusFilter != 'ALL') {
        final st = (lr.status ?? 'pending').toLowerCase().trim();
        if (st != _statusFilter) return false;
      }

      return true;
    }).toList();
  }

  void _setYear(String v) {
    setState(() {
      _yearFilter = v;
      _monthFilter = 'ALL';
    });
  }

  void _setMonth(String v) {
    setState(() {
      _monthFilter = v;
    });
  }

  void _setStatus(String v) {
    setState(() {
      _statusFilter = v;
    });
  }

  Color _statusColor(String? status) {
    final st = (status ?? 'pending').toLowerCase().trim();
    switch (st) {
      case 'approved':
      case 'accepted':
        return Colors.green;
      case 'rejected':
      case 'denied':
        return Colors.red;
      case 'pending':
        return Colors.orange;
      case 'cancelled':
      case 'canceled':
        return Colors.grey;
      default:
        return Colors.blueGrey;
    }
  }

  Widget _buildFilterBar({
    required List<String> yearOptions,
    required List<String> monthOptions,
    required List<String> statusOptions,
    required int total,
    required int shown,
  }) {
    return Container(
      padding: const EdgeInsets.all(12),
      color: Colors.grey[100],
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          children: [
            const Icon(Icons.filter_list, color: Colors.blue),
            const SizedBox(width: 8),
            // const Text("Filter: ", style: TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(width: 12),

            // Year Dropdown
            DropdownButton<String>(
              value: _yearFilter,
              items: yearOptions
                  .map((y) => DropdownMenuItem<String>(
                value: y,
                child: Text(y == 'ALL' ? 'All Years' : y),
              ))
                  .toList(),
              onChanged: (val) {
                if (val != null) _setYear(val);
              },
            ),
            const SizedBox(width: 16),

            // Month Dropdown
            DropdownButton<String>(
              value: _monthFilter,
              items: monthOptions
                  .map((m) => DropdownMenuItem<String>(
                value: m,
                child: Text(m == 'ALL' ? 'All Months' : 'Month $m'),
              ))
                  .toList(),
              onChanged: (val) {
                if (val != null) _setMonth(val);
              },
            ),
            const SizedBox(width: 16),

            // Status Dropdown
            DropdownButton<String>(
              value: _statusFilter,
              items: statusOptions
                  .map((s) => DropdownMenuItem<String>(
                value: s,
                child: Text(s == 'ALL' ? 'All Status' : s.toUpperCase()),
              ))
                  .toList(),
              onChanged: (val) {
                if (val != null) _setStatus(val);
              },
            ),

            const SizedBox(width: 16),
            Text(
              "Showing $shown/$total",
              style: TextStyle(color: Colors.grey[700]),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Leave Requests'),
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
        label: const Text('Create New'),
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
                child: Text('Error: ${snap.error}'),
              ),
            );
          }

          final items = snap.data ?? [];
          if (items.isEmpty) {
            return const Center(child: Text('No leave requests found.'));
          }

          final yearOptions = _buildYearOptions(items);
          final monthOptions = _buildMonthOptions();
          final statusOptions = _buildStatusOptions(items);

          if (!yearOptions.contains(_yearFilter)) _yearFilter = 'ALL';
          if (!monthOptions.contains(_monthFilter)) _monthFilter = 'ALL';
          if (!statusOptions.contains(_statusFilter)) _statusFilter = 'ALL';

          final filtered = _applyFilters(items);

          return RefreshIndicator(
            onRefresh: _reload,
            child: Column(
              children: [
                _buildFilterBar(
                  yearOptions: yearOptions,
                  monthOptions: monthOptions,
                  statusOptions: statusOptions,
                  total: items.length,
                  shown: filtered.length,
                ),
                Expanded(
                  child: filtered.isEmpty
                      ? Center(
                    child: Text(
                      "No leave requests found for selected filter.",
                      style: TextStyle(color: Colors.grey[700]),
                    ),
                  )
                      : ListView.separated(
                    padding: const EdgeInsets.all(12),
                    itemCount: filtered.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 8),
                    itemBuilder: (context, i) {
                      final lr = filtered[i];
                      final dateText =
                          '${lr.startDate.toString().substring(0, 10)} → ${lr.endDate.toString().substring(0, 10)}';

                      return ListTile(
                        tileColor: Colors.grey.shade100,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        title: Text(dateText),
                        subtitle: Text('Reson: ${lr.reason.isEmpty ? "(Empty)" : lr.reason}'),
                        trailing: Text(
                          (lr.status ?? 'pending').toUpperCase(),
                          style: TextStyle(
                            color: _statusColor(lr.status),
                            fontWeight: FontWeight.bold,
                          ),
                        ),
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
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}