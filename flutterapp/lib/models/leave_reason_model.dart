class LeaveReasonModel {
  final int id;
  final String reason;
  final String? description;

  LeaveReasonModel({
    required this.id,
    required this.reason,
    this.description,
  });

  factory LeaveReasonModel.fromJson(Map<String, dynamic> json) {
    int? asInt(dynamic v) {
      if (v is int) return v;
      if (v is String) return int.tryParse(v);
      return null;
    }

    return LeaveReasonModel(
      id: asInt(json['id']) ?? 0,
      reason: (json['reason'] ?? '').toString(),
      description: json['description']?.toString(),
    );
  }
}
