class Holiday {
  final int id;
  final DateTime holidayDate;
  final String holidayName;
  final bool isPaid;
  final String? note;

  Holiday({
    required this.id,
    required this.holidayDate,
    required this.holidayName,
    required this.isPaid,
    required this.note,
  });

  factory Holiday.fromJson(Map<String, dynamic> json) {
    return Holiday(
      id: (json['id'] as num).toInt(),
      holidayDate: DateTime.parse(json['holidayDate'] as String),
      holidayName: (json['holidayName'] ?? '').toString(),
      isPaid: (json['isPaid'] as bool?) ?? true,
      note: json['note']?.toString(),
    );
  }
}