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

  final double? insurance;
  final double? totalDeduction;
  final double? grossIncomeForTax;
  final double? personalIncomeTax;
  final double? incomeAfterDeductions;

  final double? standardWorkingDays;
  final double? actualWorkingDays;
  final double? paidLeaveDays;
  final double? unpaidLeaveDays;
  final int? lateCount;
  final double? latePenalty;

  final double? ot1Hours;
  final double? ot2Hours;

  final int? productCount;
  final double? unitPrice;

  final double? timeSalary;

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

    this.insurance,
    this.totalDeduction,
    this.grossIncomeForTax,
    this.personalIncomeTax,
    this.incomeAfterDeductions,

    this.standardWorkingDays,
    this.actualWorkingDays,
    this.paidLeaveDays,
    this.unpaidLeaveDays,
    this.lateCount,
    this.latePenalty,

    this.ot1Hours,
    this.ot2Hours,

    this.productCount,
    this.unitPrice,

    this.timeSalary,

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

    int? parseInt(dynamic v) {
      if (v == null) return null;
      if (v is int) return v;
      if (v is num) return v.toInt();
      return int.tryParse(v.toString());
    }

    return PayrollModel(
      id: parseInt(json['id']),
      month: parseInt(json['month']),
      year: parseInt(json['year']),
      date: parseDate(json['date'] ?? json['date_time'] ?? json['dateCreated']),
      createdAt: parseDate(json['createdAt'] ?? json['created_at']),

      baseSalary: parseDouble(json['baseSalary'] ?? json['base_salary']),
      productBonus: parseDouble(json['productBonus'] ?? json['product_bonus']),
      overtimePay: parseDouble(json['overtimePay'] ?? json['overtime_pay']),
      allowance: parseDouble(json['allowance']),
      deduction: parseDouble(json['deduction']),
      totalPay: parseDouble(json['totalPay'] ?? json['total_pay']),

      insurance: parseDouble(json['insurance']),
      totalDeduction: parseDouble(
          json['totalDeduction'] ?? json['total_deduction']),
      grossIncomeForTax: parseDouble(
          json['grossIncomeForTax'] ?? json['gross_income_for_tax']),
      personalIncomeTax: parseDouble(
          json['personalIncomeTax'] ?? json['personal_income_tax']),
      incomeAfterDeductions: parseDouble(
          json['incomeAfterDeductions'] ?? json['income_after_deductions']),

      standardWorkingDays: parseDouble(
          json['standardWorkingDays'] ?? json['standard_working_days']),
      actualWorkingDays: parseDouble(
          json['actualWorkingDays'] ?? json['actual_working_days']),
      paidLeaveDays: parseDouble(
          json['paidLeaveDays'] ?? json['paid_leave_days']),
      unpaidLeaveDays: parseDouble(
          json['unpaidLeaveDays'] ?? json['unpaid_leave_days']),
      lateCount: parseInt(json['lateCount'] ?? json['late_count']),
      latePenalty: parseDouble(json['latePenalty'] ?? json['late_penalty']),

      ot1Hours: parseDouble(json['ot1Hours'] ?? json['ot1_hours']),
      ot2Hours: parseDouble(json['ot2Hours'] ?? json['ot2_hours']),

      productCount: parseInt(json['productCount'] ?? json['product_count']),
      unitPrice: parseDouble(json['unitPrice'] ?? json['unit_price']),

      timeSalary: parseDouble(json['timeSalary'] ?? json['time_salary']),

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

      'insurance': insurance,
      'totalDeduction': totalDeduction,
      'grossIncomeForTax': grossIncomeForTax,
      'personalIncomeTax': personalIncomeTax,
      'incomeAfterDeductions': incomeAfterDeductions,

      'standardWorkingDays': standardWorkingDays,
      'actualWorkingDays': actualWorkingDays,
      'paidLeaveDays': paidLeaveDays,
      'unpaidLeaveDays': unpaidLeaveDays,
      'lateCount': lateCount,
      'latePenalty': latePenalty,

      'ot1Hours': ot1Hours,
      'ot2Hours': ot2Hours,

      'productCount': productCount,
      'unitPrice': unitPrice,
      'timeSalary': timeSalary,

      'totalIncome': _totalIncome,
      'note': note,
    };
  }

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

  double get totalIncome =>
      _totalIncome ??
          (baseSalary ?? 0.0) +
              (productBonus ?? 0.0) +
              (overtimePay ?? 0.0) +
              (allowance ?? 0.0);

  String formatCurrency(double amount) {
    final f = NumberFormat.currency(
        locale: 'vi_VN', symbol: '₫', decimalDigits: 0);
    return f.format(amount);
  }
}
