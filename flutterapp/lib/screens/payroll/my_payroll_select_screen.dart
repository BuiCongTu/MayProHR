import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../providers/auth_provider.dart';
import '../../services/payroll_service.dart';
import 'payroll_detail_screen.dart';

class MyPayrollSelectScreen extends StatefulWidget {
  const MyPayrollSelectScreen({super.key});

  @override
  State<MyPayrollSelectScreen> createState() => _MyPayrollSelectScreenState();
}

class _MyPayrollSelectScreenState extends State<MyPayrollSelectScreen> {
  final PayrollService _service = PayrollService();

  List<int> _years = [];
  List<int> _months = [];
  int? _selectedYear;
  int? _selectedMonth;

  bool _loadingYears = true;
  bool _loadingMonths = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadYears();
  }

  Future<void> _loadYears() async {
    setState(() {
      _loadingYears = true;
      _error = null;
    });
    try {
      final auth = Provider.of<AuthProvider>(context, listen: false);
      final userId = (auth.currentUser?['id'] as int?) ?? 0;
      final token = auth.token ?? '';

      if (userId == 0 || token.isEmpty) {
        setState(() {
          _error = 'Invalid session. Please log in again.';
          _loadingYears = false;
        });
        return;
      }

      final years =
          await _service.getAvailableYears(userId: userId, token: token);
      setState(() {
        _years = years;
        _selectedYear = years.isNotEmpty ? years.first : null;
        _loadingYears = false;
      });

      if (_selectedYear != null) {
        await _loadMonths(_selectedYear!);
      }
    } catch (e) {
      setState(() {
        _error = e.toString();
        _loadingYears = false;
      });
    }
  }

  Future<void> _loadMonths(int year) async {
    setState(() {
      _loadingMonths = true;
      _error = null;
      _months = [];
      _selectedMonth = null;
    });
    try {
      final auth = Provider.of<AuthProvider>(context, listen: false);
      final userId = (auth.currentUser?['id'] as int?) ?? 0;
      final token = auth.token ?? '';

      final months = await _service.getAvailableMonths(
          userId: userId, year: year, token: token);
      setState(() {
        _months = months;
        _selectedMonth = months.isNotEmpty ? months.first : null;
        _loadingMonths = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _loadingMonths = false;
      });
    }
  }

  Future<void> _viewPayroll() async {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final userId = auth.currentUser?['id'] as int?;
    final token = auth.token;

    if (userId == null ||
        token == null ||
        _selectedYear == null ||
        _selectedMonth == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select year and month.')),
      );
      return;
    }

    try {
      final payroll = await _service.getPayrollByMonth(
        userId: userId,
        year: _selectedYear!,
        month: _selectedMonth!,
        token: token,
      );

      if (!mounted) return;
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => PayrollDetailScreen(payroll: payroll),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Payroll cannot loading: $e')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Select Payroll'),
        centerTitle: true,
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: _buildBody(),
      ),
    );
  }

  Widget _buildBody() {
    if (_loadingYears) {
      return const Center(child: CircularProgressIndicator());
    }
    if (_error != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, color: Colors.red, size: 48),
            const SizedBox(height: 12),
            Text(_error!, textAlign: TextAlign.center),
            const SizedBox(height: 16),
            ElevatedButton.icon(
              onPressed: _loadYears,
              icon: const Icon(Icons.refresh),
              label: const Text('Retry'),
            ),
          ],
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Year', style: TextStyle(fontWeight: FontWeight.bold)),
        const SizedBox(height: 8),
        DropdownButtonFormField<int>(
          value: _selectedYear,
          items: _years
              .map((y) => DropdownMenuItem(value: y, child: Text(y.toString())))
              .toList(),
          onChanged: (val) {
            if (val == null) return;
            setState(() => _selectedYear = val);
            _loadMonths(val);
          },
          decoration: const InputDecoration(border: OutlineInputBorder()),
        ),
        const SizedBox(height: 16),
        const Text('Month', style: TextStyle(fontWeight: FontWeight.bold)),
        const SizedBox(height: 8),
        _loadingMonths
            ? const Center(
                child: Padding(
                padding: EdgeInsets.all(8.0),
                child: CircularProgressIndicator(),
              ))
            : DropdownButtonFormField<int>(
                value: _selectedMonth,
                items: _months
                    .map((m) => DropdownMenuItem(
                        value: m, child: Text(m.toString().padLeft(2, '0'))))
                    .toList(),
                onChanged: (val) => setState(() => _selectedMonth = val),
                decoration: const InputDecoration(border: OutlineInputBorder()),
              ),
        const Spacer(),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton.icon(
            onPressed: (_selectedYear != null && _selectedMonth != null)
                ? _viewPayroll
                : null,
            icon: const Icon(Icons.receipt_long),
            label: const Text('View Payroll'),
            style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 14)),
          ),
        ),
      ],
    );
  }
}
