import 'dart:convert';
import 'package:http/http.dart' as http;

import '../configs/api_config.dart';
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
      // Nếu backend trả text/plain hoặc HTML lỗi
      return null;
    }
  }

  dynamic _extractData(String responseBody) {
    final decoded = _decodeJsonSafe(responseBody);

    // chuẩn backend: { success: true, data: ... }
    if (decoded is Map) {
      final map = Map<String, dynamic>.from(decoded);
      if (map.containsKey('data')) return map['data'];
      return map;
    }

    return decoded;
  }

  Exception _httpError(http.Response res, {required String hint}) {
    final base = 'HTTP ${res.statusCode}';
    final body = res.body.isEmpty ? '' : ' - ${res.body}';
    return Exception('$hint: $base$body');
  }

  // -------------------------
  // LeaveReason
  // -------------------------
  Future<List<LeaveReasonModel>> getLeaveReasons() async {
    final uri = Uri.parse('${ApiConfig.baseUrl}/api/leave-reason');

    final res = await http.get(uri, headers: await _headers());
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw _httpError(res, hint: 'Không lấy được danh sách loại nghỉ');
    }

    final data = _extractData(res.body);
    if (data is! List) return const [];

    return data
        .where((e) => e is Map)
        .map((e) => LeaveReasonModel.fromJson(Map<String, dynamic>.from(e as Map)))
        .toList();
  }

  // -------------------------
  // LeaveRequest - Employee
  // -------------------------
  Future<List<LeaveRequestModel>> getMyLeaveRequests({required int userId}) async {
    final uri = Uri.parse('${ApiConfig.baseUrl}/api/leave-request')
        .replace(queryParameters: {'userId': userId.toString()});

    final res = await http.get(uri, headers: await _headers());
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw _httpError(res, hint: 'Không lấy được danh sách đơn nghỉ');
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
      throw Exception('Ngày bắt đầu phải <= ngày kết thúc');
    }
    if (type.trim().isEmpty) {
      throw Exception('Leave type không được trống');
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
      throw _httpError(res, hint: 'Tạo đơn nghỉ thất bại');
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
      throw Exception('Chỉ được sửa đơn khi trạng thái là PENDING');
    }
    if (startDate.isAfter(endDate)) {
      throw Exception('Ngày bắt đầu phải <= ngày kết thúc');
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
      throw _httpError(res, hint: 'Cập nhật đơn nghỉ thất bại');
    }

    final data = _extractData(res.body);
    if (data is Map) {
      return LeaveRequestModel.fromJson(Map<String, dynamic>.from(data));
    }
    throw Exception('Response không hợp lệ khi cập nhật đơn nghỉ');
  }

  Future<void> deleteLeaveRequest(int id) async {
    final uri = Uri.parse('${ApiConfig.baseUrl}/api/leave-request/$id');

    final res = await http.delete(uri, headers: await _headers());
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw _httpError(res, hint: 'Xoá đơn nghỉ thất bại');
    }
  }
}