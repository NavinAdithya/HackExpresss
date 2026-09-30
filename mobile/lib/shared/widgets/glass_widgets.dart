import 'dart:ui';
import 'package:flutter/material.dart';
import '../../core/theme.dart';

/// Reusable Liquid Glass Card with blur, thin border, and subtle orange glow
class POGlassCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry padding;
  final EdgeInsetsGeometry? margin;
  final double borderRadius;
  final bool hasGlow;
  final Color? borderColor;
  final VoidCallback? onTap;

  const POGlassCard({
    Key? key,
    required this.child,
    this.padding = const EdgeInsets.all(16.0),
    this.margin,
    this.borderRadius = 20.0,
    this.hasGlow = false,
    this.borderColor,
    this.onTap,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    Widget content = ClipRRect(
      borderRadius: BorderRadius.circular(borderRadius),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
        child: Container(
          padding: padding,
          decoration: BoxDecoration(
            color: const Color(0xCC141414),
            borderRadius: BorderRadius.circular(borderRadius),
            border: Border.all(
              color: borderColor ?? (hasGlow ? POTheme.primary.withOpacity(0.5) : POTheme.glassBorder),
              width: hasGlow ? 1.5 : 1.0,
            ),
            boxShadow: hasGlow
                ? [
                    BoxShadow(
                      color: POTheme.primary.withOpacity(0.2),
                      blurRadius: 16,
                      spreadRadius: 2,
                    ),
                  ]
                : [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.4),
                      blurRadius: 10,
                      offset: const Offset(0, 4),
                    ),
                  ],
          ),
          child: child,
        ),
      ),
    );

    if (onTap != null) {
      return Container(
        margin: margin,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(borderRadius),
          child: content,
        ),
      );
    }

    if (margin != null) {
      return Container(margin: margin, child: content);
    }
    return content;
  }
}

/// Primary PO → PO Electric Orange Button with glowing accent and smooth tactile feel
class POGlassButton extends StatelessWidget {
  final String label;
  final IconData? icon;
  final VoidCallback? onPressed;
  final bool isSecondary;
  final bool isLoading;
  final double height;
  final double? width;

  const POGlassButton({
    Key? key,
    required this.label,
    this.icon,
    required this.onPressed,
    this.isSecondary = false,
    this.isLoading = false,
    this.height = 52.0,
    this.width,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Container(
      width: width ?? double.infinity,
      height: height,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        gradient: isSecondary
            ? null
            : const LinearGradient(
                colors: [POTheme.primary, POTheme.brightOrange],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
        color: isSecondary ? const Color(0x33FFFFFF) : null,
        border: isSecondary
            ? Border.all(color: POTheme.glassBorder)
            : Border.all(color: POTheme.brightOrange.withOpacity(0.8), width: 1.2),
        boxShadow: isSecondary
            ? []
            : [
                BoxShadow(
                  color: POTheme.primary.withOpacity(0.35),
                  blurRadius: 16,
                  offset: const Offset(0, 4),
                ),
              ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: isLoading ? null : onPressed,
          borderRadius: BorderRadius.circular(16),
          child: Center(
            child: isLoading
                ? const SizedBox(
                    width: 22,
                    height: 22,
                    child: CircularProgressIndicator(
                      strokeWidth: 2.5,
                      valueColor: AlwaysStoppedAnimation<Color>(POTheme.cream),
                    ),
                  )
                : Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (icon != null) ...[
                        Icon(icon, color: POTheme.cream, size: 20),
                        const SizedBox(width: 8),
                      ],
                      Text(
                        label,
                        style: const TextStyle(
                          color: POTheme.cream,
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 0.3,
                        ),
                      ),
                    ],
                  ),
          ),
        ),
      ),
    );
  }
}

/// Pill badge for plan tags, verification status, and fuel contribution chips
class POGlassPill extends StatelessWidget {
  final String text;
  final IconData? icon;
  final Color? color;
  final Color? textColor;
  final VoidCallback? onTap;

  const POGlassPill({
    Key? key,
    required this.text,
    this.icon,
    this.color,
    this.textColor,
    this.onTap,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final effectiveColor = color ?? POTheme.primary;
    final content = Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: effectiveColor.withOpacity(0.16),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: effectiveColor.withOpacity(0.4), width: 1),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 14, color: textColor ?? effectiveColor),
            const SizedBox(width: 4),
          ],
          Text(
            text,
            style: TextStyle(
              color: textColor ?? effectiveColor,
              fontSize: 12,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.2,
            ),
          ),
        ],
      ),
    );

    if (onTap != null) {
      return InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(20),
        child: content,
      );
    }
    return content;
  }
}

/// Mandatory Segmented Glass Switch: [ Find a Ride ] [ Share My Commute ]
class POGlassSegment extends StatelessWidget {
  final int selectedIndex;
  final ValueChanged<int> onSegmentChanged;

  const POGlassSegment({
    Key? key,
    required this.selectedIndex,
    required this.onSegmentChanged,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 52,
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: const Color(0xCC1A1A1A),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: POTheme.glassBorder),
      ),
      child: Row(
        children: [
          Expanded(
            child: _buildSegmentButton(
              index: 0,
              title: 'Find a Ride',
              icon: Icons.search_rounded,
              isSelected: selectedIndex == 0,
            ),
          ),
          const SizedBox(width: 4),
          Expanded(
            child: _buildSegmentButton(
              index: 1,
              title: 'Share My Commute',
              icon: Icons.alt_route_rounded,
              isSelected: selectedIndex == 1,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSegmentButton({
    required int index,
    required String title,
    required IconData icon,
    required bool isSelected,
  }) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 220),
      curve: Curves.easeInOut,
      decoration: BoxDecoration(
        gradient: isSelected
            ? const LinearGradient(
                colors: [POTheme.primary, POTheme.brightOrange],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              )
            : null,
        color: isSelected ? null : Colors.transparent,
        borderRadius: BorderRadius.circular(12),
        boxShadow: isSelected
            ? [
                BoxShadow(
                  color: POTheme.primary.withOpacity(0.35),
                  blurRadius: 10,
                  offset: const Offset(0, 2),
                ),
              ]
            : [],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () => onSegmentChanged(index),
          borderRadius: BorderRadius.circular(12),
          child: Center(
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  icon,
                  size: 16,
                  color: isSelected ? POTheme.cream : POTheme.textMuted,
                ),
                const SizedBox(width: 6),
                Text(
                  title,
                  style: TextStyle(
                    color: isSelected ? POTheme.cream : POTheme.textMuted,
                    fontSize: 13,
                    fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
