class UserProfile {
  final String id;
  final String fullName;
  final String phone;
  final bool isMember;
  final String plan; // FREE, VERIFIED, PRO
  final double co2SavedKg;
  final int trustScore; // 0 - 100 deterministically calculated
  final List<TrustFactor> trustBreakdown;
  final int dailyRidesConfirmed;
  final int dailyQuotaMax;
  final bool travellerApproved;
  final bool identityVerified;
  final int completedTrips;
  final double rating;

  UserProfile({
    required this.id,
    required this.fullName,
    required this.phone,
    this.isMember = true,
    this.plan = 'VERIFIED',
    this.co2SavedKg = 4.2,
    required this.trustScore,
    required this.trustBreakdown,
    this.dailyRidesConfirmed = 0,
    this.dailyQuotaMax = 2,
    this.travellerApproved = true,
    this.identityVerified = true,
    this.completedTrips = 8,
    this.rating = 4.9,
  });

  int get dailyQuotaRemaining => (dailyQuotaMax - dailyRidesConfirmed).clamp(0, dailyQuotaMax);

  static UserProfile defaultProfile() {
    return UserProfile(
      id: 'usr_verified_01',
      fullName: 'Navin Adithya',
      phone: '+919876543210',
      isMember: true,
      plan: 'VERIFIED',
      co2SavedKg: 4.8,
      trustScore: 92,
      travellerApproved: true,
      identityVerified: true,
      completedTrips: 12,
      rating: 4.95,
      dailyRidesConfirmed: 0,
      dailyQuotaMax: 2,
      trustBreakdown: [
        TrustFactor(title: 'Identity Document Verified', points: 25, isPassed: true),
        TrustFactor(title: 'Approved Traveller Profile', points: 20, isPassed: true),
        TrustFactor(title: '12 Completed Shared Commutes', points: 20, isPassed: true),
        TrustFactor(title: 'High Rating (4.95 ★)', points: 15, isPassed: true),
        TrustFactor(title: 'Zero Last-Minute Cancellations', points: 12, isPassed: true),
        TrustFactor(title: 'Zero Unresolved Safety Reports', points: 8, isPassed: true),
      ],
    );
  }
}

class TrustFactor {
  final String title;
  final int points;
  final bool isPassed;

  TrustFactor({
    required this.title,
    required this.points,
    required this.isPassed,
  });
}
