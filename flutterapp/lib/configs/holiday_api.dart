import 'dart:convert';
import 'package:http/http.dart' as http;

import '../configs/api_config.dart';
import '../models/holiday.dart';

class HolidayApi {
  HolidayApi({required this.getToken});

  final Future<String?> Function() getToken;

  String get _baseUrl => ApiConfig.baseUrl;

  Map<String, String> _headers(String? token) {
    return {
      'Authorization': token != null ? 'Bearer $token' : '',
      'Content-Type': 'application/json',
    };
  }

  List<Holiday> _parseList(String body) {
    final decoded = jsonDecode(body);

    if (decoded is Map<String, dynamic>) {
      final data = decoded['data'];
      if (data is List) {
        return data
            .whereType<Map<String, dynamic>>()
            .map(Holiday.fromJson)
            .toList();
      }
      return <Holiday>[];
    }

    if (decoded is List) {
      return decoded
          .whereType<Map<String, dynamic>>()
          .map(Holiday.fromJson)
          .toList();
    }

    return <Holiday>[];
  }

  Future<List<Holiday>> getByMonth({
    required int year,
    required int month,
  }) async {
    final token = await getToken();

    final uri = Uri.parse('$_baseUrl/api/holiday').replace(
      queryParameters: {
        'year': '$year',
        'month': '$month',
      },
    );

    final res = await http.get(uri, headers: _headers(token));

    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw Exception('Load holidays failed: ${res.body}');
    }

    return _parseList(res.body);
  }

  Future<List<Holiday>> getByYear({
    required int year,
  }) async {
    final token = await getToken();

    final uri = Uri.parse('$_baseUrl/api/holiday').replace(
      queryParameters: {'year': '$year'},
    );

    final res = await http.get(uri, headers: _headers(token));

    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw Exception('Load holidays year failed: ${res.body}');
    }

    return _parseList(res.body);
  }
}