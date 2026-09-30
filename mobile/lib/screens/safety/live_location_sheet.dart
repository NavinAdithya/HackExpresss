import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../core/theme.dart';
import '../../services/safety_service.dart';

class LiveLocationSheet extends StatelessWidget {
  const LiveLocationSheet({Key? key}) : super(key: key);

  static void show(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (ctx) => const LiveLocationSheet(),
    );
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: SafetyService.instance,
      builder: (context, _) {
        final liveData = SafetyService.instance.liveLocationData;
        final selectedContacts = SafetyService.instance.selectedContacts;

        return BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 16, sigmaY: 16),
          child: Container(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
            decoration: BoxDecoration(
              color: const Color(0xF2141414),
              borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
              border: Border.all(color: const Color(0x66F97316)),
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFFF97316).withOpacity(0.15),
                  blurRadius: 24,
                  spreadRadius: 2,
                ),
              ],
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

                // Pulsing Live Indicator Header
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Container(
                          width: 12,
                          height: 12,
                          decoration: const BoxDecoration(
                            color: Color(0xFFF97316),
                            shape: BoxShape.circle,
                            boxShadow: [
                              BoxShadow(
                                color: Color(0xFFF97316),
                                blurRadius: 8,
                                spreadRadius: 2,
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 10),
                        const Text(
                          'LIVE LOCATION ACTIVE',
                          style: TextStyle(
                            color: Color(0xFFF97316),
                            fontSize: 17,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 0.5,
                          ),
                        ),
                      ],
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: const Color(0x33F97316),
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(color: const Color(0x66F97316)),
                      ),
                      child: Text(
                        'PING #${liveData?.updateCount ?? 1}',
                        style: const TextStyle(
                          color: Color(0xFFF97316),
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                const Text(
                  'Continuous real-time GPS broadcast with emergency contacts.',
                  style: TextStyle(color: POTheme.textMuted, fontSize: 13),
                ),
                const SizedBox(height: 20),

                // Real-Time Telemetry Data Box
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: const Color(0x22FFFFFF),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: POTheme.glassBorder),
                  ),
                  child: Column(
                    children: [
                      // Location Area
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Icon(Icons.location_on_rounded, color: Color(0xFFF97316), size: 22),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text('LIVE GPS LOCATION', style: TextStyle(color: POTheme.textMuted, fontSize: 11, fontWeight: FontWeight.w700)),
                                const SizedBox(height: 2),
                                Text(
                                  liveData?.address ?? 'Velachery, Chennai',
                                  style: const TextStyle(color: POTheme.cream, fontSize: 15, fontWeight: FontWeight.w800),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const Divider(color: Colors.white12, height: 20),

                      // Coordinates & Battery
                      Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text('COORDINATES', style: TextStyle(color: POTheme.textMuted, fontSize: 11, fontWeight: FontWeight.w700)),
                                const SizedBox(height: 2),
                                Text(
                                  liveData != null
                                      ? '${liveData.latitude.toStringAsFixed(4)}, ${liveData.longitude.toStringAsFixed(4)}'
                                      : '12.9815, 80.2180',
                                  style: const TextStyle(color: POTheme.cream, fontSize: 13, fontFamily: 'monospace', fontWeight: FontWeight.w700),
                                ),
                              ],
                            ),
                          ),
                          Container(width: 1, height: 32, color: Colors.white12),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text('PHONE BATTERY', style: TextStyle(color: POTheme.textMuted, fontSize: 11, fontWeight: FontWeight.w700)),
                                const SizedBox(height: 2),
                                Row(
                                  children: [
                                    Icon(
                                      Icons.battery_charging_full_rounded,
                                      color: (liveData?.batteryPercentage ?? 85) > 20 ? const Color(0xFF22C55E) : Colors.red,
                                      size: 16,
                                    ),
                                    const SizedBox(width: 4),
                                    Text(
                                      '${liveData?.batteryPercentage ?? 85}%',
                                      style: const TextStyle(color: POTheme.cream, fontSize: 13, fontWeight: FontWeight.w800),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const Divider(color: Colors.white12, height: 20),

                      // Timestamp & Updates
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('LAST UPDATE TIMESTAMP', style: TextStyle(color: POTheme.textMuted, fontSize: 11, fontWeight: FontWeight.w700)),
                              const SizedBox(height: 2),
                              Text(
                                liveData != null ? DateFormat('hh:mm:ss a').format(liveData.timestamp) : 'Just now',
                                style: const TextStyle(color: POTheme.cream, fontSize: 13, fontWeight: FontWeight.w600),
                              ),
                            ],
                          ),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              const Text('FREQUENCY', style: TextStyle(color: POTheme.textMuted, fontSize: 11, fontWeight: FontWeight.w700)),
                              const SizedBox(height: 2),
                              const Text('Every 15s / 10m', style: TextStyle(color: Color(0xFFF97316), fontSize: 13, fontWeight: FontWeight.w700)),
                            ],
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 14),

                // Maps Link Box
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  decoration: BoxDecoration(
                    color: const Color(0x1AF97316),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0x4DF97316)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.link_rounded, color: Color(0xFFF97316), size: 20),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          liveData?.mapsUrl ?? 'https://maps.google.com/?q=12.9815,80.2180',
                          style: const TextStyle(
                            color: Color(0xFFFED7AA),
                            fontSize: 12,
                            fontFamily: 'monospace',
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.share_rounded, color: Color(0xFFF97316), size: 18),
                        onPressed: () {
                          if (liveData != null && selectedContacts.isNotEmpty) {
                            SafetyService.instance.dispatchSmsIntent(
                              selectedContacts.first.phone,
                              liveData.formatShareMessage(),
                            );
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('Dispatched live coordinates to emergency contacts.')),
                            );
                          }
                        },
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 14),

                // Recipients summary
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Active Tracking Recipients:', style: TextStyle(color: POTheme.textMuted, fontSize: 12)),
                    Text(
                      '${selectedContacts.length} contacts (${selectedContacts.map((c) => c.name.split(' ').first).join(', ')})',
                      style: const TextStyle(color: Color(0xFFF97316), fontSize: 12, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
                const SizedBox(height: 22),

                // Action Buttons
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () {
                          if (liveData != null && selectedContacts.isNotEmpty) {
                            SafetyService.instance.dispatchWhatsAppIntent(
                              selectedContacts.first.phone,
                              liveData.formatShareMessage(),
                            );
                          }
                        },
                        icon: const Icon(Icons.send_rounded, size: 16),
                        label: const Text('Send Alert Now', style: TextStyle(fontWeight: FontWeight.w700)),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: const Color(0xFFF97316),
                          side: const BorderSide(color: Color(0xFFF97316)),
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: ElevatedButton(
                        onPressed: () async {
                          await SafetyService.instance.stopLiveLocation();
                          if (context.mounted) {
                            Navigator.pop(context);
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text('🟢 Live location sharing stopped. Status: Safe.'),
                                backgroundColor: Color(0xFF1B5E20),
                              ),
                            );
                          }
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFFEF4444),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        child: const Text('STOP SHARING', style: TextStyle(fontWeight: FontWeight.w900, letterSpacing: 0.5)),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
