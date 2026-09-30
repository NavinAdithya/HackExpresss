import 'package:flutter/material.dart';
import '../core/theme.dart';
import '../models/match_model.dart';
import '../shared/widgets/glass_widgets.dart';
import 'active_trip_screen.dart';

class TripsScreen extends StatelessWidget {
  const TripsScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final sampleMatch = CommuteMatch(
      id: 'active_commute_1',
      userName: 'Ananya Iyer',
      transportMode: 'BIKE',
      finalScore: 84.5,
      routeOverlap: 82.0,
      detourKm: 0.8,
      destinationGapKm: 0.2,
      fuelContribution: 50.0,
      matchType: 'EXACT_DESTINATION',
      explanation: 'Strong match: 82% corridor route overlap along your route.',
    );

    return Scaffold(
      backgroundColor: POTheme.background,
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
        physics: const BouncingScrollPhysics(),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'My Commutes',
              style: TextStyle(
                color: POTheme.cream,
                fontSize: 24,
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 4),
            const Text(
              'Real-time peer commutes and shared cost history.',
              style: TextStyle(color: POTheme.textMuted, fontSize: 13),
            ),
            const SizedBox(height: 20),

            // Active Commute Card
            const Text(
              'ACTIVE COMMUTE',
              style: TextStyle(
                color: POTheme.textMuted,
                fontSize: 11,
                fontWeight: FontWeight.w700,
                letterSpacing: 0.6,
              ),
            ),
            const SizedBox(height: 10),
            POGlassCard(
              hasGlow: true,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: POTheme.primary.withOpacity(0.2),
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(Icons.two_wheeler_rounded, color: POTheme.primary, size: 20),
                          ),
                          const SizedBox(width: 10),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: const [
                              Text(
                                'With Ananya Iyer',
                                style: TextStyle(color: POTheme.cream, fontWeight: FontWeight.w700, fontSize: 15),
                              ),
                              Text(
                                'Identity Verified Commuter',
                                style: TextStyle(color: POTheme.matchStrong, fontSize: 11, fontWeight: FontWeight.w600),
                              ),
                            ],
                          ),
                        ],
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: POTheme.primary.withOpacity(0.2),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: POTheme.primary.withOpacity(0.5)),
                        ),
                        child: const Text(
                          'READY',
                          style: TextStyle(color: POTheme.primary, fontSize: 11, fontWeight: FontWeight.w800),
                        ),
                      ),
                    ],
                  ),
                  const Divider(color: Colors.white12, height: 24),
                  Row(
                    children: [
                      const Icon(Icons.place_rounded, color: POTheme.primary, size: 16),
                      const SizedBox(width: 8),
                      const Expanded(
                        child: Text(
                          'Velachery → SRM Easwari Engineering College',
                          style: TextStyle(color: POTheme.cream, fontSize: 13, fontWeight: FontWeight.w600),
                        ),
                      ),
                      Text(
                        '₹50',
                        style: TextStyle(color: POTheme.cream, fontSize: 16, fontWeight: FontWeight.w800),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  POGlassButton(
                    label: 'Open Live Trip Security & OTP',
                    icon: Icons.shield_outlined,
                    height: 46,
                    onPressed: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => ActiveTripScreen(match: sampleMatch)),
                      );
                    },
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),

            // Past Completed Commutes
            const Text(
              'PAST COMMUTES',
              style: TextStyle(
                color: POTheme.textMuted,
                fontSize: 11,
                fontWeight: FontWeight.w700,
                letterSpacing: 0.6,
              ),
            ),
            const SizedBox(height: 10),
            _buildPastTripCard(
              date: 'Yesterday, 6:15 PM',
              route: 'Guindy Kathipara → Velachery',
              partner: 'Rahul Kumar (Bike)',
              cost: '₹40 shared',
              co2: '0.4 kg CO₂ saved',
            ),
            const SizedBox(height: 10),
            _buildPastTripCard(
              date: '28 Sep, 8:45 AM',
              route: 'Velachery → OMR Sholinganallur',
              partner: 'Pooja V (Car)',
              cost: '₹55 shared',
              co2: '0.8 kg CO₂ saved',
            ),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }

  Widget _buildPastTripCard({
    required String date,
    required String route,
    required String partner,
    required String cost,
    required String co2,
  }) {
    return POGlassCard(
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                date,
                style: const TextStyle(color: POTheme.textMuted, fontSize: 11, fontWeight: FontWeight.w600),
              ),
              Text(
                cost,
                style: const TextStyle(color: POTheme.cream, fontSize: 13, fontWeight: FontWeight.w700),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            route,
            style: const TextStyle(color: POTheme.cream, fontSize: 14, fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 4),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                partner,
                style: const TextStyle(color: POTheme.textMuted, fontSize: 12),
              ),
              Text(
                co2,
                style: const TextStyle(color: POTheme.matchStrong, fontSize: 11, fontWeight: FontWeight.w600),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
