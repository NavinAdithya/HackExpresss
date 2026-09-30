import 'dart:ui';
import 'package:flutter/material.dart';
import '../../core/theme.dart';
import '../../models/safety_model.dart';
import '../../services/safety_service.dart';
import 'journey_setup_sheet.dart';
import 'live_location_sheet.dart';
import 'sos_sheets.dart';
import 'contacts_sheet.dart';

class SafetyModal extends StatelessWidget {
  const SafetyModal({Key? key}) : super(key: key);

  static void show(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (ctx) => const SafetyModal(),
    );
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: SafetyService.instance,
      builder: (context, _) {
        final currentLevel = SafetyService.instance.level;
        return BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 16, sigmaY: 16),
          child: Container(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
            decoration: BoxDecoration(
              color: const Color(0xF2141414),
              borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
              border: Border.all(color: POTheme.glassBorder),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Container(
                    width: 44,
                    height: 4,
                    decoration: BoxDecoration(
                      color: Colors.white24,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                const SizedBox(height: 18),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: const [
                        Icon(Icons.shield_rounded, color: POTheme.primary, size: 24),
                        SizedBox(width: 10),
                        Text(
                          'Safety & SOS Level',
                          style: TextStyle(
                            color: POTheme.cream,
                            fontSize: 18,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ],
                    ),
                    InkWell(
                      onTap: () => ContactsSheet.show(context),
                      borderRadius: BorderRadius.circular(8),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        child: Row(
                          children: [
                            const Icon(Icons.people_outline_rounded, color: POTheme.textMuted, size: 16),
                            const SizedBox(width: 4),
                            Text(
                              'Contacts (${SafetyService.instance.selectedContacts.length})',
                              style: const TextStyle(
                                color: POTheme.textMuted,
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                const Text(
                  'Select commute safety level to immediately update monitoring & alerts.',
                  style: TextStyle(color: POTheme.textMuted, fontSize: 13),
                ),
                const SizedBox(height: 20),

                // 🟢 Level 1: Green — Safe
                _buildLevelCard(
                  context: context,
                  level: SafetyLevel.safe,
                  isSelected: currentLevel == SafetyLevel.safe,
                  badgeEmoji: '🟢',
                  title: 'Green — Safe',
                  subtitle: 'Default state. No tracking, sharing, or alerts.',
                  accentColor: const Color(0xFF22C55E),
                  onTap: () async {
                    await SafetyService.instance.setSafe();
                    if (context.mounted) {
                      Navigator.pop(context);
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('🟢 Status set to Safe. All tracking and alerts stopped.'),
                          backgroundColor: Color(0xFF1B5E20),
                          duration: Duration(seconds: 2),
                        ),
                      );
                    }
                  },
                ),
                const SizedBox(height: 10),

                // 🟡 Level 2: Yellow — Journey
                _buildLevelCard(
                  context: context,
                  level: SafetyLevel.journey,
                  isSelected: currentLevel == SafetyLevel.journey,
                  badgeEmoji: '🟡',
                  title: 'Yellow — Journey',
                  subtitle: 'Planned travel. Record route, ETA & notify contacts.',
                  accentColor: const Color(0xFFEAB308),
                  onTap: () {
                    Navigator.pop(context);
                    JourneySetupSheet.show(context);
                  },
                ),
                const SizedBox(height: 10),

                // 🟠 Level 3: Orange — Live Location
                _buildLevelCard(
                  context: context,
                  level: SafetyLevel.liveLocation,
                  isSelected: currentLevel == SafetyLevel.liveLocation,
                  badgeEmoji: '🟠',
                  title: 'Orange — Live Location',
                  subtitle: 'Real-time GPS broadcast with coordinates & battery.',
                  accentColor: const Color(0xFFF97316),
                  onTap: () async {
                    Navigator.pop(context);
                    if (currentLevel != SafetyLevel.liveLocation) {
                      await SafetyService.instance.startLiveLocation();
                    }
                    if (context.mounted) {
                      LiveLocationSheet.show(context);
                    }
                  },
                ),
                const SizedBox(height: 10),

                // 🔴 Level 4: Red — Emergency SOS
                _buildLevelCard(
                  context: context,
                  level: SafetyLevel.emergencySos,
                  isSelected: currentLevel == SafetyLevel.emergencySos,
                  badgeEmoji: '🔴',
                  title: 'Red — Emergency SOS',
                  subtitle: 'Emergency SMS, WhatsApp & 112 calling dispatch.',
                  accentColor: const Color(0xFFEF4444),
                  onTap: () {
                    Navigator.pop(context);
                    if (currentLevel == SafetyLevel.emergencySos) {
                      SosActiveSheet.show(context);
                    } else {
                      SosConfirmationDialog.show(context);
                    }
                  },
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildLevelCard({
    required BuildContext context,
    required SafetyLevel level,
    required bool isSelected,
    required String badgeEmoji,
    required String title,
    required String subtitle,
    required Color accentColor,
    required VoidCallback onTap,
  }) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: isSelected ? accentColor.withOpacity(0.12) : const Color(0x33FFFFFF),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: isSelected ? accentColor : POTheme.glassBorder,
              width: isSelected ? 1.5 : 1,
            ),
          ),
          child: Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: accentColor.withOpacity(0.15),
                  shape: BoxShape.circle,
                ),
                alignment: Alignment.center,
                child: Text(
                  badgeEmoji,
                  style: const TextStyle(fontSize: 20),
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(
                          title,
                          style: TextStyle(
                            color: isSelected ? accentColor : POTheme.cream,
                            fontWeight: FontWeight.w700,
                            fontSize: 15,
                          ),
                        ),
                        if (isSelected) ...[
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: accentColor.withOpacity(0.2),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(
                              'ACTIVE',
                              style: TextStyle(
                                color: accentColor,
                                fontSize: 10,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: 3),
                    Text(
                      subtitle,
                      style: const TextStyle(
                        color: POTheme.textMuted,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
              Icon(
                isSelected ? Icons.check_circle_rounded : Icons.arrow_forward_ios_rounded,
                color: isSelected ? accentColor : POTheme.textMuted,
                size: isSelected ? 22 : 14,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
