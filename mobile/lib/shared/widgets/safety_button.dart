import 'package:flutter/material.dart';
import '../../core/theme.dart';
import '../../models/safety_model.dart';
import '../../services/safety_service.dart';
import '../../screens/safety/safety_modal.dart';

class SafetyButton extends StatelessWidget {
  const SafetyButton({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: SafetyService.instance,
      builder: (context, _) {
        final level = SafetyService.instance.level;
        return _buildPill(context, level);
      },
    );
  }

  Widget _buildPill(BuildContext context, SafetyLevel level) {
    Color bgColor;
    Color borderColor;
    Color dotColor;
    String label;
    IconData icon;

    switch (level) {
      case SafetyLevel.safe:
        bgColor = const Color(0x1F22C55E);
        borderColor = const Color(0x4D22C55E);
        dotColor = const Color(0xFF22C55E);
        label = 'Safe';
        icon = Icons.keyboard_arrow_down_rounded;
        break;
      case SafetyLevel.journey:
        bgColor = const Color(0x26EAB308);
        borderColor = const Color(0x66EAB308);
        dotColor = const Color(0xFFEAB308);
        label = 'Journey';
        icon = Icons.keyboard_arrow_down_rounded;
        break;
      case SafetyLevel.liveLocation:
        bgColor = const Color(0x2BF97316);
        borderColor = const Color(0x80F97316);
        dotColor = const Color(0xFFF97316);
        label = 'Live GPS';
        icon = Icons.keyboard_arrow_down_rounded;
        break;
      case SafetyLevel.emergencySos:
        bgColor = const Color(0x3DEF4444);
        borderColor = const Color(0xFFEF4444);
        dotColor = const Color(0xFFEF4444);
        label = 'SOS ACTIVE';
        icon = Icons.warning_amber_rounded;
        break;
    }

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () => SafetyModal.show(context),
        borderRadius: BorderRadius.circular(20),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
          decoration: BoxDecoration(
            color: bgColor,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: borderColor, width: 1.2),
            boxShadow: level == SafetyLevel.emergencySos
                ? [
                    BoxShadow(
                      color: Colors.red.withOpacity(0.4),
                      blurRadius: 10,
                      spreadRadius: 2,
                    ),
                  ]
                : null,
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 8,
                height: 8,
                decoration: BoxDecoration(
                  color: dotColor,
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: 6),
              Text(
                label,
                style: TextStyle(
                  color: POTheme.cream,
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.2,
                ),
              ),
              const SizedBox(width: 4),
              Icon(icon, color: POTheme.cream, size: 16),
            ],
          ),
        ),
      ),
    );
  }
}
