import 'package:flutter/material.dart';
import '../../models/payroll_model.dart';

enum _MoneyTone { normal, income, deduction, net }

class _RowItem {
  final String label;
  final String value;

  final _MoneyTone tone;

  final Color? valueColor;
  final FontWeight? valueWeight;

  final bool highlightRow;

  const _RowItem(
      this.label,
      this.value, {
        this.tone = _MoneyTone.normal,
        this.valueColor,
        this.valueWeight,
        this.highlightRow = false,
      });
}

class PayrollDetailScreen extends StatelessWidget {
  final PayrollModel? payroll;

  const PayrollDetailScreen({
    super.key,
    this.payroll,
  });

  // ---- Palette (readable for payroll) ----
  static const Color _txtPrimary = Color(0xFF111827);
  static const Color _txtSecondary = Color(0xFF475569);
  static const Color _moneyIncome = Color(0xFF1D4ED8);
  static const Color _moneyDeduction = Color(0xFFDC2626);
  static const Color _moneyNet = Color(0xFF065F46);

  TextStyle _titleStyle() => const TextStyle(
    fontSize: 15,
    fontWeight: FontWeight.bold,
    color: _txtPrimary,
  );

  TextStyle _labelStyle() => const TextStyle(
    fontSize: 13,
    color: _txtSecondary,
    fontWeight: FontWeight.w600,
  );

  TextStyle _valueStyle({Color? color, FontWeight fw = FontWeight.w600}) =>
      TextStyle(
        fontSize: 13,
        fontWeight: fw,
        color: color ?? _txtPrimary,
      );

  @override
  Widget build(BuildContext context) {
    if (payroll == null) {
      return Scaffold(
        appBar: AppBar(
          title: const Text('Payroll Detail'),
          centerTitle: true,
          elevation: 2,
        ),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.info_outline, size: 64, color: Colors.grey),
              const SizedBox(height: 16),
              const Text(
                'No payroll information available',
                style: TextStyle(fontSize: 18, color: Colors.grey),
              ),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Go Back'),
              ),
            ],
          ),
        ),
      );
    }

    String moneyOrDash(double? v) => v == null ? '-' : payroll!.formatCurrency(v);
    String numOrDash(num? v) => v == null ? '-' : v.toString();
    String minusMoneyOrDash(double? v) => v == null ? '-' : '-${payroll!.formatCurrency(v)}';

    final totalDeductionI = payroll!.taxDeductionTotal ?? payroll!.totalDeduction ?? payroll!.deduction;
    final incomeForTaxJ = payroll!.taxableIncome;

    final allowanceTotal = payroll!.allowance;
    final totalDeductionValue =
        payroll!.totalDeduction ?? payroll!.taxDeductionTotal ?? payroll!.deduction;

    final taxableIncomeD = payroll!.taxableIncome ?? payroll!.grossIncomeForTax;
    final incomeForTaxCalcJ = payroll!.incomeAfterDeductions ?? payroll!.taxableIncome;

    final inputRows = <_RowItem>[
      _RowItem('Base Salary', moneyOrDash(payroll!.baseSalary), tone: _MoneyTone.income),
      _RowItem('Wage Coefficient', numOrDash(payroll!.wageCoefficient)),
      _RowItem('Standard Working Days', numOrDash(payroll!.standardWorkingDays)),
      _RowItem('Actual Working Days', numOrDash(payroll!.actualWorkingDays)),
      _RowItem('Paid Leave Days', numOrDash(payroll!.paidLeaveDays)),
      _RowItem('Unpaid Leave Days', numOrDash(payroll!.unpaidLeaveDays)),
      _RowItem('Late Count', numOrDash(payroll!.lateCount)),
      _RowItem('OT1 Hours (Weekday)', numOrDash(payroll!.ot1Hours)),
      _RowItem('OT2 Hours (Holiday/Sun)', numOrDash(payroll!.ot2Hours)),
      _RowItem('Product Count', numOrDash(payroll!.productCount)),
      _RowItem('Unit Price', moneyOrDash(payroll!.unitPrice)),
      _RowItem('Allowance (total)', moneyOrDash(allowanceTotal), tone: _MoneyTone.income),
    ];

    final resultRows = <_RowItem>[
      _RowItem('Time Salary (A)', moneyOrDash(payroll!.timeSalary ?? payroll!.baseSalary), tone: _MoneyTone.income),
      _RowItem('Product Bonus (B)', moneyOrDash(payroll!.productBonus), tone: _MoneyTone.income),
      _RowItem('Overtime Pay (C)', moneyOrDash(payroll!.overtimePay), tone: _MoneyTone.income),

      _RowItem('Taxable income (D = A + B + C)', moneyOrDash(payroll!.grossIncomeForTax), tone: _MoneyTone.normal, valueWeight: FontWeight.w800),

      _RowItem('Late Penalty (E)', minusMoneyOrDash(payroll!.latePenalty), tone: _MoneyTone.deduction),
      _RowItem(
        'Insurance(BHXH 8%, BHYT 1.5%, BHTN 1%) (F)',
        minusMoneyOrDash(payroll!.insurance),
        tone: _MoneyTone.deduction,
      ),

      _RowItem('Personal Deduction(G)', minusMoneyOrDash(payroll!.personalDeduction), tone: _MoneyTone.deduction),
      _RowItem('Dependent Deduction (H)', minusMoneyOrDash(payroll!.dependentDeduction), tone: _MoneyTone.deduction),

      _RowItem(
        'Total Deduction (I = E + F + G + H)',
        totalDeductionI == null ? '-' : '-${payroll!.formatCurrency(totalDeductionI)}',
        tone: _MoneyTone.deduction,
        valueWeight: FontWeight.w800,
        highlightRow: true,
      ),

      _RowItem(
        'Income for tax calculation (J = A - I)',
        moneyOrDash(incomeForTaxJ),
        tone: _MoneyTone.normal,
        valueWeight: FontWeight.w800,
      ),

      _RowItem(
        'Personal Income Tax/ TNCN (K = J * tax_rate)',
        minusMoneyOrDash(payroll!.personalIncomeTax),
        tone: _MoneyTone.deduction,
      ),
    ];

    return Scaffold(
      appBar: AppBar(
        title: Text('Payroll ${payroll!.getMonthYear()}'),
        centerTitle: true,
        elevation: 2,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            _buildSectionTable(
              title: '1. Display for Transparency',
              rows: inputRows,
            ),
            const SizedBox(height: 16),
            _buildSectionTable(
              title: '2. Results',
              rows: resultRows,
            ),
            const SizedBox(height: 16),
            _buildNetPayBox(payroll!),
            const SizedBox(height: 16),
            if (payroll!.note != null && payroll!.note!.isNotEmpty)
              _buildNoteSection(payroll!.note!),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Go Back'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionTable({
    required String title,
    required List<_RowItem> rows,
  }) {
    Color? resolveColor(_RowItem r) {
      if (r.valueColor != null) return r.valueColor;
      switch (r.tone) {
        case _MoneyTone.income:
          return _moneyIncome;
        case _MoneyTone.deduction:
          return _moneyDeduction;
        case _MoneyTone.net:
          return _moneyNet;
        case _MoneyTone.normal:
        default:
          return null;
      }
    }

    FontWeight resolveWeight(_RowItem r) {
      if (r.valueWeight != null) return r.valueWeight!;
      switch (r.tone) {
        case _MoneyTone.deduction:
        case _MoneyTone.net:
          return FontWeight.w700;
        default:
          return FontWeight.w600;
      }
    }

    return Card(
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: _titleStyle()),
            const Divider(height: 16, thickness: 1),
            ...rows.map(
                  (r) => _buildKeyValueRow(
                r.label,
                r.value,
                valueColor: resolveColor(r),
                valueWeight: resolveWeight(r),
                highlightRow: r.highlightRow,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildKeyValueRow(
      String label,
      String value, {
        Color? valueColor,
        FontWeight valueWeight = FontWeight.w600,
        bool highlightRow = false,
      }) {
    final rowBg = highlightRow ? const Color(0xFFFFF1F2) : null; // rose-50

    return Container(
      padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 8),
      margin: const EdgeInsets.symmetric(vertical: 3),
      decoration: BoxDecoration(
        color: rowBg,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Flexible(child: Text(label, style: _labelStyle())),
          const SizedBox(width: 12),
          Text(
            value,
            style: _valueStyle(color: valueColor, fw: valueWeight),
          ),
        ],
      ),
    );
  }

  Widget _buildNetPayBox(PayrollModel payroll) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFECFDF5), // green-50
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: _moneyNet),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          const Text(
            'Total Pay (NET = J - K)',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: _txtPrimary),
          ),
          Text(
            payroll.formatCurrency(payroll.totalPay ?? 0.0),
            style: const TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 16,
              color: _moneyNet,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildNoteSection(String note) {
    return Card(
      color: Colors.amber[50],
      elevation: 1,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Icon(Icons.info_outline, color: Colors.orange, size: 20),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                note,
                style: const TextStyle(fontSize: 13, color: _txtSecondary, height: 1.5),
              ),
            ),
          ],
        ),
      ),
    );
  }
}