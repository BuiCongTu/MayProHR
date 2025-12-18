import 'dart:convert';

import 'package:flutterapp/configs/api_config.dart';
import 'package:http/http.dart' as http;

import '../models/payroll_model.dart';

class PayrollService {
  final String baseUrl = ApiConfig.baseUrl;
  final String history = ApiConfig.payHisEndpoint;

  Future<List<PayrollModel>> getPayrollHistory({
    required int userId,
    required String token,
  }) async {
    try {
      final url = Uri.parse('$history/$userId/history');

      final response = await http.get(
        url,
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
      );

      if (response.statusCode == 200) {
        List<dynamic> jsonData = jsonDecode(response.body);

        return jsonData
            .map((item) => PayrollModel.fromJson(item as Map<String, dynamic>))
            .toList();
      } else {
        throw Exception(
            'Error HTTP: ${response.statusCode} - ${response.body}');
      }
    } catch (e) {
      throw Exception('Connection error: $e');
    }
  }

  Future<PayrollModel> getPayrollByMonth({
    required int userId,
    required int year,
    required int month,
    required String token,
  }) async {
    try {
      final url = Uri.parse(
        '$history/$userId?year=$year&month=$month',
      );

      final response = await http.get(
        url,
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
      );

      if (response.statusCode == 200) {
        final dynamic decoded = jsonDecode(response.body);
        if (decoded is Map<String, dynamic>) {
          // Inject year/month into the JSON so UI can format properly
          decoded['year'] = year;
          decoded['month'] = month;
          return PayrollModel.fromJson(decoded);
        } else {
          throw Exception('Unexpected response format');
        }
      } else {
        throw Exception(
            'HTTP Error: ${response.statusCode} - ${response.body}');
      }
    } catch (e) {
      throw Exception('Connection error: $e');
    }
  }

  Future<List<int>> getAvailableYears({
    required int userId,
    required String token,
  }) async {
    try {
      final url = Uri.parse(
        '$history/$userId/available-years',
      );

      final response = await http.get(
        url,
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
      );

      if (response.statusCode == 200) {
        Map<String, dynamic> jsonData = jsonDecode(response.body);

        List<dynamic> years = jsonData['years'] ?? [];
        return years.map((y) => y as int).toList();
      } else {
        throw Exception(
            'HTTP Error: ${response.statusCode} - ${response.body}');
      }
    } catch (e) {
      throw Exception('Connection Error: $e');
    }
  }

  Future<List<int>> getAvailableMonths({
    required int userId,
    required int year,
    required String token,
  }) async {
    try {
      final url = Uri.parse(
        '$history/$userId/available-months?year=$year',
      );

      final response = await http.get(
        url,
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
      );

      if (response.statusCode == 200) {
        // Decode JSON response
        Map<String, dynamic> jsonData = jsonDecode(response.body);

        // Lấy danh sách months
        List<dynamic> months = jsonData['months'] ?? [];
        return months.map((m) => m as int).toList();
      } else {
        throw Exception(
            'HTTP error: ${response.statusCode} - ${response.body}');
      }
    } catch (e) {
      throw Exception('Connection error: $e');
    }
  }

  Future<List<PayrollModel>> getPayrollHistoryByYear({
    required int userId,
    required int year,
    required String token,
  }) async {
    try {
      final url = Uri.parse(
        '$history/$userId/year?year=$year',
      );

      final response = await http.get(
        url,
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
      );

      if (response.statusCode == 200) {
        List<dynamic> jsonData = jsonDecode(response.body);

        return jsonData
            .map((item) => PayrollModel.fromJson(item as Map<String, dynamic>))
            .toList();
      } else {
        throw Exception(
            'HTTP error: ${response.statusCode} - ${response.body}');
      }
    } catch (e) {
      throw Exception('Connection error: $e');
    }
  }
}
