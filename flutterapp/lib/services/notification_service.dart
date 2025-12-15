import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import '../main.dart';
import '../screens/overtime/my_overtime_screen.dart';

// Top-level function for background handling (must be outside any class)
@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
  print("Handling a background message: ${message.messageId}");
}

class NotificationService {
  static final NotificationService _instance = NotificationService._internal();
  factory NotificationService() => _instance;
  NotificationService._internal();

  final FirebaseMessaging _firebaseMessaging = FirebaseMessaging.instance;
  final FlutterLocalNotificationsPlugin _localNotifications = FlutterLocalNotificationsPlugin();

  bool _isInitialized = false;

  // --- 1. INITIAL SETUP ---
  Future<void> initialize() async {
    if (_isInitialized) return;

    // A. Request Permission (Required for Android 13+)
    NotificationSettings settings = await _firebaseMessaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );

    if (settings.authorizationStatus == AuthorizationStatus.authorized) {
      print('User granted permission');
    } else {
      print('User declined or has not accepted permission');
      return;
    }

    // B. Initialize Local Notifications (For Foreground Popups)
    const AndroidInitializationSettings androidSettings =
    AndroidInitializationSettings('@mipmap/ic_launcher');
    const InitializationSettings initSettings =
    InitializationSettings(android: androidSettings);

    await _localNotifications.initialize(
      initSettings,
      onDidReceiveNotificationResponse: (NotificationResponse response) {
        if (response.payload != null) {
          print("Foreground Click Payload: ${response.payload}");
          _navigateToOvertime(response.payload);
        }
      },
    );

    // C. Set Background Handler
    FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);

    FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
      print("Background Click Data: ${message.data}");
      if (message.data.containsKey('ticketId')) {
        _navigateToOvertime(message.data['ticketId']);
      }
    });

    FirebaseMessaging.instance.getInitialMessage().then((RemoteMessage? message) {
      if (message != null && message.data.containsKey('ticketId')) {
        print("Terminated Launch Data: ${message.data}");
        //delay to ensure app is mounted
        Future.delayed(const Duration(seconds: 1), () {
          _navigateToOvertime(message.data['ticketId']);
        });
      }
    });

    // D. Listen to Foreground Messages
    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      print('Got a message whilst in the foreground!');
      if (message.notification != null) {
        showLocalNotification(message);
      }
    });

    _isInitialized = true;
  }

  // --- 2. GET DEVICE TOKEN ---
  Future<String?> getDeviceToken() async {
    try {
      String? token = await _firebaseMessaging.getToken();
      print("FCM Token: $token");
      return token;
    } catch (e) {
      print("Failed to get token: $e");
      return null;
    }
  }

  // --- 3. SHOW POPUP (FOREGROUND) ---
  Future<void> showLocalNotification(RemoteMessage message) async {
    // Create a high-priority channel
    const AndroidNotificationDetails androidDetails = AndroidNotificationDetails(
      'high_importance_channel',
      'High Importance Notifications',
      channelDescription: 'This channel is used for important notifications.',
      importance: Importance.max,
      priority: Priority.high,
      showWhen: true,
    );

    const NotificationDetails platformDetails =
    NotificationDetails(android: androidDetails);

    await _localNotifications.show(
      message.hashCode,
      message.notification?.title,
      message.notification?.body,
      platformDetails,
      payload: message.data['ticketId'],
    );
  }

  void _navigateToOvertime(String? ticketId) {
    if (ticketId == null) return;

    // Use the Global Key to push the screen
    navigatorKey.currentState?.push(
      MaterialPageRoute(
        builder: (context) => MyOvertimeScreen(),
        // If your MyOvertimeScreen accepts a ticketId, pass it here:
        // builder: (context) => MyOvertimeScreen(highlightTicketId: ticketId),
      ),
    );
  }
}