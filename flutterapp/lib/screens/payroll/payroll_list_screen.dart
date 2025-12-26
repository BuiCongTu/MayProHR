import 'package:flutter/material.dart';
import '../../models/payroll_model.dart';
import '../../services/payroll_service.dart';
import 'payroll_detail_screen.dart';

class PayrollListScreen extends StatefulWidget {
  final int userId;
  final String token;

  const PayrollListScreen({
    super.key,
    required this.userId,
    required this.token,
  });

  @override
  State<PayrollListScreen> createState() => _PayrollListScreenState();
}

class _PayrollListScreenState extends State<PayrollListScreen> {
  final PayrollService _payrollService = PayrollService();

  List<PayrollModel> _payrollList = [];
  bool _isLoading = true;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _loadPayrollHistory();
  }

  Future<void> _loadPayrollHistory() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final payrolls = await _payrollService.getPayrollHistory(
        userId: widget.userId,
        token: widget.token,
      );

      setState(() {
        _payrollList = payrolls;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _errorMessage = e.toString();
        _isLoading = false;
      });
    }
  }

  Future<void> _refreshData() async {
    await _loadPayrollHistory();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Payroll Payments'),
        centerTitle: true,
        elevation: 2,
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return const Center(
        child: CircularProgressIndicator(),
      );
    }

    if (_errorMessage != null) {
      return _buildErrorState();
    }

    if (_payrollList.isEmpty) {
      return _buildEmptyState();
    }

    return _buildPayrollList();
  }

  Widget _buildErrorState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(
            Icons.error_outline,
            color: Colors.red,
            size: 64,
          ),
          const SizedBox(height: 16),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Text(
              'Lỗi: $_errorMessage',
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: Colors.red,
                fontSize: 14,
              ),
            ),
          ),
          const SizedBox(height: 24),
          ElevatedButton.icon(
            onPressed: _refreshData,
            icon: const Icon(Icons.refresh),
            label: const Text('Thử Lại'),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(
            Icons.inbox,
            color: Colors.grey,
            size: 64,
          ),
          const SizedBox(height: 16),
          const Text(
            'Không có dữ liệu lương',
            style: TextStyle(
              color: Colors.grey,
              fontSize: 16,
            ),
          ),
          const SizedBox(height: 24),
          ElevatedButton.icon(
            onPressed: _refreshData,
            icon: const Icon(Icons.refresh),
            label: const Text('Loading'),
          ),
        ],
      ),
    );
  }

  Widget _buildPayrollList() {
    return RefreshIndicator(
      onRefresh: _refreshData,
      child: ListView.builder(
        padding: const EdgeInsets.all(12),
        itemCount: _payrollList.length,
        itemBuilder: (context, index) {
          final payroll = _payrollList[index];
          return _buildPayrollCard(payroll);
        },
      ),
    );
  }

  Widget _buildPayrollCard(PayrollModel payroll) {
    String moneyOrDash(double? v) =>
        v == null ? '-' : payroll.formatCurrency(v);

    return Card(
      margin: const EdgeInsets.symmetric(vertical: 8),
      elevation: 2,
      child: InkWell(
        onTap: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => PayrollDetailScreen(
                payroll: payroll,
              ),
            ),
          );
        },
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Tháng ${payroll.getMonthYear()}',
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const Icon(
                    Icons.chevron_right,
                    color: Colors.grey,
                  ),
                ],
              ),
              const Divider(height: 16, thickness: 1),

              // Nhóm read-only như list React: gross/deduction/tax/net
              _buildInfoRowText('Gross (Tax)', moneyOrDash(payroll.grossIncomeForTax)),
              _buildInfoRowText('Total Deduction', moneyOrDash(payroll.totalDeduction ?? payroll.deduction)),
              _buildInfoRowText('Personal Income Tax', moneyOrDash(payroll.personalIncomeTax)),
              const Divider(height: 16, thickness: 1),

              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.green[50],
                  border: Border.all(color: Colors.green),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Lương Thực Nhận (NET):',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                      ),
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
              ),

              const SizedBox(height: 12),

              // Tùy chọn: hiển thị nhanh các income components (để đối soát)
              _buildInfoRow('Base Salary', payroll.baseSalary ?? 0.0),
              _buildInfoRow('Product Bonus', payroll.productBonus ?? 0.0),
              _buildInfoRow('OT', payroll.overtimePay ?? 0.0),
              _buildInfoRow('Allowance', payroll.allowance ?? 0.0),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildInfoRowText(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: const TextStyle(
              fontSize: 13,
              color: Colors.grey,
            ),
          ),
          Text(
            value,
            style: const TextStyle(
              fontWeight: FontWeight.w600,
              fontSize: 13,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoRow(String label, double amount) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: const TextStyle(
              fontSize: 13,
              color: Colors.grey,
            ),
          ),
          Text(
            PayrollModel(totalPay: amount).formatCurrency(amount),
            style: const TextStyle(
              fontWeight: FontWeight.w600,
              fontSize: 13,
            ),
          ),
        ],
      ),
    );
  }
}