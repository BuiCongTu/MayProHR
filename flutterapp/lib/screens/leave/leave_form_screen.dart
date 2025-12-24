import 'package:flutter/material.dart';

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

  // Theo enum backend: ShortTerm, LongTerm, Maternity, Accident, Other
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
  }

  @override
  void dispose() {
    _reasonCtrl.dispose();
    super.dispose();
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
        const SnackBar(content: Text('Vui lòng chọn ngày bắt đầu/kết thúc')),
      );
      return;
    }
    if (_start!.isAfter(_end!)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Ngày bắt đầu phải <= ngày kết thúc')),
      );
      return;
    }
    if (_leaveReasonId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Vui lòng chọn loại nghỉ')),
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
        const SnackBar(content: Text('Tạo đơn nghỉ phép thành công (PENDING)')),
      );
      Navigator.pop(context, true);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Tạo đơn thất bại: $e')),
      );
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final startText = _start == null ? 'Chọn ngày' : _start.toString().substring(0, 10);
    final endText = _end == null ? 'Chọn ngày' : _end.toString().substring(0, 10);

    return Scaffold(
      appBar: AppBar(title: const Text('Tạo đơn nghỉ phép')),
      body: AbsorbPointer(
        absorbing: _saving,
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Form(
            key: _formKey,
            child: Column(
              children: [
                FutureBuilder<List<LeaveReasonModel>>(
                  future: _leaveReasonsFuture,
                  builder: (context, snap) {
                    if (snap.connectionState == ConnectionState.waiting) {
                      return const LinearProgressIndicator();
                    }
                    if (snap.hasError) {
                      return Text('Không tải được loại nghỉ: ${snap.error}');
                    }

                    final items = snap.data ?? [];
                    if (items.isEmpty) {
                      return const Text('Danh sách loại nghỉ đang trống.');
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
                        labelText: 'Loại nghỉ',
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
                          if (d != null) setState(() => _start = d);
                        },
                        child: Text('Từ: $startText'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () async {
                          final d = await _pickDate(_end);
                          if (d != null) setState(() => _end = d);
                        },
                        child: Text('Đến: $endText'),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                TextFormField(
                  controller: _reasonCtrl,
                  maxLines: 4,
                  decoration: const InputDecoration(
                    labelText: 'Lý do / ghi chú',
                    border: OutlineInputBorder(),
                  ),
                  validator: (v) {
                    if (v == null || v.trim().isEmpty) return 'Vui lòng nhập lý do';
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
                        : const Text('Gửi đơn (Pending)'),
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