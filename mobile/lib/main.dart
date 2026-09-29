import 'package:flutter/material.dart';
import 'core/theme.dart';
import 'screens/find_ride_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const POPOApp());
}

class POPOApp extends StatelessWidget {
  const POPOApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'PO → PO',
      debugShowCheckedModeBanner: false,
      theme: POTheme.darkTheme,
      home: const FindRideScreen(),
    );
  }
}
