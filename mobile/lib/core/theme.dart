import 'package:flutter/material.dart';

class POTheme {
  static const Color primary = Color(0xFFF63B03);
  static const Color brightOrange = Color(0xFFF73C06);
  static const Color cream = Color(0xFFFFF8E5);
  static const Color lightCream = Color(0xFFFBF6E2);
  static const Color dustPink = Color(0xFFE79E89);
  static const Color darkBrown = Color(0xFF4F1409);
  static const Color background = Color(0xFF0A0A0A);
  static const Color surface = Color(0xFF141414);
  static const Color glassBorder = Color(0x28FFF8E5);
  static const Color textMuted = Color(0xFFA3A3A3);

  // Honest Match Quality Colors (Requirement 2)
  static const Color matchExcellent = Color(0xFF22C55E);
  static const Color matchStrong = Color(0xFF10B981);
  static const Color matchCompatible = Color(0xFFF63B03);
  static const Color matchWeak = Color(0xFFF59E0B);
  static const Color matchNotSuitable = Color(0xFFEF4444);

  static ThemeData get darkTheme {
    return ThemeData(
      brightness: Brightness.dark,
      scaffoldBackgroundColor: background,
      primaryColor: primary,
      colorScheme: const ColorScheme.dark(
        primary: primary,
        secondary: dustPink,
        surface: surface,
      ),
      fontFamily: 'Inter',
      textTheme: const TextTheme(
        headlineMedium: TextStyle(color: cream, fontWeight: FontWeight.w800),
        bodyLarge: TextStyle(color: cream),
        bodyMedium: TextStyle(color: textMuted),
      ),
    );
  }
}
