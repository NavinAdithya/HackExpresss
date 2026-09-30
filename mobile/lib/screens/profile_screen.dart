import 'package:flutter/material.dart';
import '../core/theme.dart';
import '../models/profile_model.dart';
import '../shared/widgets/glass_widgets.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final user = UserProfile.defaultProfile();

    return Scaffold(
      backgroundColor: POTheme.background,
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
        physics: const BouncingScrollPhysics(),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header Profile Card
            Center(
              child: Column(
                children: [
                  Container(
                    width: 84,
                    height: 84,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: const LinearGradient(
                        colors: [POTheme.primary, POTheme.brightOrange],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: POTheme.primary.withOpacity(0.4),
                          blurRadius: 16,
                          offset: const Offset(0, 4),
                        ),
                      ],
                      border: Border.all(color: POTheme.cream, width: 2),
                    ),
                    child: Center(
                      child: Text(
                        user.fullName.substring(0, 1),
                        style: const TextStyle(
                          color: POTheme.cream,
                          fontSize: 34,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    user.fullName,
                    style: const TextStyle(
                      color: POTheme.cream,
                      fontSize: 22,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    user.phone,
                    style: const TextStyle(color: POTheme.textMuted, fontSize: 13),
                  ),
                  const SizedBox(height: 10),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      POGlassPill(
                        text: '✓ PO → PO Member',
                        color: POTheme.matchStrong,
                        textColor: POTheme.cream,
                      ),
                      const SizedBox(width: 8),
                      POGlassPill(
                        text: user.plan,
                        color: POTheme.primary,
                        textColor: POTheme.cream,
                      ),
                    ],
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),

            // Real Calculated Trust Score Section
            POGlassCard(
              hasGlow: true,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: const [
                          Icon(Icons.shield_rounded, color: POTheme.primary, size: 20),
                          SizedBox(width: 8),
                          Text(
                            'COMMUNITY TRUST SCORE',
                            style: TextStyle(
                              color: POTheme.textMuted,
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              letterSpacing: 0.6,
                            ),
                          ),
                        ],
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: POTheme.matchStrong.withOpacity(0.2),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: POTheme.matchStrong.withOpacity(0.4)),
                        ),
                        child: Text(
                          '${user.trustScore} / 100',
                          style: const TextStyle(
                            color: POTheme.matchStrong,
                            fontSize: 14,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  const Text(
                    'Why this score?',
                    style: TextStyle(
                      color: POTheme.cream,
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'Trust Score is deterministically calculated by the backend based on your actual verified PO → PO commute history.',
                    style: TextStyle(color: POTheme.textMuted, fontSize: 12),
                  ),
                  const SizedBox(height: 12),
                  ...user.trustBreakdown.map((factor) {
                    return Padding(
                      padding: const EdgeInsets.symmetric(vertical: 4),
                      child: Row(
                        children: [
                          Icon(
                            factor.isPassed ? Icons.check_circle_rounded : Icons.radio_button_unchecked,
                            color: factor.isPassed ? POTheme.matchStrong : POTheme.textMuted,
                            size: 16,
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              factor.title,
                              style: const TextStyle(color: POTheme.cream, fontSize: 13),
                            ),
                          ),
                          Text(
                            '+${factor.points} pts',
                            style: const TextStyle(
                              color: POTheme.textMuted,
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    );
                  }).toList(),
                ],
              ),
            ),

            const SizedBox(height: 16),

            // Authoritative Daily Ride Quota
            POGlassCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: const [
                          Icon(Icons.event_repeat_rounded, color: POTheme.brightOrange, size: 20),
                          SizedBox(width: 8),
                          Text(
                            'DAILY COMMUTE QUOTA',
                            style: TextStyle(
                              color: POTheme.textMuted,
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              letterSpacing: 0.6,
                            ),
                          ),
                        ],
                      ),
                      Text(
                        '${user.dailyQuotaRemaining} of ${user.dailyQuotaMax} Remaining',
                        style: const TextStyle(
                          color: POTheme.cream,
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(6),
                    child: LinearProgressIndicator(
                      value: user.dailyRidesConfirmed / user.dailyQuotaMax,
                      backgroundColor: Colors.white12,
                      valueColor: const AlwaysStoppedAnimation<Color>(POTheme.primary),
                      minHeight: 6,
                    ),
                  ),
                  const SizedBox(height: 10),
                  const Text(
                    'Rule: Strict maximum of 2 confirmed shared commutes per calendar day. Searching or publishing without passenger match consumes 0 quota.',
                    style: TextStyle(color: POTheme.textMuted, fontSize: 11),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 16),

            // Impact & Verification Details
            POGlassCard(
              child: Column(
                children: [
                  _buildStatRow(
                    icon: Icons.eco_rounded,
                    iconColor: POTheme.matchStrong,
                    title: 'CO₂ Emissions Prevented',
                    value: '${user.co2SavedKg} kg CO₂',
                  ),
                  const Divider(color: Colors.white12, height: 20),
                  _buildStatRow(
                    icon: Icons.badge_rounded,
                    iconColor: POTheme.primary,
                    title: 'Traveller Verification',
                    value: user.travellerApproved ? 'Approved' : 'Pending',
                  ),
                  const Divider(color: Colors.white12, height: 20),
                  _buildStatRow(
                    icon: Icons.star_rounded,
                    iconColor: Colors.amber,
                    title: 'Commuter Rating',
                    value: '${user.rating} ★ (${user.completedTrips} trips)',
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  Widget _buildStatRow({
    required IconData icon,
    required Color iconColor,
    required String title,
    required String value,
  }) {
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: iconColor.withOpacity(0.18),
            shape: BoxShape.circle,
          ),
          child: Icon(icon, color: iconColor, size: 18),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Text(
            title,
            style: const TextStyle(color: POTheme.cream, fontSize: 14),
          ),
        ),
        Text(
          value,
          style: const TextStyle(color: POTheme.cream, fontWeight: FontWeight.w700, fontSize: 14),
        ),
      ],
    );
  }
}
