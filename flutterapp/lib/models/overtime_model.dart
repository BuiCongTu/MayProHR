class OvertimeInvite {
  final int ticketId;
  final String status;       // "pending", "accepted", "rejected"
  final String overtimeDate; // "2023-10-25"
  final String startTime;    // "17:00:00"
  final String endTime;      // "19:00:00"
  final double hours;
  final String departmentName;
  final String managerName;
  final String lineName;
  final int currentAttendees;
  final int maxAttendees;

  OvertimeInvite({
    required this.ticketId,
    required this.status,
    required this.overtimeDate,
    required this.startTime,
    required this.endTime,
    required this.hours,
    required this.departmentName,
    required this.managerName,
    required this.lineName,
    this.currentAttendees = 0,
    this.maxAttendees = 0,
  });

  factory OvertimeInvite.fromJson(Map<String, dynamic> json) {
    return OvertimeInvite(
      ticketId: json['ticketId'] ?? 0,
      status: json['status'] ?? 'pending',
      overtimeDate: json['overtimeDate']?.toString() ?? '',
      startTime: json['startTime']?.toString() ?? '',
      endTime: json['endTime']?.toString() ?? '',
      hours: (json['hours'] ?? 0).toDouble(),
      departmentName: json['departmentName'] ?? 'Unknown Dept',
      managerName: json['managerName'] ?? 'Unknown Manager',
      lineName: json['lineName'] ?? 'N/A',
      currentAttendees: json['currentAttendees'] ?? 0,
      maxAttendees: json['maxAttendees'] ?? 0,
    );
  }
}