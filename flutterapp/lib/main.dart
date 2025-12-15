import 'package:flutter/material.dart';
import 'package:flutterapp/screens/auth/AppTheme.dart';
import 'package:flutterapp/screens/home/User_screen.dart';
import 'package:provider/provider.dart';
import 'package:firebase_core/firebase_core.dart';
import 'services/notification_service.dart';

import 'providers/auth_provider.dart';
import 'screens/auth/login_screen.dart';
import 'screens/home/home_screen.dart';

final AppTheme appTheme = AppTheme();

final GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();

void main() async{
  WidgetsFlutterBinding.ensureInitialized();
  try {
    await Firebase.initializeApp();
    print("Firebase Initialized Successfully");

    await NotificationService().initialize();

    String? token = await NotificationService().getDeviceToken();
    print("============================================");
    print("FCM DEVICE TOKEN: $token");
    print("============================================");

  } catch (e) {
    print("Firebase Initialization Failed: $e");
  }
  runApp(MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => AuthProvider()..tryAutoLogin(),
      child: MaterialApp(
        title: 'My App',
        debugShowCheckedModeBanner: false,
        navigatorKey: navigatorKey,
        theme: ThemeData(primarySwatch: Colors.blue),
        home: Consumer<AuthProvider>(
          builder: (context, auth, _) {
            if (auth.isLoggedIn) {
              return const UserHome();
            } else {
              return LoginScreen();
            }
          },
        ),
      ),
    );
  }
}
