import 'dart:ui';
import 'package:flutter/material.dart';
import '../../core/theme.dart';
import '../../models/safety_model.dart';
import '../../services/safety_service.dart';

// ==========================================
// CONFIRMATION SCREEN (Requirement: Show before activation)
// ==========================================
class SosConfirmationDialog extends StatelessWidget {
  const SosConfirmationDialog({Key? key}) : super(key: key);

  static void show(BuildContext context) {
    showDialog(
      context: context,
      barrierDismissible: true,
      builder: (ctx) => const SosConfirmationDialog(),
    );
  }

  @override
  Widget build(BuildContext context) {
    final activeJourney = SafetyService.instance.currentJourney;
    final contacts = SafetyService.instance.selectedContacts;

    return BackdropFilter(
      filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
      child: Dialog(
        backgroundColor: Colors.transparent,
        insetPadding: const EdgeInsets.symmetric(horizontal: 20),
        child: Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: const Color(0xF21C0B0B),
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: const Color(0xFFEF4444), width: 2),
            boxShadow: [
              BoxShadow(
                color: Colors.red.withOpacity(0.3),
                blurRadius: 30,
                spreadRadius: 4,
              ),
            ],
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 64,
                height: 64,
                decoration: const BoxDecoration(
                  color: Color(0x33EF4444),
                  shape: BoxShape.circle,
                ),
                alignment: Alignment.center,
                child: const Text('🚨', style: TextStyle(fontSize: 32)),
              ),
              const SizedBox(height: 16),
              const Text(
                'CONFIRM EMERGENCY SOS',
                style: TextStyle(
                  color: Color(0xFFEF4444),
                  fontSize: 18,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 0.5,
                ),
              ),
              const SizedBox(height: 10),
              const Text(
                'Are you in immediate danger? Activating SOS will immediately execute the following emergency actions:',
                textAlign: TextAlign.center,
                style: TextStyle(color: POTheme.cream, fontSize: 13, height: 1.4),
              ),
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0x22FFFFFF),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: POTheme.glassBorder),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _bullet('📍 Lock high-precision GPS coordinates & maps link'),
                    _bullet('📱 Dispatch emergency SMS to ${contacts.length} emergency contacts'),
                    _bullet('💬 Open WhatsApp emergency alert link'),
                    _bullet('📞 Prepare direct 112 emergency phone call'),
                    if (activeJourney != null)
                      _bullet('🗺️ Attach active commute details (${activeJourney.destination})'),
                  ],
                ),
              ),
              const SizedBox(height: 20),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => Navigator.pop(context),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: POTheme.cream,
                        side: BorderSide(color: POTheme.glassBorder),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      child: const Text('Cancel', style: TextStyle(fontWeight: FontWeight.w600)),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton(
                      onPressed: () async {
                        Navigator.pop(context);
                        await SafetyService.instance.triggerEmergencySos();
                        if (context.mounted) {
                          SosActiveSheet.show(context);
                        }
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFFEF4444),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      child: const Text(
                        'ACTIVATE SOS',
                        style: TextStyle(fontWeight: FontWeight.w900, letterSpacing: 0.5),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _bullet(String text) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Text(
        text,
        style: const TextStyle(color: POTheme.cream, fontSize: 12, height: 1.3),
      ),
    );
  }
}

// ==========================================
// ACTIVE SOS DASHBOARD (Requirement: SOS ACTIVE + Report)
// ==========================================
class SosActiveSheet extends StatelessWidget {
  const SosActiveSheet({Key? key}) : super(key: key);

  static void show(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (ctx) => const SosActiveSheet(),
    );
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: SafetyService.instance,
      builder: (context, _) {
        final reports = SafetyService.instance.sosReports;
        final journey = SafetyService.instance.currentJourney;
        final contacts = SafetyService.instance.selectedContacts;

        return BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 16, sigmaY: 16),
          child: Container(
            height: MediaQuery.of(context).size.height * 0.88,
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 28),
            decoration: BoxDecoration(
              color: const Color(0xF21C0B0B),
              borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
              border: Border.all(color: const Color(0xFFEF4444), width: 1.5),
            ),
            child: SingleChildScrollView(
              child: Column(
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

                  // SOS ACTIVE HEADER
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: const Color(0x33EF4444),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: const Color(0xFFEF4444)),
                    ),
                    child: Row(
                      children: [
                        const Text('🚨', style: TextStyle(fontSize: 26)),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: const [
                              Text(
                                'SOS ACTIVE — ALERT BROADCAST',
                                style: TextStyle(
                                  color: Color(0xFFEF4444),
                                  fontSize: 15,
                                  fontWeight: FontWeight.w900,
                                  letterSpacing: 0.5,
                                ),
                              ),
                              SizedBox(height: 2),
                              Text(
                                'Live emergency coordinates dispatched to contacts.',
                                style: TextStyle(color: POTheme.cream, fontSize: 11),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Call Emergency Buttons
                  Row(
                    children: [
                      Expanded(
                        child: ElevatedButton.icon(
                          onPressed: () => SafetyService.instance.makePhoneCall('112'),
                          icon: const Icon(Icons.call_rounded, size: 18),
                          label: const Text('CALL 112 NOW', style: TextStyle(fontWeight: FontWeight.w900)),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFFDC2626),
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                        ),
                      ),
                      if (contacts.isNotEmpty) ...[
                        const SizedBox(width: 10),
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: () => SafetyService.instance.makePhoneCall(contacts.first.phone),
                            icon: const Icon(Icons.phone_in_talk_rounded, size: 18),
                            label: Text(
                              'CALL ${contacts.first.name.split(' ').first.toUpperCase()}',
                              style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 12),
                              overflow: TextOverflow.ellipsis,
                            ),
                            style: OutlinedButton.styleFrom(
                              foregroundColor: POTheme.cream,
                              side: const BorderSide(color: Color(0xFFEF4444)),
                              padding: const EdgeInsets.symmetric(vertical: 14),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Active Journey Summary if attached
                  if (journey != null) ...[
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: const Color(0x22FFFFFF),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: POTheme.glassBorder),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('ATTACHED JOURNEY DETAILS', style: TextStyle(color: Color(0xFFEAB308), fontSize: 11, fontWeight: FontWeight.bold)),
                          const SizedBox(height: 4),
                          Text('${journey.startLocation} → ${journey.destination}', style: const TextStyle(color: POTheme.cream, fontWeight: FontWeight.bold, fontSize: 13)),
                          Text('With: ${journey.companions} (${journey.transport})', style: const TextStyle(color: POTheme.textMuted, fontSize: 12)),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],

                  // DELIVERY STATUS AUDIT LOG
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: const [
                      Text(
                        'DISPATCH AUDIT & DELIVERY STATUS',
                        style: TextStyle(
                          color: POTheme.textMuted,
                          fontSize: 12,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 0.5,
                        ),
                      ),
                      Text(
                        'REAL STATUS',
                        style: TextStyle(color: Colors.white38, fontSize: 10, fontWeight: FontWeight.w700),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),

                  ...reports.map((r) => Container(
                        margin: const EdgeInsets.only(bottom: 8),
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: const Color(0x22FFFFFF),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: POTheme.glassBorder),
                        ),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              r.channel.contains('SMS') ? '📱' : (r.channel.contains('WhatsApp') ? '💬' : (r.channel.contains('GPS') ? '📍' : '📞')),
                              style: const TextStyle(fontSize: 18),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Text(
                                        r.channel,
                                        style: const TextStyle(color: POTheme.cream, fontWeight: FontWeight.w700, fontSize: 13),
                                      ),
                                      _statusBadge(r.status),
                                    ],
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    r.target,
                                    style: const TextStyle(color: POTheme.textMuted, fontSize: 11, fontWeight: FontWeight.w600),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    r.detail,
                                    style: const TextStyle(color: Colors.white70, fontSize: 11),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      )),

                  const SizedBox(height: 20),

                  // De-escalation button
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton(
                      onPressed: () async {
                        await SafetyService.instance.setSafe();
                        if (context.mounted) {
                          Navigator.pop(context);
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('🟢 SOS De-escalated. Status returned to Safe.'),
                              backgroundColor: Color(0xFF1B5E20),
                            ),
                          );
                        }
                      },
                      style: OutlinedButton.styleFrom(
                        foregroundColor: const Color(0xFF22C55E),
                        side: const BorderSide(color: Color(0xFF22C55E)),
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      ),
                      child: const Text(
                        'I Am Safe Now — Cancel SOS',
                        style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _statusBadge(DispatchStatus status) {
    Color bg;
    Color fg;
    String label;

    switch (status) {
      case DispatchStatus.sent:
        bg = const Color(0x3322C55E);
        fg = const Color(0xFF22C55E);
        label = '✓ SENT';
        break;
      case DispatchStatus.requiresUserAction:
        bg = const Color(0x33F97316);
        fg = const Color(0xFFF97316);
        label = 'ACTION READY';
        break;
      case DispatchStatus.failed:
        bg = const Color(0x33EF4444);
        fg = const Color(0xFFEF4444);
        label = 'FAILED';
        break;
      case DispatchStatus.pending:
        bg = const Color(0x33EAB308);
        fg = const Color(0xFFEAB308);
        label = 'PENDING';
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        label,
        style: TextStyle(color: fg, fontSize: 9, fontWeight: FontWeight.w900),
      ),
    );
  }
}
