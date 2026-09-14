import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'screens/home_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const PayViaCompanionApp());
}

class PayViaCompanionApp extends StatelessWidget {
  const PayViaCompanionApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'PayVia SMS Gateway',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF090D16),
        colorScheme: ColorScheme.dark(
          primary: Colors.indigo.shade500,
          secondary: Colors.purple.shade400,
          surface: const Color(0xFF111827),
        ),
        textTheme: GoogleFonts.dmSansTextTheme(
          ThemeData(brightness: Brightness.dark).textTheme,
        ),
        useMaterial3: true,
      ),
      home: const HomeScreen(),
    );
  }
}
