import 'package:flutter_test/flutter_test.dart';
import 'package:payment_integration_demo_app/main.dart';

void main() {
  testWidgets('PaymentIntegrationApp smoke test', (WidgetTester tester) async {
    // Build our app and trigger a frame.
    await tester.pumpWidget(const PaymentIntegrationApp());

    // Verify that the merchant order screen renders
    expect(find.text('CREATE PAYMENT ORDER'), findsOneWidget);
  });
}
