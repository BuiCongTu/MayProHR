class LeaveRequestModel {
  final int? id;

  final int userId;

  final int leaveReasonId;

  /// Theo enum backend: ShortTerm, LongTerm, Maternity, Accident, Other
  final String type;

  final DateTime startDate;
  final DateTime endDate;

  final String reason;

  /// pending, confirmed, approved, rejected
  final String? status;

  final String? comment;
  final String? rejectReason;
  final DateTime? createdAt;

  LeaveRequestModel({
    this.id,
    required this.userId,
    required this.leaveReasonId,
    required this.type,
    required this.startDate,
    required this.endDate,
    required this.reason,
    this.status,
    this.comment,
    this.rejectReason,
    this.createdAt,
  });

  static const List<String> leaveTypes = <String>[
    'ShortTerm',
    'LongTerm',
    'Maternity',
    'Accident',
    'Other',
  ];

  static const List<String> leaveStatuses = <String>[
    'pending',
    'confirmed',
    'approved',
    'rejected',
  ];

  static int? _asInt(dynamic v) {
    if (v is int) return v;
    if (v is String) return int.tryParse(v);
    return null;
  }

  static String? _asString(dynamic v) => v?.toString();

  static DateTime? _parseDateTime(dynamic v) {
    if (v == null) return null;
    if (v is String && v.isNotEmpty) {
      // LocalDate -> "2025-12-24"
      // Instant -> "2025-12-24T10:20:30Z"
      return DateTime.tryParse(v);
    }
    return null;
  }

  /// Parse từ JSON backennd
  factory LeaveRequestModel.fromJson(Map<String, dynamic> json) {
    final user = json['user'];
    final int userId = (user is Map)
        ? (_asInt((user as Map)['id']) ?? 0)
        : (_asInt(json['userId']) ?? 0);

    final lr = json['leaveReason'];
    final int leaveReasonId = (lr is Map)
        ? (_asInt((lr as Map)['id']) ?? 0)
        : (_asInt(json['leaveReasonId']) ?? 0);

    final DateTime start = _parseDateTime(json['startDate']) ??
        DateTime.fromMillisecondsSinceEpoch(0);
    final DateTime end = _parseDateTime(json['endDate']) ??
        DateTime.fromMillisecondsSinceEpoch(0);

    return LeaveRequestModel(
      id: _asInt(json['id']),
      userId: userId,
      leaveReasonId: leaveReasonId,
      type: _asString(json['type']) ?? 'ShortTerm',
      startDate: start,
      endDate: end,
      reason: _asString(json['reason']) ?? '',
      status: _asString(json['status']),
      comment: _asString(json['comment']),
      rejectReason: _asString(json['rejectReason']),
      createdAt: _parseDateTime(json['createdAt']),
    );
  }

  Map<String, dynamic> toCreatePayload() {
    return {
      'user': {'id': userId},
      'leaveReason': {'id': leaveReasonId},
      'type': type,
      'startDate': startDate.toIso8601String().substring(0, 10),
      'endDate': endDate.toIso8601String().substring(0, 10),
      'reason': reason,
    };
  }

  Map<String, dynamic> toUpdatePayloadForEmployee() {
    return {
      'leaveReason': {'id': leaveReasonId},
      'type': type,
      'startDate': startDate.toIso8601String().substring(0, 10),
      'endDate': endDate.toIso8601String().substring(0, 10),
      'reason': reason,
    };
  }

  LeaveRequestModel copyWith({
    int? id,
    int? userId,
    int? leaveReasonId,
    String? type,
    DateTime? startDate,
    DateTime? endDate,
    String? reason,
    String? status,
    String? comment,
    String? rejectReason,
    DateTime? createdAt,
  }) {
    return LeaveRequestModel(
      id: id ?? this.id,
      userId: userId ?? this.userId,
      leaveReasonId: leaveReasonId ?? this.leaveReasonId,
      type: type ?? this.type,
      startDate: startDate ?? this.startDate,
      endDate: endDate ?? this.endDate,
      reason: reason ?? this.reason,
      status: status ?? this.status,
      comment: comment ?? this.comment,
      rejectReason: rejectReason ?? this.rejectReason,
      createdAt: createdAt ?? this.createdAt,
    );
  }
}
