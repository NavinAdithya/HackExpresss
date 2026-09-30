import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:popo_mobile/main.dart';
import 'package:popo_mobile/models/safety_model.dart';
import 'package:popo_mobile/services/safety_service.dart';
import 'package:popo_mobile/shared/widgets/safety_button.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('PO → PO 4-Level Safety/SOS System Tests', () {
    setUp(() async {
      await SafetyService.instance.setSafe();
    });

    test('Level 1: 🟢 Green — Safe: Default state has no active tracking, sharing, or alerts', () {
      final service = SafetyService.instance;
      expect(service.level, SafetyLevel.safe);
      expect(service.currentJourney, isNull);
      expect(service.liveLocationData, isNull);
      expect(service.sosReports.isEmpty, isTrue);
      expect(service.isDelayAlertTriggered, isFalse);
    });

    test('Level 2: 🟡 Yellow — Journey: Collects required fields and formats message correctly', () async {
      final service = SafetyService.instance;
      final startTime = DateTime(2026, 9, 30, 8, 30);
      final expectedArrival = DateTime(2026, 9, 30, 9, 0);

      final plan = JourneyPlan(
        startLocation: 'Velachery, Chennai',
        destination: 'Guindy, Chennai',
        startTime: startTime,
        expectedArrival: expectedArrival,
        route: 'via Velachery 100ft Rd',
        transport: '🏍️ BIKE',
        companions: 'Riding with Karthik (TN 09 AB 1234)',
        mapsLink: 'https://maps.google.com/?q=Guindy,%20Chennai',
      );

      await service.startJourney(plan);

      expect(service.level, SafetyLevel.journey);
      expect(service.currentJourney, isNotNull);
      expect(service.currentJourney!.startLocation, 'Velachery, Chennai');
      expect(service.currentJourney!.destination, 'Guindy, Chennai');

      final formattedMsg = plan.formatDispatchMessage();
      expect(formattedMsg.contains('🟡 Journey Started'), isTrue);
      expect(formattedMsg.contains('📍 Start: Velachery, Chennai'), isTrue);
      expect(formattedMsg.contains('🏁 Destination: Guindy, Chennai'), isTrue);
      expect(formattedMsg.contains('🕐 Start: 08:30 AM'), isTrue);
      expect(formattedMsg.contains('⏰ ETA: 09:00 AM'), isTrue);
      expect(formattedMsg.contains('👥 With: Riding with Karthik (TN 09 AB 1234) (🏍️ BIKE)'), isTrue);
      expect(formattedMsg.contains('🗺️ Route: https://maps.google.com/?q=Guindy,%20Chennai'), isTrue);
    });

    test('Level 3: 🟠 Orange — Live Location: Coordinates, timestamp, maps link, battery, and stop sharing', () async {
      final service = SafetyService.instance;
      final testTime = DateTime(2026, 9, 30, 8, 45, 0);

      final liveData = LiveLocationData(
        latitude: 12.9815,
        longitude: 80.2180,
        address: 'Velachery, Chennai',
        timestamp: testTime,
        batteryPercentage: 88,
        updateCount: 3,
        isSharing: true,
      );

      expect(liveData.mapsUrl, 'https://maps.google.com/?q=12.9815,80.218');

      final shareMsg = liveData.formatShareMessage();
      expect(shareMsg.contains('🟠 Live Location Active'), isTrue);
      expect(shareMsg.contains('📍 Location: Velachery, Chennai'), isTrue);
      expect(shareMsg.contains('🌐 Coordinates: 12.98150, 80.21800'), isTrue);
      expect(shareMsg.contains('🔋 Battery: 88%'), isTrue);
      expect(shareMsg.contains('🗺️ Live Map: https://maps.google.com/?q=12.9815,80.218'), isTrue);
      expect(shareMsg.contains('🔄 Location Update #3'), isTrue);

      // Stop Sharing returns to Safe
      await service.stopLiveLocation();
      expect(service.level, SafetyLevel.safe);
      expect(service.liveLocationData, isNull);
    });

    test('Level 4: 🔴 Red — Emergency SOS: Generates location, SMS, WhatsApp, and 112 reports with audit status', () async {
      final service = SafetyService.instance;

      await service.triggerEmergencySos();

      expect(service.level, SafetyLevel.emergencySos);
      expect(service.sosReports.isNotEmpty, isTrue);

      // Verify GPS lock report
      final gpsReport = service.sosReports.firstWhere((r) => r.channel.contains('GPS'));
      expect(gpsReport.status, DispatchStatus.sent);
      expect(gpsReport.detail.contains('Location locked'), isTrue);

      // Verify SMS report
      final smsReports = service.sosReports.where((r) => r.channel.contains('SMS')).toList();
      expect(smsReports.isNotEmpty, isTrue);

      // Verify Emergency Call (112) action report
      final callReport = service.sosReports.firstWhere((r) => r.channel.contains('112'));
      expect(callReport.status, DispatchStatus.requiresUserAction);

      // De-escalate back to Safe
      await service.setSafe();
      expect(service.level, SafetyLevel.safe);
      expect(service.sosReports.isEmpty, isTrue);
    });

    testWidgets('Top-right Safety Button displays in header and opens 4-level modal', (WidgetTester tester) async {
      await tester.pumpWidget(const POPOApp());
      await tester.pump();

      // Top-right safety button exists and shows Safe
      final safetyButtonFinder = find.byType(SafetyButton);
      expect(safetyButtonFinder, findsOneWidget);
      expect(find.text('Safe'), findsOneWidget);

      // Tap SafetyButton to open the 4-level modal
      await tester.tap(safetyButtonFinder);
      await tester.pumpAndSettle();

      // Verify all 4 levels are presented
      expect(find.text('Safety & SOS Level'), findsOneWidget);
      expect(find.text('Green — Safe'), findsOneWidget);
      expect(find.text('Yellow — Journey'), findsOneWidget);
      expect(find.text('Orange — Live Location'), findsOneWidget);
      expect(find.text('Red — Emergency SOS'), findsOneWidget);

      // Tap Red — Emergency SOS to verify confirmation dialog requirement
      await tester.tap(find.text('Red — Emergency SOS'));
      await tester.pumpAndSettle();

      // Verify explicit confirmation dialog is displayed
      expect(find.text('CONFIRM EMERGENCY SOS'), findsOneWidget);
      expect(find.text('ACTIVATE SOS'), findsOneWidget);

      // Cancel confirmation
      await tester.tap(find.text('Cancel'));
      await tester.pumpAndSettle();
      expect(SafetyService.instance.level, SafetyLevel.safe);
    });
  });
}
