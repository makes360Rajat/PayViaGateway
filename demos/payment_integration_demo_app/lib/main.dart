import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'screens/merchant_order_screen.dart';
import 'services/screenshot_manager.dart';
import 'utils/app_theme.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  GoogleFonts.config.allowRuntimeFetching = true;

  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.light,
      systemNavigationBarColor: Color(0xFF070B0F),
      systemNavigationBarIconBrightness: Brightness.light,
    ),
  );

  runApp(const PaymentIntegrationApp());
}

class PaymentIntegrationApp extends StatelessWidget {
  const PaymentIntegrationApp({super.key});

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: ScreenshotManager(),
      builder: (context, child) {
        return MaterialApp(
          title: 'PayVia360 Gateway Demo',
          debugShowCheckedModeBanner: false,
          theme: AppTheme.darkTheme,
          home: const MerchantOrderScreen(),
        );
      },
    );
  }
}
