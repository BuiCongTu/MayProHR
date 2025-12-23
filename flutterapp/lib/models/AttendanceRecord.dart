class AttendanceRecord {
  final int? id;
  final int? userId;
  final String? userName;
  final DateTime date;
  final String? timeIn;
  final String? timeOut;
  final String status;
  final String? reason;

  AttendanceRecord({
    required this.id,
    required this.userId,
    required this.userName,
    required this.date,
    required this.timeIn,
    required this.timeOut,
    required this.status,
    required this.reason,
  });

  factory AttendanceRecord.fromJson(Map<String, dynamic> json) {
    return AttendanceRecord(
      id: json['id'] as int?,
      userId: json['userId'] as int?,
      userName: json['userName'] as String?,
      date: DateTime.parse(json['date'] as String),
      timeIn: json['timeIn']?.toString(),
      timeOut: json['timeOut']?.toString(),
      status: (json['status']?.toString() ?? 'UNKNOWN').toUpperCase(),
      reason: json['reason'] as String?,
    );
  }
}