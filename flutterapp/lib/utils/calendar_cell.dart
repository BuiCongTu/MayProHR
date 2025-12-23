class CalendarCell {
  final DateTime? date;
  const CalendarCell(this.date);
}

List<CalendarCell> buildMonthGrid(DateTime month) {
  final first = DateTime(month.year, month.month, 1);
  final nextMonth = DateTime(month.year, month.month + 1, 1);
  final lastDay = nextMonth.subtract(const Duration(days: 1));

  // Monday=1..Sunday=7. Chuyển về 0..6 (Mon=0)
  final firstWeekdayMon0 = (first.weekday + 6) % 7;
  final totalDays = lastDay.day;

  final cells = <CalendarCell>[];
  for (int i = 0; i < firstWeekdayMon0; i++) {
    cells.add(const CalendarCell(null));
  }
  for (int d = 1; d <= totalDays; d++) {
    cells.add(CalendarCell(DateTime(month.year, month.month, d)));
  }
  while (cells.length % 7 != 0) {
    cells.add(const CalendarCell(null));
  }
  return cells;
}

String ymd(DateTime d) =>
    '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';