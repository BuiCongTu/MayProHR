// dart
import 'package:intl/intl.dart';

class PayrollModel {
  final int? id;
  final int? month;
  final int? year;
  final DateTime? date;
  final DateTime? createdAt;
  final double? baseSalary;
  final double? productBonus;
  final double? overtimePay;
  final double? allowance;
  final double? deduction;
  final double? totalPay;
  final double? _totalIncome;
  final String? note;

  PayrollModel({
    this.id,
    this.month,
    this.year,
    this.date,
    this.createdAt,
    this.baseSalary,
    this.productBonus,
    this.overtimePay,
    this.allowance,
    this.deduction,
    this.totalPay,
    double? totalIncome,
    this.note,
  }) : _totalIncome = totalIncome;

  factory PayrollModel.fromJson(Map<String, dynamic> json) {
    DateTime? parseDate(dynamic v) {
      if (v == null) return null;
      try {
        return DateTime.parse(v.toString());
      } catch (_) {
        return null;
      }
    }

    double? parseDouble(dynamic v) {
      if (v == null) return null;
      if (v is num) return v.toDouble();
      return double.tryParse(v.toString());
    }

    return PayrollModel(
      id: json['id'] is int
          ? json['id'] as int
          : (json['id'] is String ? int.tryParse(json['id']) : null),
      month: json['month'] is int
          ? json['month'] as int
          : (json['month'] is String ? int.tryParse(json['month']) : null),
      year: json['year'] is int
          ? json['year'] as int
          : (json['year'] is String ? int.tryParse(json['year']) : null),
      date: parseDate(json['date'] ?? json['date_time'] ?? json['dateCreated']),
      createdAt: parseDate(json['createdAt'] ?? json['created_at']),
      baseSalary: parseDouble(json['baseSalary'] ?? json['base_salary']),
      productBonus: parseDouble(json['productBonus'] ?? json['product_bonus']),
      overtimePay: parseDouble(json['overtimePay'] ?? json['overtime_pay']),
      allowance: parseDouble(json['allowance']),
      deduction: parseDouble(json['deduction']),
      totalPay: parseDouble(json['totalPay'] ?? json['total_pay']),
      totalIncome: parseDouble(json['totalIncome'] ?? json['total_income']),
      note: json['note']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'month': month,
      'year': year,
      'date': date?.toIso8601String(),
      'createdAt': createdAt?.toIso8601String(),
      'baseSalary': baseSalary,
      'productBonus': productBonus,
      'overtimePay': overtimePay,
      'allowance': allowance,
      'deduction': deduction,
      'totalPay': totalPay,
      'totalIncome': _totalIncome,
      'note': note,
    };
  }

  /// Returns a formatted "MM/YYYY" string.
  String getMonthYear() {
    if (month != null && year != null) {
      final mm = month!.toString().padLeft(2, '0');
      return '$mm/$year';
    }
    if (date != null) {
      final formatter = DateFormat('MM/yyyy');
      return formatter.format(date!);
    }
    return '';
  }

  /// Computed total income: prefer provided server value, otherwise sum positive components.
  double get totalIncome =>
      _totalIncome ??
      (baseSalary ?? 0.0) +
          (productBonus ?? 0.0) +
          (overtimePay ?? 0.0) +
          (allowance ?? 0.0);

  /// Formats a numeric amount as currency (Vietnamese locale used here).
  String formatCurrency(double amount) {
    final f =
        NumberFormat.currency(locale: 'vi_VN', symbol: '₫', decimalDigits: 0);
    return f.format(amount);
  }
}
