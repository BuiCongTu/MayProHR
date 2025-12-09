import 'dart:async';
import 'dart:convert';
import 'package:stomp_dart_client/stomp.dart';
import 'package:stomp_dart_client/stomp_config.dart';
import 'package:stomp_dart_client/stomp_frame.dart';
import '../configs/api_config.dart';
import 'storage_service.dart';

class WebSocketService {
  StompClient? _client;
  final StorageService _storage = StorageService();

  // Stream to notify UI components to refresh
  final _updateController = StreamController<void>.broadcast();
  Stream<void> get onUpdate => _updateController.stream;

  void connect() async {
    final token = await _storage.getToken();
    if (token == null) return;

    // Adjust WS URL (replace http with ws)
    final wsUrl = '${ApiConfig.baseUrl.replaceFirst('http', 'ws')}/ws';

    _client = StompClient(
      config: StompConfig(
        url: wsUrl,
        onConnect: _onConnect,
        onWebSocketError: (dynamic error) => print('WS Error: $error'),
        stompConnectHeaders: {'Authorization': 'Bearer $token'},
        webSocketConnectHeaders: {'Authorization': 'Bearer $token'},
      ),
    );

    _client?.activate();
  }

  void _onConnect(StompFrame frame) {
    print('WebSocket Connected');

    _client?.subscribe(
      destination: '/topic/tickets',
      callback: (frame) {
        print('Update Received: ${frame.body}');
        _updateController.add(null);
      },
    );

    // Listen for personal notifications if you implemented that endpoint
    // _client?.subscribe(...)
  }

  void disconnect() {
    _client?.deactivate();
  }
}