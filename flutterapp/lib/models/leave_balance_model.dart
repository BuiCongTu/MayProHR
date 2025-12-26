class LeaveBalanceModel {
  final int userId;
  final DateTime asOf;
  final int year;

  final int entitledDaysToDate;
  final int approvedLeaveDaysUsedToDate;
  final int remainingPaidLeaveDays;

  LeaveBalanceModel({
    required this.userId,
    required this.asOf,
    required this.year,
    required this.entitledDaysToDate,
    required this.approvedLeaveDaysUsedToDate,
    required this.remainingPaidLeaveDays,
  });

  static int _asInt(dynamic v) {
    if (v is int) return v;
    if (v is num) return v.toInt();
    if (v is String) return int.tryParse(v) ?? 0;
    return 0;
  }

  static DateTime _asDate(dynamic v) {
    if (v is String) return DateTime.tryParse(v) ?? DateTime.now();
    return DateTime.now();
  }

  factory LeaveBalanceModel.fromJson(Map<String, dynamic> json) {
    return LeaveBalanceModel(
      userId: _asInt(json['userId']),
      asOf: _asDate(json['asOf']),
      year: _asInt(json['year']),
      entitledDaysToDate: _asInt(json['entitledDaysToDate']),
      approvedLeaveDaysUsedToDate: _asInt(json['approvedLeaveDaysUsedToDate']),
      remainingPaidLeaveDays: _asInt(json['remainingPaidLeaveDays']),
    );
  }
}