import 'package:flutter/material.dart';
import '../core/theme.dart';

class CommuteMatch {
  final String id;
  final String userName;
  final String transportMode;
  final double finalScore;
  final double routeOverlap;
  final double detourKm;
  final double destinationGapKm;
  final double fuelContribution;
  final String matchType;
  final String explanation;
  final bool isFallback;

  CommuteMatch({
    required this.id,
    required this.userName,
    required this.transportMode,
    required this.finalScore,
    required this.routeOverlap,
    required this.detourKm,
    required this.destinationGapKm,
    required this.fuelContribution,
    required this.matchType,
    required this.explanation,
    this.isFallback = false,
  });

  // Honest Match Quality Tiers (Requirement 2)
  String get qualityLabel {
    if (finalScore >= 90) return 'Excellent match';
    if (finalScore >= 80) return 'Strong match';
    if (finalScore >= 60) return 'Compatible commute';
    if (finalScore >= 40) return 'Weak compatibility';
    return 'Not suitable';
  }

  Color get qualityColor {
    if (finalScore >= 80) return POTheme.matchExcellent;
    if (finalScore >= 60) return POTheme.primary;
    if (finalScore >= 40) return POTheme.matchWeak;
    return POTheme.matchNotSuitable;
  }
}
