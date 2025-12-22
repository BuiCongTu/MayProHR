import 'package:flutter/material.dart';
import '../../models/payroll_model.dart';

class PayrollDetailScreen extends StatelessWidget {
  final PayrollModel? payroll;

  const PayrollDetailScreen({
    super.key,
    this.payroll,
  });

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
              title: 'A) Inputs / Dữ liệu đầu vào (Read-only)',
              rows: [
                ('Base Salary', moneyOrDash(payroll!.baseSalary)),
                ('Standard Working Days', numOrDash(payroll!.standardWorkingDays)),
                ('Actual Working Days', numOrDash(payroll!.actualWorkingDays)),
                ('Paid Leave Days', numOrDash(payroll!.paidLeaveDays)),
                ('Unpaid Leave Days', numOrDash(payroll!.unpaidLeaveDays)),
                ('Late Count', numOrDash(payroll!.lateCount)),
                ('OT1 Hours', numOrDash(payroll!.ot1Hours)),
                ('OT2 Hours', numOrDash(payroll!.ot2Hours)),
                ('Product Count', numOrDash(payroll!.productCount)),
                ('Unit Price', moneyOrDash(payroll!.unitPrice)),
                ('Allowance', moneyOrDash(payroll!.allowance)),
              ],
            ),
            const SizedBox(height: 16),

            _buildSectionTable(
              title: 'B) Kết quả tính toán (Read-only)',
              rows: [
                ('Time Salary', moneyOrDash(payroll!.timeSalary)),
                ('Product Bonus', moneyOrDash(payroll!.productBonus)),
                ('Overtime Pay', moneyOrDash(payroll!.overtimePay)),
                ('Late Penalty', payroll!.latePenalty == null ? '-' : '-${payroll!.formatCurrency(payroll!.latePenalty!)}'),
                ('Insurance', payroll!.insurance == null ? '-' : '-${payroll!.formatCurrency(payroll!.insurance!)}'),
                ('Total Deduction', payroll!.totalDeduction != null
                    ? '-${payroll!.formatCurrency(payroll!.totalDeduction!)}'
                    : (payroll!.deduction != null ? '-${payroll!.formatCurrency(payroll!.deduction!)}' : '-')),
                ('Gross Income For Tax', moneyOrDash(payroll!.grossIncomeForTax)),
                ('Income After Deductions', moneyOrDash(payroll!.incomeAfterDeductions)),
                ('Personal Income Tax', payroll!.personalIncomeTax == null ? '-' : '-${payroll!.formatCurrency(payroll!.personalIncomeTax!)}'),
              ],
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
    required List<(String, String)> rows,
  }) {
    return Card(
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
            const Divider(height: 16, thickness: 1),
            ...rows.map((r) => _buildKeyValueRow(r.$1, r.$2)),
          ],
        ),
      ),
    );
  }

  Widget _buildKeyValueRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Flexible(
            child: Text(
              label,
              style: const TextStyle(fontSize: 13, color: Colors.grey),
            ),
          ),
          const SizedBox(width: 12),
          Text(
            value,
            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
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
        color: Colors.green[50],
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: Colors.green),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          const Text(
            'Total Pay (NET)',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
          ),
          Text(
            payroll.formatCurrency(payroll.totalPay ?? 0.0),
            style: TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 16,
              color: Colors.green[700],
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
                style: const TextStyle(fontSize: 13, color: Colors.grey, height: 1.5),
              ),
            ),
          ],
        ),
      ),
    );
  }
}