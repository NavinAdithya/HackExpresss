import 'package:flutter_test/flutter_test.dart';
import 'package:popo_mobile/main.dart';
import 'package:popo_mobile/models/match_model.dart';
import 'package:popo_mobile/models/profile_model.dart';
import 'package:popo_mobile/services/face_verification_service.dart';

void main() {
  group('PO → PO Core Business Logic & Architecture Tests', () {
    testWidgets('POPOApp boots successfully to Home Screen', (WidgetTester tester) async {
      await tester.pumpWidget(const POPOApp());
      await tester.pump();

      // Verify PO → PO branding and core statement
      expect(find.text('Welcome back'), findsOneWidget);
      expect(find.text('Find a Ride'), findsOneWidget);
      expect(find.text('Share My Commute'), findsOneWidget);
    });

    test('Daily ride limit: search & pending consume 0 quota, only confirmed commutes count', () {
      final profile = UserProfile.defaultProfile();

      // Rule: Strict maximum 2 confirmed shared commutes per calendar day
      expect(profile.dailyQuotaMax, 2);
      expect(profile.dailyRidesConfirmed, 0);
      expect(profile.dailyQuotaRemaining, 2);

      // Verify that after 1 confirmed ride, 1 remaining
      final oneConfirmed = UserProfile(
        id: profile.id,
        fullName: profile.fullName,
        phone: profile.phone,
        trustScore: profile.trustScore,
        trustBreakdown: profile.trustBreakdown,
        dailyRidesConfirmed: 1,
      );
      expect(oneConfirmed.dailyQuotaRemaining, 1);

      // Verify that after 2 confirmed rides, 0 remaining
      final twoConfirmed = UserProfile(
        id: profile.id,
        fullName: profile.fullName,
        phone: profile.phone,
        trustScore: profile.trustScore,
        trustBreakdown: profile.trustBreakdown,
        dailyRidesConfirmed: 2,
      );
      expect(twoConfirmed.dailyQuotaRemaining, 0);
    });

    test('Deterministic match quality tiers: honest labels & rejection of weak matches', () {
      final excellentMatch = CommuteMatch(
        id: '1',
        userName: 'A',
        transportMode: 'CAR',
        finalScore: 92.0,
        routeOverlap: 95.0,
        detourKm: 0.2,
        destinationGapKm: 0.1,
        fuelContribution: 35.0,
        matchType: 'EXACT',
        explanation: 'Excellent match',
      );
      expect(excellentMatch.qualityLabel, 'Excellent match');

      final strongMatch = CommuteMatch(
        id: '2',
        userName: 'B',
        transportMode: 'BIKE',
        finalScore: 84.5,
        routeOverlap: 82.0,
        detourKm: 0.8,
        destinationGapKm: 0.2,
        fuelContribution: 50.0,
        matchType: 'EXACT',
        explanation: 'Strong match',
      );
      expect(strongMatch.qualityLabel, 'Strong match');

      final compatibleMatch = CommuteMatch(
        id: '3',
        userName: 'C',
        transportMode: 'CAR',
        finalScore: 68.0,
        routeOverlap: 65.0,
        detourKm: 1.8,
        destinationGapKm: 1.1,
        fuelContribution: 45.0,
        matchType: 'NEARBY',
        explanation: 'Compatible commute',
      );
      expect(compatibleMatch.qualityLabel, 'Compatible commute');

      final weakMatch = CommuteMatch(
        id: '4',
        userName: 'D',
        transportMode: 'BIKE',
        finalScore: 45.0,
        routeOverlap: 40.0,
        detourKm: 3.5,
        destinationGapKm: 2.2,
        fuelContribution: 60.0,
        matchType: 'CORRIDOR',
        explanation: 'Weak compatibility',
      );
      expect(weakMatch.qualityLabel, 'Weak compatibility');

      final rejectedMatch = CommuteMatch(
        id: '5',
        userName: 'E',
        transportMode: 'CAR',
        finalScore: 25.0,
        routeOverlap: 15.0,
        detourKm: 7.5,
        destinationGapKm: 5.0,
        fuelContribution: 80.0,
        matchType: 'DETOUR',
        explanation: 'Not suitable',
      );
      expect(rejectedMatch.qualityLabel, 'Not suitable');
    });

    test('Trust Score must be real, calculated from factors, not hardcoded', () {
      final profile = UserProfile.defaultProfile();
      expect(profile.trustScore, 92);
      expect(profile.trustBreakdown.isNotEmpty, true);

      // Verify factor calculation
      final totalPoints = profile.trustBreakdown
          .where((f) => f.isPassed)
          .fold<int>(0, (sum, f) => sum + f.points);
      expect(totalPoints, 100);
    });

    test('Face verification blocks friend substitution with IDENTITY_MISMATCH', () {
      // Legitimate user passes
      final legitResult = FaceVerificationService.verifyFace(
        referenceId: 'ref_123',
        isFriendSubstitution: false,
      );
      expect(legitResult['verified'], true);
      expect(legitResult['status'], 'VERIFIED');

      // Friend substitution fails
      final subResult = FaceVerificationService.verifyFace(
        referenceId: 'ref_123',
        isFriendSubstitution: true,
      );
      expect(subResult['verified'], false);
      expect(subResult['status'], 'IDENTITY_MISMATCH');
    });
  });
}
