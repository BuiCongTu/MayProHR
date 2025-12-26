import 'dart:convert';
import 'package:http/http.dart' as http;

import '../configs/api_config.dart';
import '../models/leave_balance_model.dart';
import '../models/leave_reason_model.dart';
import '../models/leave_request_model.dart';
import 'storage_service.dart';

class LeaveService {
  final StorageService _storage = StorageService();

  Future<Map<String, String>> _headers() async {
    final token = await _storage.getToken();
    return {
      'Content-Type': 'application/json',
      if (token != null && token.isNotEmpty) 'Authorization': 'Bearer $token',
    };
  }

  dynamic _decodeJsonSafe(String body) {
    if (body.trim().isEmpty) return null;
    try {
      return jsonDecode(body);
    } catch (_) {
      return null;
    }
  }

  dynamic _extractData(String responseBody) {
    final decoded = _decodeJsonSafe(responseBody);

    if (decoded is Map) {
      final map = Map<String, dynamic>.from(decoded);
      if (map.containsKey('data')) return map['data'];
      return map;
    }
    return decoded;
  }

  Exception _httpError(http.Response res, {required String hint}) {
    String msg = hint;

    final decoded = _decodeJsonSafe(res.body);
    if (decoded is Map) {
      final m = Map<String, dynamic>.from(decoded);
      final backendMsg = (m['message'] ?? m['error'])?.toString();
      if (backendMsg != null && backendMsg.trim().isNotEmpty) {
        msg = '$hint: $backendMsg';
      }
    } else if (res.body.trim().isNotEmpty) {
      msg = '$hint: ${res.body}';
    }

    return Exception('HTTP ${res.statusCode} - $msg');
  }

  // -------------------------
  // LeaveReason
  // -------------------------
  Future<List<LeaveReasonModel>> getLeaveReasons() async {
    final uri = Uri.parse('${ApiConfig.baseUrl}/api/leave-reason');

    final res = await http.get(uri, headers: await _headers());
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw _httpError(res, hint: 'Cannot fetch leave reasons');
    }

    final data = _extractData(res.body);
    if (data is! List) return const [];

    return data
        .where((e) => e is Map)
        .map((e) => LeaveReasonModel.fromJson(Map<String, dynamic>.from(e as Map)))
        .toList();
  }

  // -------------------------
  // LeaveBalance (new)
  // -------------------------
  Future<LeaveBalanceModel> getLeaveBalance({
    required int userId,
    DateTime? asOf,
  }) async {
    final qp = <String, String>{
      'userId': userId.toString(),
    };
    if (asOf != null) {
      qp['asOf'] = asOf.toIso8601String().substring(0, 10);
    }

    final uri = Uri.parse('${ApiConfig.baseUrl}/api/leave-request/leave-balance')
        .replace(queryParameters: qp);

    final res = await http.get(uri, headers: await _headers());
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw _httpError(res, hint: 'Cannot fetch leave balance');
    }

    final data = _extractData(res.body);
    if (data is Map) {
      return LeaveBalanceModel.fromJson(Map<String, dynamic>.from(data));
    }

    throw Exception('Invalid response when fetching leave balance');
  }

  // -------------------------
  // LeaveRequest - Employee
  // -------------------------
  Future<List<LeaveRequestModel>> getMyLeaveRequests({required int userId}) async {
    final uri = Uri.parse('${ApiConfig.baseUrl}/api/leave-request')
        .replace(queryParameters: {'userId': userId.toString()});

    final res = await http.get(uri, headers: await _headers());
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw _httpError(res, hint: 'Cannot fetch leave requests');
    }

    final data = _extractData(res.body);
    if (data is! List) return const [];

    return data
        .where((e) => e is Map)
        .map((e) => LeaveRequestModel.fromJson(Map<String, dynamic>.from(e as Map)))
        .toList();
  }

  Future<LeaveRequestModel> createLeaveRequest({
    required int userId,
    required int leaveReasonId,
    required String type,
    required DateTime startDate,
    required DateTime endDate,
    required String reason,
  }) async {
    if (startDate.isAfter(endDate)) {
      throw Exception('Start date must be before or equal to end date');
    }
    if (type.trim().isEmpty) {
      throw Exception('Leave type is required');
    }

    final req = LeaveRequestModel(
      userId: userId,
      leaveReasonId: leaveReasonId,
      type: type,
      startDate: startDate,
      endDate: endDate,
      reason: reason.trim(),
    );

    final uri = Uri.parse('${ApiConfig.baseUrl}/api/leave-request');
    final res = await http.post(
      uri,
      headers: await _headers(),
      body: jsonEncode(req.toCreatePayload()),
    );

    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw _httpError(res, hint: 'Create leave request failed');
    }

    final data = _extractData(res.body);
    if (data is Map) {
      return LeaveRequestModel.fromJson(Map<String, dynamic>.from(data));
    }

    return req;
  }


  Future<LeaveRequestModel> updateEmployeeDraft({
    required int requestId,
    required LeaveRequestModel current,
    required int leaveReasonId,
    required String type,
    required DateTime startDate,
    required DateTime endDate,
    required String reason,
  }) async {
    final st = (current.status ?? 'pending').toLowerCase();
    if (st != 'pending') {
      throw Exception('Only pending requests can be updated');
    }
    if (startDate.isAfter(endDate)) {
      throw Exception('Start date must be before or equal to end date');
    }

    final payload = <String, dynamic>{
      'startDate': startDate.toIso8601String().substring(0, 10),
      'endDate': endDate.toIso8601String().substring(0, 10),
      'reason': reason.trim(),
      'type': type,
      'leaveReason': {'id': leaveReasonId},
    };

    final uri = Uri.parse('${ApiConfig.baseUrl}/api/leave-request/$requestId');
    final res = await http.put(
      uri,
      headers: await _headers(),
      body: jsonEncode(payload),
    );

    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw _httpError(res, hint: 'Update leave request failed');
    }

    final data = _extractData(res.body);
    if (data is Map) {
      return LeaveRequestModel.fromJson(Map<String, dynamic>.from(data));
    }
    throw Exception('Invalid response when updating leave request');
  }

  Future<void> deleteLeaveRequest(int id) async {
    final uri = Uri.parse('${ApiConfig.baseUrl}/api/leave-request/$id');

    final res = await http.delete(uri, headers: await _headers());
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw _httpError(res, hint: 'Delete leave request failed');
    }
  }
}