import 'package:flutter/material.dart';
import '../../core/theme.dart';
import '../../models/safety_model.dart';
import '../../services/safety_service.dart';
import '../../screens/safety/journey_setup_sheet.dart';
import '../../screens/safety/live_location_sheet.dart';
import '../../screens/safety/sos_sheets.dart';

class ActiveSafetyBanner extends StatelessWidget {
  const ActiveSafetyBanner({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: SafetyService.instance,
      builder: (context, _) {
        final level = SafetyService.instance.level;
        if (level == SafetyLevel.safe) {
          return const SizedBox.shrink();
        }

        Color bgColor;
        Color borderColor;
        Color fgColor;
        String title;
        String subtitle;
        IconData icon;
        VoidCallback onTap;

        switch (level) {
          case SafetyLevel.journey:
            final journey = SafetyService.instance.currentJourney;
            bgColor = const Color(0x26EAB308);
            borderColor = const Color(0x66EAB308);
            fgColor = const Color(0xFFEAB308);
            title = '🟡 JOURNEY ACTIVE';
            subtitle = journey != null
                ? '${journey.startLocation} → ${journey.destination}'
                : 'Commute monitored with emergency contacts';
            icon = Icons.navigation_rounded;
            onTap = () => JourneySetupSheet.show(context);
            break;

          case SafetyLevel.liveLocation:
            final liveData = SafetyService.instance.liveLocationData;
            bgColor = const Color(0x2BF97316);
            borderColor = const Color(0x80F97316);
            fgColor = const Color(0xFFF97316);
            title = '🟠 LIVE GPS LOCATION SHARING';
            subtitle = liveData != null
                ? 'Ping #${liveData.updateCount} · Battery: ${liveData.batteryPercentage}% · ${liveData.address}'
                : 'Broadcasting live coordinates to contacts';
            icon = Icons.radar_rounded;
            onTap = () => LiveLocationSheet.show(context);
            break;

          case SafetyLevel.emergencySos:
            bgColor = const Color(0x3DEF4444);
            borderColor = const Color(0xFFEF4444);
            fgColor = const Color(0xFFEF4444);
            title = '🚨 SOS ACTIVE — BROADCASTING';
            subtitle = 'Emergency dispatch active. Tap to view audit log or call 112.';
            icon = Icons.warning_rounded;
            onTap = () => SosActiveSheet.show(context);
            break;

          case SafetyLevel.safe:
            return const SizedBox.shrink();
        }

        return Container(
          margin: const EdgeInsets.symmetric(horizontal: 20, vertical: 6),
          child: Material(
            color: Colors.transparent,
            child: InkWell(
              onTap: onTap,
              borderRadius: BorderRadius.circular(14),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                decoration: BoxDecoration(
                  color: bgColor,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: borderColor, width: 1.2),
                ),
                child: Row(
                  children: [
                    Icon(icon, color: fgColor, size: 22),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            title,
                            style: TextStyle(
                              color: fgColor,
                              fontSize: 12,
                              fontWeight: FontWeight.w900,
                              letterSpacing: 0.4,
                            ),
                          ),
                          const SizedBox(height: 1),
                          Text(
                            subtitle,
                            style: const TextStyle(color: POTheme.cream, fontSize: 11),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    ),
                    Icon(Icons.arrow_forward_ios_rounded, color: fgColor, size: 12),
                  ],
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}
