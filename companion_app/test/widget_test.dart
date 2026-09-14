import 'package:flutter_test/flutter_test.dart';
import 'package:payvia_companion/main.dart';

void main() {
  testWidgets('App smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(const PayViaCompanionApp());
    expect(find.text('PayVia SMS Gateway'), findsOneWidget);
  });
}
