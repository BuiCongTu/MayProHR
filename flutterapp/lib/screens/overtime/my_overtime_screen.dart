import 'package:flutter/material.dart';
import '../../models/overtime_model.dart';
import '../../services/overtime_service.dart';
import '../../services/websocket_service.dart';

class MyOvertimeScreen extends StatefulWidget {
  final int? highlightTicketId;
  const MyOvertimeScreen({super.key, this.highlightTicketId});

  @override
  State<MyOvertimeScreen> createState() => _MyOvertimeScreenState();
}

class _MyOvertimeScreenState extends State<MyOvertimeScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final OvertimeService _overtimeService = OvertimeService();
  final WebSocketService _wsService = WebSocketService();

  List<OvertimeInvite> _allInvites = [];
  bool _isLoading = true;
  String? _error;

  late int _selectedMonth;
  late int _selectedYear;
  final List<int> _availableYears = List.generate(5, (index) => DateTime.now().year + 1 - index);

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);

    final now = DateTime.now();
    _selectedMonth = now.month;
    _selectedYear = now.year;

    _wsService.connect();
    _wsService.onUpdate.listen((_) {
      print("Real-time update triggered");
      _loadData(silent: true);
    });
    _loadData();
  }

  Future<void> _loadData({bool silent = false}) async {
    if (!mounted) return;
    if (!silent) {
      setState(() {
        _isLoading = true;
        _error = null;
      });
    }

    try {
      final data = await _overtimeService.getMyInvites();
      if (!mounted) return;
      setState(() {
        _allInvites = data;
        _isLoading = false;
        if (widget.highlightTicketId != null) {
          final isInPending = _allInvites.any((i) =>
          i.ticketId == widget.highlightTicketId && i.status.toLowerCase() == 'pending');

          if (!isInPending) {
            final isInHistory = _allInvites.any((i) =>
            i.ticketId == widget.highlightTicketId && i.status.toLowerCase() != 'pending');
            if (isInHistory) {
              _tabController.animateTo(1);
            }
          }
        }
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  Future<void> _respond(int ticketId, String status) async {
    try {
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (_) => const Center(child: CircularProgressIndicator()),
      );

      await _overtimeService.respondToInvite(ticketId, status);

      Navigator.pop(context);

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
            content: Text("Successfully ${status == 'accepted' ? 'Accepted' : 'Rejected'}!"),
            backgroundColor: Colors.green
        ),
      );
      _loadData();
    } catch (e) {
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text("Error: $e"), backgroundColor: Colors.red),
      );
    }
  }

  DateTime? _parseDate(String dateStr) {
    return DateTime.tryParse(dateStr);
  }

  @override
  Widget build(BuildContext context) {
    final pendingList = _allInvites.where((i) => i.status.toLowerCase() == 'pending').toList();
    pendingList.sort((a, b) {
      return a.overtimeDate.compareTo(b.overtimeDate);
    });

    final historyListAll = _allInvites.where((i) => i.status.toLowerCase() != 'pending').toList();
    final filteredHistoryList = historyListAll.where((item) {
      final date = _parseDate(item.overtimeDate);
      if (date == null) return false;
      return date.month == _selectedMonth && date.year == _selectedYear;
    }).toList();

    return Scaffold(
      appBar: AppBar(
        title: const Text("Overtime Management"),
        bottom: TabBar(
          controller: _tabController,
          labelColor: Colors.blue,
          unselectedLabelColor: Colors.grey,
          indicatorColor: Colors.blue,
          tabs: [
            Tab(text: "Pending (${pendingList.length})"),
            Tab(text: "History"),
          ],
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
          ? Center(child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(_error!, style: const TextStyle(color: Colors.red), textAlign: TextAlign.center),
          const SizedBox(height: 10),
          ElevatedButton(onPressed: _loadData, child: const Text("Retry"))
        ],
      ))
          : TabBarView(
        controller: _tabController,
        children: [
          _buildPendingList(pendingList),
          _buildHistoryList(filteredHistoryList),
        ],
      ),
    );
  }

  Widget _buildPendingList(List<OvertimeInvite> list) {
    if (list.isEmpty) return const Center(child: Text("No pending overtime invites."));

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: list.length,
      itemBuilder: (ctx, index) {
        final item = list[index];
        final bool isHighlighted = (item.ticketId == widget.highlightTicketId);
        final bool isFull = item.currentAttendees >= item.maxAttendees;
        final double progress = item.maxAttendees > 0
            ? (item.currentAttendees / item.maxAttendees)
            : 0.0;
        return Card(
          elevation: isHighlighted ? 10 : 3,
          color: isFull ? Colors.grey[200] : Colors.white,
          margin: const EdgeInsets.only(bottom: 16),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
            side: isHighlighted
                ? const BorderSide(color: Colors.orange, width: 2)
                : BorderSide.none,
          ),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Chip(
                      label: Text(isFull ? "FULL" : "OPEN"),
                      backgroundColor: isFull ? Colors.grey : Colors.green[100],
                      labelStyle: TextStyle(color: isFull ? Colors.white : Colors.green[800]),
                    ),
                    Text(item.overtimeDate, style: const TextStyle(fontWeight: FontWeight.bold)),
                  ],
                ),
                const SizedBox(height: 8),
                Text("Line: ${item.lineName}", style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w500)),
                const SizedBox(height: 4),
                Row(
                  children: [
                    const Icon(Icons.access_time, size: 16, color: Colors.grey),
                    const SizedBox(width: 4),
                    Text("${item.startTime} - ${item.endTime} (${item.hours}h)"),
                  ],
                ),
                const SizedBox(height: 4),
                Text("Manager: ${item.managerName}", style: const TextStyle(color: Colors.blueGrey)),

                const SizedBox(height: 12),

                // PROGRESS BAR
                ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: LinearProgressIndicator(
                    value: progress,
                    backgroundColor: Colors.grey[300],
                    valueColor: AlwaysStoppedAnimation<Color>(
                        isFull ? Colors.red : Colors.blue
                    ),
                    minHeight: 8,
                  ),
                ),
                const SizedBox(height: 4),
                Align(
                    alignment: Alignment.centerRight,
                    child: Text(
                        "${item.currentAttendees} / ${item.maxAttendees} Filled",
                        style: TextStyle(fontSize: 12, color: isFull ? Colors.red : Colors.grey[600])
                    )
                ),

                const Divider(height: 24),

                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () => _respond(item.ticketId, 'rejected'),
                        style: OutlinedButton.styleFrom(
                            foregroundColor: Colors.red,
                            side: const BorderSide(color: Colors.red),
                            padding: const EdgeInsets.symmetric(vertical: 12)
                        ),
                        child: const Text("REJECT"),
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: ElevatedButton(
                        onPressed: isFull ? null : () => _respond(item.ticketId, 'accepted'),
                        style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.green,
                            padding: const EdgeInsets.symmetric(vertical: 12)
                        ),
                        child: const Text("ACCEPT", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                      ),
                    ),
                  ],
                )
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildHistoryList(List<OvertimeInvite> list) {
    return Column(
      children: [
        // Filter Bar
        Container(
          padding: const EdgeInsets.all(12),
          color: Colors.grey[100],
          child: Row(
            children: [
              const Icon(Icons.filter_list, color: Colors.blue),
              const SizedBox(width: 8),
              const Text("Filter: ", style: TextStyle(fontWeight: FontWeight.bold)),
              const SizedBox(width: 12),

              // Month Dropdown
              DropdownButton<int>(
                value: _selectedMonth,
                items: List.generate(12, (index) => index + 1)
                    .map((m) => DropdownMenuItem(
                  value: m,
                  child: Text("Month $m"),
                )).toList(),
                onChanged: (val) {
                  if (val != null) setState(() => _selectedMonth = val);
                },
              ),
              const SizedBox(width: 16),

              // Year Dropdown
              DropdownButton<int>(
                value: _selectedYear,
                items: _availableYears
                    .map((y) => DropdownMenuItem(
                  value: y,
                  child: Text("$y"),
                )).toList(),
                onChanged: (val) {
                  if (val != null) setState(() => _selectedYear = val);
                },
              ),
            ],
          ),
        ),

        // List Content
        Expanded(
          child: list.isEmpty
              ? Center(child: Text("No history found for Month $_selectedMonth/$_selectedYear."))
              : ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: list.length,
            itemBuilder: (ctx, index) {
              final item = list[index];
              final isAccepted = item.status.toLowerCase() == 'accepted';
              final bool isHighlighted = (item.ticketId == widget.highlightTicketId);

              return Card(
                margin: const EdgeInsets.only(bottom: 12),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                  side: isHighlighted
                      ? const BorderSide(color: Colors.orange, width: 2)
                      : BorderSide.none,
                ),
                child: ListTile(
                  leading: Icon(
                    isAccepted ? Icons.check_circle : Icons.cancel,
                    color: isAccepted ? Colors.green : Colors.red,
                    size: 32,
                  ),
                  title: Text(item.overtimeDate),
                  subtitle: Text("${item.startTime} - ${item.endTime} (${item.hours}h)"),
                  trailing: Text(
                    isAccepted ? "ACCEPTED" : "REJECTED",
                    style: TextStyle(
                        color: isAccepted ? Colors.green : Colors.red,
                        fontWeight: FontWeight.bold
                    ),
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}