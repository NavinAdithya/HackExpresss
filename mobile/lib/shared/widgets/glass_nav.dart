import 'dart:ui';
import 'package:flutter/material.dart';
import '../../core/theme.dart';

class POGlassNav extends StatelessWidget {
  final int currentIndex;
  final ValueChanged<int> onTabSelected;
  final VoidCallback onPlusPressed;

  const POGlassNav({
    Key? key,
    required this.currentIndex,
    required this.onTabSelected,
    required this.onPlusPressed,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(left: 16, right: 16, bottom: 20),
      height: 70,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(35),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.5),
            blurRadius: 20,
            offset: const Offset(0, 8),
          ),
          BoxShadow(
            color: POTheme.primary.withOpacity(0.15),
            blurRadius: 15,
            spreadRadius: 1,
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(35),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 16, sigmaY: 16),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 10),
            decoration: BoxDecoration(
              color: const Color(0xE6141414),
              borderRadius: BorderRadius.circular(35),
              border: Border.all(color: POTheme.glassBorder, width: 1.2),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _buildNavItem(
                  index: 0,
                  icon: Icons.home_rounded,
                  label: 'Home',
                ),
                _buildNavItem(
                  index: 1,
                  icon: Icons.commute_rounded,
                  label: 'Trips',
                ),
                // Central Elevated Glowing + Action Button
                GestureDetector(
                  onTap: onPlusPressed,
                  child: Container(
                    width: 52,
                    height: 52,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: const LinearGradient(
                        colors: [POTheme.primary, POTheme.brightOrange],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: POTheme.primary.withOpacity(0.55),
                          blurRadius: 16,
                          spreadRadius: 2,
                          offset: const Offset(0, 3),
                        ),
                      ],
                      border: Border.all(color: POTheme.cream.withOpacity(0.6), width: 1.5),
                    ),
                    child: const Icon(
                      Icons.add_rounded,
                      color: POTheme.cream,
                      size: 30,
                    ),
                  ),
                ),
                _buildNavItem(
                  index: 2,
                  icon: Icons.workspace_premium_rounded,
                  label: 'Plans',
                ),
                _buildNavItem(
                  index: 3,
                  icon: Icons.person_rounded,
                  label: 'Profile',
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildNavItem({
    required int index,
    required IconData icon,
    required String label,
  }) {
    final isSelected = currentIndex == index;
    return GestureDetector(
      onTap: () => onTabSelected(index),
      behavior: HitTestBehavior.opaque,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            padding: const EdgeInsets.all(6),
            decoration: BoxDecoration(
              color: isSelected ? POTheme.primary.withOpacity(0.2) : Colors.transparent,
              shape: BoxShape.circle,
            ),
            child: Icon(
              icon,
              color: isSelected ? POTheme.primary : POTheme.textMuted,
              size: 22,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: TextStyle(
              fontSize: 11,
              fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
              color: isSelected ? POTheme.cream : POTheme.textMuted,
            ),
          ),
        ],
      ),
    );
  }
}
