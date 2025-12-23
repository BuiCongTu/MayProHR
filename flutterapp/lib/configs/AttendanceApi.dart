import 'dart:convert';
import 'package:http/http.dart' as http;

import '../configs/api_config.dart';
import '../models/AttendanceRecord.dart';

class AttendanceApi {
  AttendanceApi({required this.getToken});

  final Future<String?> Function() getToken;

  String get _baseUrl => ApiConfig.baseUrl;

  Map<String, String> _headers(String? token) {
    return {
      'Authorization': token != null ? 'Bearer $token' : '',
      'Content-Type': 'application/json',
    };
  }

  List<AttendanceRecord> _parseList(String body) {
    final decoded = jsonDecode(body);

    if (decoded is Map<String, dynamic>) {
      final data = decoded['data'];
      if (data is List) {
        return data
            .whereType<Map<String, dynamic>>()
            .map(AttendanceRecord.fromJson)
            .toList();
      }
      return <AttendanceRecord>[];
    }

    if (decoded is List) {
      return decoded
          .whereType<Map<String, dynamic>>()
          .map(AttendanceRecord.fromJson)
          .toList();
    }

    return <AttendanceRecord>[];
  }

  Future<List<AttendanceRecord>> getByMonth({
    required String month, // YYYY-MM
    required int userId,
  }) async {
    final token = await getToken();
    final uri = Uri.parse('$_baseUrl/api/attendance/by-month')
        .replace(queryParameters: {'month': month, 'userId': '$userId'});

    final res = await http.get(uri, headers: _headers(token));

    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw Exception('Load attendance month failed: ${res.body}');
    }

    return _parseList(res.body);
  }

  Future<List<AttendanceRecord>> getByYear({
    required int year,
    required int userId,
  }) async {
    final token = await getToken();
    final startDate = '$year-01-01';
    final endDate = '$year-12-31';

    final uri = Uri.parse('$_baseUrl/api/attendance/by-range').replace(
      queryParameters: {
        'startDate': startDate,
        'endDate': endDate,
        'userId': '$userId',
      },
    );

    final res = await http.get(uri, headers: _headers(token));

    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw Exception('Load attendance year failed: ${res.body}');
    }

    return _parseList(res.body);
  }

  Future<List<AttendanceRecord>> getByDate({
    required String date, // YYYY-MM-DD
    required int userId,
  }) async {
    final token = await getToken();
    final uri = Uri.parse('$_baseUrl/api/attendance/by-date')
        .replace(queryParameters: {'date': date, 'userId': '$userId'});

    final res = await http.get(uri, headers: _headers(token));

    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw Exception('Load attendance date failed: ${res.body}');
    }

    return _parseList(res.body);
  }
}