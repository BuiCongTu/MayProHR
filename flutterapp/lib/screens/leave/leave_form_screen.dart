// dart
import 'package:flutter/material.dart';

import '../../models/leave_balance_model.dart';
import '../../models/leave_reason_model.dart';
import '../../services/leave_service.dart';

class LeaveFormScreen extends StatefulWidget {
  final int userId;
  const LeaveFormScreen({super.key, required this.userId});

  @override
  State<LeaveFormScreen> createState() => _LeaveFormScreenState();
}

class _LeaveFormScreenState extends State<LeaveFormScreen> {
  final _formKey = GlobalKey<FormState>();
  final _reasonCtrl = TextEditingController();
  final LeaveService _service = LeaveService();

  DateTime? _start;
  DateTime? _end;

  int? _leaveReasonId;
  late Future<List<LeaveReasonModel>> _leaveReasonsFuture;

  // ✅ NEW: leave balance
  LeaveBalanceModel? _balance;
  bool _loadingBalance = false;

  final List<String> _leaveTypes = const [
    'ShortTerm',
    'LongTerm',
    'Maternity',
    'Accident',
    'Other',
  ];
  String _selectedType = 'ShortTerm';

  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _leaveReasonsFuture = _service.getLeaveReasons();
    _loadBalance(asOf: DateTime.now());
  }

  @override
  void dispose() {
    _reasonCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadBalance({required DateTime asOf}) async {
    setState(() => _loadingBalance = true);
    try {
      final b = await _service.getLeaveBalance(userId: widget.userId, asOf: asOf);
      if (!mounted) return;
      setState(() => _balance = b);
    } catch (_) {
      if (!mounted) return;
      setState(() => _balance = null);
    } finally {
      if (mounted) setState(() => _loadingBalance = false);
    }
  }

  Future<DateTime?> _pickDate(DateTime? initial) async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      firstDate: DateTime(now.year - 1, 1, 1),
      lastDate: DateTime(now.year + 2, 12, 31),
      initialDate: initial ?? now,
    );
    return picked;
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_start == null || _end == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select start and end dates')),
      );
      return;
    }
    if (_start!.isAfter(_end!)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Start date must be before end date')),
      );
      return;
    }
    if (_leaveReasonId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select a leave reason')),
      );
      return;
    }

    setState(() => _saving = true);
    try {
      await _service.createLeaveRequest(
        userId: widget.userId,
        leaveReasonId: _leaveReasonId!,
        type: _selectedType,
        startDate: _start!,
        endDate: _end!,
        reason: _reasonCtrl.text,
      );

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Leave request created successfully')),
      );
      Navigator.pop(context, true);
    } catch (e) {
      // ✅ NEW: sẽ show rõ "trùng ngày đã APPROVED ..." từ backend
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString())),
      );
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final startText = _start == null ? 'Start day' : _start.toString().substring(0, 10);
    final endText = _end == null ? 'End Day' : _end.toString().substring(0, 10);

    return Scaffold(
      appBar: AppBar(title: const Text('Leave Request Form')),
      body: AbsorbPointer(
        absorbing: _saving,
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Form(
            key: _formKey,
            child: Column(
              children: [
                // ✅ NEW: Leave balance box
                Card(
                  elevation: 1,
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Paid leave balance',
                          style: TextStyle(fontWeight: FontWeight.w700),
                        ),
                        _loadingBalance
                            ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                            : Text(
                          _balance == null
                              ? '-'
                              : 'Remaining: ${_balance!.remainingPaidLeaveDays} / ${_balance!.entitledDaysToDate} (used ${_balance!.approvedLeaveDaysUsedToDate})',
                          style: const TextStyle(fontWeight: FontWeight.w600),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 12),

                FutureBuilder<List<LeaveReasonModel>>(
                  future: _leaveReasonsFuture,
                  builder: (context, snap) {
                    if (snap.connectionState == ConnectionState.waiting) {
                      return const LinearProgressIndicator();
                    }
                    if (snap.hasError) {
                      return Text('Error loading leave reasons: ${snap.error}');
                    }

                    final items = snap.data ?? [];
                    if (items.isEmpty) {
                      return const Text('No leave reasons available.');
                    }

                    _leaveReasonId ??= items.first.id;

                    return DropdownButtonFormField<int>(
                      value: _leaveReasonId,
                      items: items
                          .map((e) => DropdownMenuItem<int>(
                        value: e.id,
                        child: Text(e.reason),
                      ))
                          .toList(),
                      onChanged: (v) => setState(() => _leaveReasonId = v),
                      decoration: const InputDecoration(
                        labelText: 'Leave Reason',
                        border: OutlineInputBorder(),
                      ),
                    );
                  },
                ),
                const SizedBox(height: 12),

                DropdownButtonFormField<String>(
                  value: _selectedType,
                  items: _leaveTypes
                      .map((t) => DropdownMenuItem<String>(
                    value: t,
                    child: Text(t),
                  ))
                      .toList(),
                  onChanged: (v) => setState(() => _selectedType = v ?? 'ShortTerm'),
                  decoration: const InputDecoration(
                    labelText: 'Leave Type',
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 12),

                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () async {
                          final d = await _pickDate(_start);
                          if (d != null) {
                            setState(() => _start = d);
                            // ✅ NEW: cập nhật balance theo tháng xin nghỉ (asOf = startDate)
                            _loadBalance(asOf: d);
                          }
                        },
                        child: Text('From: $startText'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () async {
                          final d = await _pickDate(_end);
                          if (d != null) setState(() => _end = d);
                        },
                        child: Text('To: $endText'),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                TextFormField(
                  controller: _reasonCtrl,
                  maxLines: 4,
                  decoration: const InputDecoration(
                    labelText: 'Reason',
                    border: OutlineInputBorder(),
                  ),
                  validator: (v) {
                    if (v == null || v.trim().isEmpty) return 'Please enter a reason';
                    return null;
                  },
                ),
                const SizedBox(height: 16),

                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: _submit,
                    child: _saving
                        ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                        : const Text('Submit Leave Request'),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}