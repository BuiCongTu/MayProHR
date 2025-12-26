import 'package:flutter/material.dart';

import '../../configs/AttendanceApi.dart';
import '../../configs/holiday_api.dart';
import '../../models/AttendanceRecord.dart';
import '../../models/holiday.dart';
import '../../services/storage_service.dart';
import '../../utils/calendar_cell.dart';

class AttendanceCalendarScreen extends StatefulWidget {
  const AttendanceCalendarScreen({
    super.key,
    required this.api,
    required this.userId,
  });

  final AttendanceApi api;
  final int userId;

  @override
  State<AttendanceCalendarScreen> createState() => _AttendanceCalendarScreenState();
}

class _AttendanceCalendarScreenState extends State<AttendanceCalendarScreen> {
  DateTime currentMonth = DateTime(DateTime.now().year, DateTime.now().month, 1);

  bool loadingMonth = false;
  String? error;
  List<AttendanceRecord> monthRecords = [];

  Map<String, int> countByDay = {}; // YYYY-MM-DD -> count
  Map<String, Holiday> holidayByDay = {}; // YYYY-MM-DD -> Holiday

  late final HolidayApi holidayApi = HolidayApi(
    getToken: () => StorageService().getToken(),
  );

  @override
  void initState() {
    super.initState();
    _loadMonth();
  }

  String _monthKey(DateTime d) => '${d.year}-${d.month.toString().padLeft(2, '0')}';

  Future<void> _loadMonth() async {
    setState(() {
      loadingMonth = true;
      error = null;
      monthRecords = [];
      countByDay = {};
      holidayByDay = {};
    });

    try {
      final monthStr = _monthKey(currentMonth);

      // load song song attendance + holidays
      final results = await Future.wait([
        widget.api.getByMonth(month: monthStr, userId: widget.userId),
        holidayApi.getByMonth(year: currentMonth.year, month: currentMonth.month),
      ]);

      final attendanceData = results[0] as List<AttendanceRecord>;
      final holidayData = results[1] as List<Holiday>;

      final countMap = <String, int>{};
      for (final r in attendanceData) {
        final key = ymd(r.date);
        countMap[key] = (countMap[key] ?? 0) + 1;
      }

      final holidayMap = <String, Holiday>{};
      for (final h in holidayData) {
        final key = ymd(h.holidayDate);
        holidayMap[key] = h;
      }

      setState(() {
        monthRecords = attendanceData;
        countByDay = countMap;
        holidayByDay = holidayMap;
      });
    } catch (e) {
      setState(() => error = e.toString());
    } finally {
      setState(() => loadingMonth = false);
    }
  }

  Future<void> _pickMonth() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: currentMonth,
      firstDate: DateTime(2020, 1, 1),
      lastDate: DateTime(2100, 12, 31),
      helpText: 'Chọn ngày bất kỳ trong tháng cần xem',
    );
    if (picked != null) {
      setState(() {
        currentMonth = DateTime(picked.year, picked.month, 1);
      });
      await _loadMonth();
    }
  }

  Future<void> _goPrevMonth() async {
    setState(() {
      currentMonth = DateTime(currentMonth.year, currentMonth.month - 1, 1);
    });
    await _loadMonth();
  }

  Future<void> _goNextMonth() async {
    setState(() {
      currentMonth = DateTime(currentMonth.year, currentMonth.month + 1, 1);
    });
    await _loadMonth();
  }

  Future<void> _openDayDetail(DateTime day) async {
    final dayKey = ymd(day);
    final dayList = monthRecords.where((r) => ymd(r.date) == dayKey).toList();
    final holiday = holidayByDay[dayKey];

    if (!mounted) return;
    showModalBottomSheet(
      context: context,
      showDragHandle: true,
      isScrollControlled: true,
      builder: (_) => AttendanceDayBottomSheet(
        date: day,
        records: dayList,
        holiday: holiday,
      ),
    );
  }

  Widget _countBadge(int count) {
    final text = count > 99 ? '99+' : '$count';

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
      constraints: const BoxConstraints(minWidth: 14, maxWidth: 30),
      decoration: BoxDecoration(
        color: Colors.black.withOpacity(0.10),
        borderRadius: BorderRadius.circular(999),
      ),
      child: FittedBox(
        fit: BoxFit.scaleDown,
        child: Text(
          text,
          maxLines: 1,
          overflow: TextOverflow.clip,
          style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700),
        ),
      ),
    );
  }

  Widget _holidayDot({required Color color}) {
    return Container(
      width: 8,
      height: 8,
      decoration: BoxDecoration(
        color: color,
        shape: BoxShape.circle,
      ),
    );
  }

  Widget _calendarCell({
    required DateTime d,
    required bool sunday,
    required bool today,
    required int count,
    required bool isHoliday,
    required Holiday? holiday,
    required Color bg,
    required Color border,
  }) {
    // TRÁNH RenderFlex: dùng Stack thay vì Column trong ô nhỏ
    return InkWell(
      onTap: () => _openDayDetail(d),
      borderRadius: BorderRadius.circular(10),
      child: Container(
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: border),
        ),
        padding: const EdgeInsets.all(4),
        child: Stack(
          children: [
            Positioned(
              left: 0,
              top: 0,
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 18),
                child: FittedBox(
                  fit: BoxFit.scaleDown,
                  alignment: Alignment.topLeft,
                  child: Text(
                    '${d.day}',
                    style: TextStyle(
                      fontWeight: FontWeight.w700,
                      fontSize: 14,
                      color: (isHoliday || sunday) ? Colors.red[700] : Colors.black87,
                    ),
                  ),
                ),
              ),
            ),

            // chấm báo holiday (top-right)
            if (isHoliday)
              Positioned(
                right: 0,
                top: 0,
                child: Tooltip(
                  message: holiday?.holidayName ?? 'Holiday',
                  child: _holidayDot(color: Colors.red.shade400),
                ),
              ),

            if (count > 0)
              Positioned(
                left: 0,
                bottom: 0,
                child: _countBadge(count),
              ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final cells = buildMonthGrid(currentMonth);
    final monthLabel = '${currentMonth.month.toString().padLeft(2, '0')}/${currentMonth.year}';

    return Scaffold(
      appBar: AppBar(
        title: Text('Attendance - $monthLabel'),
        actions: [
          IconButton(
            tooltip: 'Select Month',
            icon: const Icon(Icons.calendar_month),
            onPressed: _pickMonth,
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            if (loadingMonth) const LinearProgressIndicator(),
            if (error != null)
              Padding(
                padding: const EdgeInsets.all(12),
                child: Row(
                  children: [
                    Expanded(child: Text('Error: $error')),
                    TextButton(
                      onPressed: _loadMonth,
                      child: const Text('Retry'),
                    ),
                  ],
                ),
              ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              child: Row(
                children: [
                  IconButton(
                    tooltip: 'Last Month',
                    onPressed: loadingMonth ? null : _goPrevMonth,
                    icon: const Icon(Icons.chevron_left),
                  ),
                  Expanded(
                    child: Center(
                      child: Text(
                        monthLabel,
                        style: const TextStyle(fontWeight: FontWeight.w700),
                      ),
                    ),
                  ),
                  IconButton(
                    tooltip: 'Next Month',
                    onPressed: loadingMonth ? null : _goNextMonth,
                    icon: const Icon(Icons.chevron_right),
                  ),
                ],
              ),
            ),
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              child: Row(
                children: [
                  Expanded(child: Center(child: Text('Mo'))),
                  Expanded(child: Center(child: Text('Tu'))),
                  Expanded(child: Center(child: Text('We'))),
                  Expanded(child: Center(child: Text('Th'))),
                  Expanded(child: Center(child: Text('Fr'))),
                  Expanded(child: Center(child: Text('Sa'))),
                  Expanded(child: Center(child: Text('Su'))),
                ],
              ),
            ),
            Expanded(
              child: RefreshIndicator(
                onRefresh: _loadMonth,
                child: GridView.builder(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 7,
                    mainAxisSpacing: 8,
                    crossAxisSpacing: 8,
                    childAspectRatio: 1.0,
                  ),
                  itemCount: cells.length,
                  itemBuilder: (_, i) {
                    final cell = cells[i];
                    if (cell.date == null) return const SizedBox.shrink();

                    final d = cell.date!;
                    final key = ymd(d);

                    final count = countByDay[key] ?? 0;
                    final holiday = holidayByDay[key];
                    final isHoliday = holiday != null;

                    final sunday = d.weekday == DateTime.sunday;
                    final today = ymd(d) == ymd(DateTime.now());

                    // ưu tiên màu: today > holiday > sunday > attendance > default
                    final bg = today
                        ? Colors.blue.withOpacity(0.12)
                        : isHoliday
                        ? Colors.red.withOpacity(0.10)
                        : sunday
                        ? Colors.red.withOpacity(0.08)
                        : count > 0
                        ? Colors.green.withOpacity(0.08)
                        : Colors.grey.withOpacity(0.06);

                    final border = today ? Colors.blue : Colors.grey.withOpacity(0.25);

                    return _calendarCell(
                      d: d,
                      sunday: sunday,
                      today: today,
                      count: count,
                      isHoliday: isHoliday,
                      holiday: holiday,
                      bg: bg,
                      border: border,
                    );
                  },
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class AttendanceDayBottomSheet extends StatelessWidget {
  const AttendanceDayBottomSheet({
    super.key,
    required this.date,
    required this.records,
    required this.holiday,
  });

  final DateTime date;
  final List<AttendanceRecord> records;
  final Holiday? holiday;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: DraggableScrollableSheet(
        expand: false,
        initialChildSize: 0.55,
        minChildSize: 0.35,
        maxChildSize: 0.90,
        builder: (context, scrollController) {
          return Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
            child: Column(
              children: [
                Text(
                  'Information ${ymd(date)}',
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
                ),

                if (holiday != null) ...[
                  const SizedBox(height: 8),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: Colors.red.withOpacity(0.08),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: Colors.red.withOpacity(0.25)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.celebration, color: Colors.red),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            holiday!.holidayName,
                            style: const TextStyle(fontWeight: FontWeight.w700),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],

                const SizedBox(height: 12),
                Expanded(
                  child: records.isEmpty
                      ? const Center(child: Text('No attendance records for this day.'))
                      : ListView.separated(
                    controller: scrollController,
                    itemCount: records.length,
                    separatorBuilder: (_, __) => const Divider(height: 1),
                    itemBuilder: (_, i) {
                      final r = records[i];
                      return ListTile(
                        dense: true,
                        title: Text(
                          'In: ${r.timeIn ?? '-'} | Out: ${r.timeOut ?? '-'}',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        subtitle: (r.reason != null && r.reason!.isNotEmpty)
                            ? Text(
                          'Reason: ${r.reason}',
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        )
                            : null,
                        trailing: Text(
                          r.status,
                          style: TextStyle(
                            fontWeight: FontWeight.w700,
                            color: _statusColor(r.status),
                          ),
                        ),
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

  Color _statusColor(String status) {
    switch (status) {
      case 'SUCCESS':
        return Colors.green;
      case 'LATE':
        return Colors.orange;
      case 'MANUAL':
        return Colors.blue;
      case 'ERROR':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }
}