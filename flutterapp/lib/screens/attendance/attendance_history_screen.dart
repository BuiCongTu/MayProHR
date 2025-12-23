import 'package:flutter/material.dart';

import '../../configs/AttendanceApi.dart';
import '../../models/AttendanceRecord.dart';

class AttendanceHistoryScreen extends StatefulWidget {
  const AttendanceHistoryScreen({
    super.key,
    required this.api,
    required this.userId,
  });

  final AttendanceApi api;
  final int userId;

  @override
  State<AttendanceHistoryScreen> createState() => _AttendanceHistoryScreenState();
}

class _AttendanceHistoryScreenState extends State<AttendanceHistoryScreen> {
  String selectedMonth =
      '${DateTime.now().year}-${DateTime.now().month.toString().padLeft(2, '0')}';
  int selectedYear = DateTime.now().year;

  bool loading = false;
  String? error;
  List<AttendanceRecord> records = [];

  Future<void> loadMonth() async {
    setState(() {
      loading = true;
      error = null;
    });
    try {
      final data = await widget.api.getByMonth(
        month: selectedMonth,
        userId: widget.userId,
      );
      setState(() {
        records = data;
      });
    } catch (e) {
      setState(() {
        error = e.toString();
        records = [];
      });
    } finally {
      setState(() {
        loading = false;
      });
    }
  }

  Future<void> loadYear() async {
    setState(() {
      loading = true;
      error = null;
    });
    try {
      final data = await widget.api.getByYear(
        year: selectedYear,
        userId: widget.userId,
      );
      setState(() {
        records = data;
      });
    } catch (e) {
      setState(() {
        error = e.toString();
        records = [];
      });
    } finally {
      setState(() {
        loading = false;
      });
    }
  }

  int countStatus(String s) => records.where((r) => r.status == s).length;

  @override
  void initState() {
    super.initState();
    loadMonth();
  }

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Lịch sử chấm công'),
          bottom: const TabBar(
            tabs: [
              Tab(text: 'Theo tháng'),
              Tab(text: 'Theo năm'),
            ],
          ),
        ),
        body: TabBarView(
          children: [
            _buildMonthTab(),
            _buildYearTab(),
          ],
        ),
      ),
    );
  }

  Widget _buildMonthTab() {
    return SafeArea(
      child: RefreshIndicator(
        onRefresh: loadMonth,
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            SliverToBoxAdapter(child: _buildMonthPickerBar()),
            SliverToBoxAdapter(child: _buildSummary()),
            ..._buildRecordsSlivers(),
          ],
        ),
      ),
    );
  }

  Widget _buildYearTab() {
    return SafeArea(
      child: RefreshIndicator(
        onRefresh: loadYear,
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            SliverToBoxAdapter(child: _buildYearPickerBar()),
            SliverToBoxAdapter(child: _buildSummary()),
            ..._buildRecordsSlivers(),
          ],
        ),
      ),
    );
  }

  Widget _buildMonthPickerBar() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 8, 12, 4),
      child: Row(
        children: [
          Expanded(
            child: Text(
              'Tháng: $selectedMonth',
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontWeight: FontWeight.w700),
            ),
          ),
          const SizedBox(width: 10),
          FilledButton(
            onPressed: loading
                ? null
                : () async {
              final picked = await showDatePicker(
                context: context,
                initialDate: DateTime.now(),
                firstDate: DateTime(2020, 1, 1),
                lastDate: DateTime(2100, 12, 31),
                helpText: 'Chọn ngày bất kỳ trong tháng cần xem',
              );
              if (picked != null) {
                setState(() {
                  selectedMonth =
                  '${picked.year}-${picked.month.toString().padLeft(2, '0')}';
                });
                await loadMonth();
              }
            },
            child: const Text('Chọn tháng'),
          ),
        ],
      ),
    );
  }

  Widget _buildYearPickerBar() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 8, 12, 4),
      child: Row(
        children: [
          Expanded(
            child: Text(
              'Năm: $selectedYear',
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontWeight: FontWeight.w700),
            ),
          ),
          const SizedBox(width: 10),
          FilledButton(
            onPressed: loading
                ? null
                : () async {
              final year = await showDialog<int>(
                context: context,
                builder: (_) => SimpleDialog(
                  title: const Text('Chọn năm'),
                  children: List.generate(6, (i) {
                    final y = DateTime.now().year - i;
                    return SimpleDialogOption(
                      onPressed: () => Navigator.pop(context, y),
                      child: Text('$y'),
                    );
                  }),
                ),
              );
              if (year != null) {
                setState(() => selectedYear = year);
                await loadYear();
              }
            },
            child: const Text('Chọn năm'),
          ),
        ],
      ),
    );
  }

  Widget _buildSummary() {
    if (loading) return const LinearProgressIndicator();

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      child: Wrap(
        spacing: 10,
        runSpacing: 8,
        children: [
          Chip(label: Text('Total: ${records.length}')),
          Chip(label: Text('SUCCESS: ${countStatus('SUCCESS')}')),
          Chip(label: Text('LATE: ${countStatus('LATE')}')),
          Chip(label: Text('MANUAL: ${countStatus('MANUAL')}')),
          Chip(label: Text('ERROR: ${countStatus('ERROR')}')),
        ],
      ),
    );
  }

  List<Widget> _buildRecordsSlivers() {
    if (error != null) {
      return [
        SliverFillRemaining(
          hasScrollBody: false,
          child: Center(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text('Lỗi: $error'),
                  const SizedBox(height: 10),
                  FilledButton(
                    onPressed: loading ? null : loadMonth, // tab nào cũng bấm được; refresh vẫn chuẩn
                    child: const Text('Thử lại'),
                  ),
                ],
              ),
            ),
          ),
        ),
      ];
    }

    if (!loading && records.isEmpty) {
      return const [
        SliverFillRemaining(
          hasScrollBody: false,
          child: Center(child: Text('Không có dữ liệu.')),
        ),
      ];
    }

    return [
      SliverPadding(
        padding: const EdgeInsets.fromLTRB(12, 6, 12, 12),
        sliver: SliverList.separated(
          itemCount: records.length,
          separatorBuilder: (_, __) => const SizedBox(height: 8),
          itemBuilder: (_, i) => _recordCard(records[i]),
        ),
      ),
    ];
  }

  Widget _recordCard(AttendanceRecord r) {
    final dateText =
        '${r.date.year}-${r.date.month.toString().padLeft(2, '0')}-${r.date.day.toString().padLeft(2, '0')}';
    final timeText = 'In: ${r.timeIn ?? '-'}  |  Out: ${r.timeOut ?? '-'}';

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.withOpacity(0.18)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.03),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  dateText,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 4),
                Text(
                  timeText,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(color: Colors.grey[700]),
                ),
              ],
            ),
          ),
          const SizedBox(width: 10),
          SizedBox(
            width: 34,
            height: 34,
            child: Center(child: _statusIcon(r.status)),
          ),
        ],
      ),
    );
  }

  Widget _statusIcon(String status) {
    IconData icon;
    Color color;

    switch (status) {
      case 'SUCCESS':
        icon = Icons.check_circle;
        color = Colors.green;
        break;
      case 'LATE':
        icon = Icons.schedule;
        color = Colors.orange;
        break;
      case 'MANUAL':
        icon = Icons.edit;
        color = Colors.blue;
        break;
      case 'ERROR':
        icon = Icons.cancel;
        color = Colors.red;
        break;
      default:
        icon = Icons.help;
        color = Colors.grey;
    }

    return Container(
      width: 34,
      height: 34,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: color.withOpacity(0.12),
        shape: BoxShape.circle,
      ),
      child: Icon(icon, color: color, size: 20),
    );
  }
}