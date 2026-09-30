import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../core/theme.dart';
import '../../models/safety_model.dart';
import '../../services/safety_service.dart';
import '../../services/location_service.dart';

class JourneySetupSheet extends StatefulWidget {
  const JourneySetupSheet({Key? key}) : super(key: key);

  static void show(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (ctx) => const JourneySetupSheet(),
    );
  }

  @override
  State<JourneySetupSheet> createState() => _JourneySetupSheetState();
}

class _JourneySetupSheetState extends State<JourneySetupSheet> {
  final _startLocationCtrl = TextEditingController(text: 'Velachery, Chennai');
  final _destinationCtrl = TextEditingController(text: 'Guindy, Chennai');
  final _routeCtrl = TextEditingController(text: 'via Velachery 100ft Rd / Inner Ring Rd');
  final _companionsCtrl = TextEditingController(text: 'Riding with Karthik (TN 09 AB 1234)');

  final DateTime _startTime = DateTime.now();
  DateTime _expectedArrival = DateTime.now().add(const Duration(minutes: 25));
  String _transportMode = '🏍️ BIKE';

  final List<String> _transportModes = ['🏍️ BIKE', '🚗 CAR', '🚌 TRANSIT', '🚶 WALK'];
  final List<String> _quickDestinations = ['Guindy', 'Velachery', 'T. Nagar', 'OMR Sholinganallur', 'DLF Porur'];

  @override
  void initState() {
    super.initState();
    _fetchLiveStartLocation();
  }

  Future<void> _fetchLiveStartLocation() async {
    final pos = await LocationService.getCurrentDeviceLocation();
    if (pos != null && mounted) {
      setState(() {
        _startLocationCtrl.text = LocationService.getHumanReadableArea(pos.latitude, pos.longitude);
      });
    }
  }

  @override
  void dispose() {
    _startLocationCtrl.dispose();
    _destinationCtrl.dispose();
    _routeCtrl.dispose();
    _companionsCtrl.dispose();
    super.dispose();
  }

  void _onStartJourney() async {
    final mapsLink = 'https://maps.google.com/?q=${Uri.encodeComponent(_destinationCtrl.text.trim())}';

    final plan = JourneyPlan(
      startLocation: _startLocationCtrl.text.trim(),
      destination: _destinationCtrl.text.trim(),
      startTime: _startTime,
      expectedArrival: _expectedArrival,
      route: _routeCtrl.text.trim(),
      transport: _transportMode,
      companions: _companionsCtrl.text.trim(),
      mapsLink: mapsLink,
    );

    await SafetyService.instance.startJourney(plan);

    if (mounted) {
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('🟡 Journey Started! Details sent to ${SafetyService.instance.selectedContacts.length} contacts.'),
          backgroundColor: const Color(0xFF854D0E),
          duration: const Duration(seconds: 3),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: SafetyService.instance,
      builder: (context, _) {
        final activeJourney = SafetyService.instance.currentJourney;
        if (activeJourney != null) {
          return _buildActiveJourneyView(activeJourney);
        }
        return _buildSetupForm();
      },
    );
  }

  Widget _buildActiveJourneyView(JourneyPlan journey) {
    final timeFormat = DateFormat('hh:mm a');
    final isDelayed = SafetyService.instance.isDelayAlertTriggered;

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
                    Text('🟡', style: TextStyle(fontSize: 22)),
                    SizedBox(width: 10),
                    Text(
                      'JOURNEY IN PROGRESS',
                      style: TextStyle(
                        color: Color(0xFFEAB308),
                        fontSize: 17,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 0.3,
                      ),
                    ),
                  ],
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: const Color(0x33EAB308),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: const Color(0x66EAB308)),
                  ),
                  child: const Text(
                    'MONITORED',
                    style: TextStyle(color: Color(0xFFEAB308), fontSize: 11, fontWeight: FontWeight.w800),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),

            if (isDelayed) ...[
              Container(
                padding: const EdgeInsets.all(12),
                margin: const EdgeInsets.only(bottom: 14),
                decoration: BoxDecoration(
                  color: const Color(0x33EF4444),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.red),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.timer_off_rounded, color: Colors.redAccent, size: 22),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: const [
                          Text('Delay Alert: Past Expected ETA', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
                          Text('Commute has exceeded expected arrival time.', style: TextStyle(color: Colors.white70, fontSize: 11)),
                        ],
                      ),
                    ),
                    ElevatedButton(
                      style: ElevatedButton.styleFrom(backgroundColor: Colors.red, visualDensity: VisualDensity.compact),
                      onPressed: () => SafetyService.instance.notifyJourneyDelay(),
                      child: const Text('Alert Contacts', style: TextStyle(fontSize: 11)),
                    ),
                  ],
                ),
              ),
            ],

            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0x22FFFFFF),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: POTheme.glassBorder),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _infoRow('📍 Start', journey.startLocation),
                  const Divider(color: Colors.white12, height: 16),
                  _infoRow('🏁 Destination', journey.destination),
                  const Divider(color: Colors.white12, height: 16),
                  _infoRow('🕐 Start Time', timeFormat.format(journey.startTime)),
                  const Divider(color: Colors.white12, height: 16),
                  _infoRow('⏰ Expected Arrival', timeFormat.format(journey.expectedArrival)),
                  const Divider(color: Colors.white12, height: 16),
                  _infoRow('👥 Travelling With', '${journey.companions} (${journey.transport})'),
                  const Divider(color: Colors.white12, height: 16),
                  _infoRow('🗺️ Route Details', journey.route),
                ],
              ),
            ),
            const SizedBox(height: 18),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => SafetyService.instance.notifyJourneyDelay(),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: const Color(0xFFEAB308),
                      side: const BorderSide(color: Color(0xFFEAB308)),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: const Text('Notify Delay', style: TextStyle(fontWeight: FontWeight.w700)),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton(
                    onPressed: () async {
                      await SafetyService.instance.setSafe();
                      if (!mounted) return;
                      Navigator.pop(context);
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('🟢 Arrived Safely! Safety status reset to Safe.'),
                          backgroundColor: Color(0xFF1B5E20),
                        ),
                      );
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF22C55E),
                      foregroundColor: Colors.black,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: const Text('Arrived Safely ✓', style: TextStyle(fontWeight: FontWeight.w800)),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSetupForm() {
    final timeFormat = DateFormat('hh:mm a');
    final selectedContacts = SafetyService.instance.selectedContacts;

    final previewMsg = '''🟡 Journey Started
📍 Start: ${_startLocationCtrl.text}
🏁 Destination: ${_destinationCtrl.text}
🕐 Start: ${timeFormat.format(_startTime)}
⏰ ETA: ${timeFormat.format(_expectedArrival)}
👥 With: ${_companionsCtrl.text} ($_transportMode)
🗺️ Route: https://maps.google.com/?q=${Uri.encodeComponent(_destinationCtrl.text)}''';

    return BackdropFilter(
      filter: ImageFilter.blur(sigmaX: 16, sigmaY: 16),
      child: Container(
        height: MediaQuery.of(context).size.height * 0.88,
        padding: EdgeInsets.only(
          left: 20,
          right: 20,
          top: 16,
          bottom: MediaQuery.of(context).viewInsets.bottom + 20,
        ),
        decoration: BoxDecoration(
          color: const Color(0xF2141414),
          borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
          border: Border.all(color: POTheme.glassBorder),
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
              Row(
                children: const [
                  Text('🟡', style: TextStyle(fontSize: 22)),
                  SizedBox(width: 10),
                  Text(
                    'Plan Commute Journey',
                    style: TextStyle(
                      color: POTheme.cream,
                      fontSize: 18,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              const Text(
                'Record departure details, monitor progress, and notify emergency contacts.',
                style: TextStyle(color: POTheme.textMuted, fontSize: 13),
              ),
              const SizedBox(height: 16),

              // Starting Location
              _fieldLabel('STARTING LOCATION'),
              TextField(
                controller: _startLocationCtrl,
                style: const TextStyle(color: POTheme.cream, fontSize: 14),
                decoration: _inputDecoration('e.g. Velachery, Chennai', Icons.my_location_rounded),
                onChanged: (_) => setState(() {}),
              ),
              const SizedBox(height: 12),

              // Destination
              _fieldLabel('DESTINATION'),
              TextField(
                controller: _destinationCtrl,
                style: const TextStyle(color: POTheme.cream, fontSize: 14),
                decoration: _inputDecoration('e.g. Guindy, Chennai', Icons.location_on_rounded),
                onChanged: (_) => setState(() {}),
              ),
              const SizedBox(height: 8),

              // Quick Destination Chips
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: _quickDestinations.map((dest) {
                    return Padding(
                      padding: const EdgeInsets.only(right: 6),
                      child: ActionChip(
                        label: Text(dest, style: const TextStyle(fontSize: 11, color: POTheme.cream)),
                        backgroundColor: const Color(0x22FFFFFF),
                        side: BorderSide(color: _destinationCtrl.text.contains(dest) ? const Color(0xFFEAB308) : POTheme.glassBorder),
                        onPressed: () {
                          setState(() {
                            _destinationCtrl.text = '$dest, Chennai';
                          });
                        },
                      ),
                    );
                  }).toList(),
                ),
              ),
              const SizedBox(height: 14),

              // Transport Mode
              _fieldLabel('TRANSPORT MODE'),
              Row(
                children: _transportModes.map((mode) {
                  final isSelected = _transportMode == mode;
                  return Expanded(
                    child: GestureDetector(
                      onTap: () => setState(() => _transportMode = mode),
                      child: Container(
                        margin: const EdgeInsets.symmetric(horizontal: 3),
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        decoration: BoxDecoration(
                          color: isSelected ? const Color(0x33EAB308) : const Color(0x1AFFFFFF),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(
                            color: isSelected ? const Color(0xFFEAB308) : POTheme.glassBorder,
                          ),
                        ),
                        alignment: Alignment.center,
                        child: Text(
                          mode,
                          style: TextStyle(
                            color: isSelected ? const Color(0xFFEAB308) : POTheme.cream,
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
              const SizedBox(height: 14),

              // Time & ETA
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _fieldLabel('DEPARTURE TIME'),
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: const Color(0x22FFFFFF),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: POTheme.glassBorder),
                          ),
                          child: Text(
                            timeFormat.format(_startTime),
                            style: const TextStyle(color: POTheme.cream, fontWeight: FontWeight.bold),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _fieldLabel('EXPECTED ARRIVAL (ETA)'),
                        InkWell(
                          onTap: () async {
                            final pickedTime = await showTimePicker(
                              context: context,
                              initialTime: TimeOfDay.fromDateTime(_expectedArrival),
                            );
                            if (pickedTime != null) {
                              final now = DateTime.now();
                              setState(() {
                                _expectedArrival = DateTime(
                                  now.year,
                                  now.month,
                                  now.day,
                                  pickedTime.hour,
                                  pickedTime.minute,
                                );
                              });
                            }
                          },
                          child: Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: const Color(0x22FFFFFF),
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(color: const Color(0x66EAB308)),
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  timeFormat.format(_expectedArrival),
                                  style: const TextStyle(color: Color(0xFFEAB308), fontWeight: FontWeight.bold),
                                ),
                                const Icon(Icons.edit_calendar_rounded, color: Color(0xFFEAB308), size: 16),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),

              // Route
              _fieldLabel('ROUTE'),
              TextField(
                controller: _routeCtrl,
                style: const TextStyle(color: POTheme.cream, fontSize: 14),
                decoration: _inputDecoration('e.g. via 100ft Bypass Rd', Icons.alt_route_rounded),
                onChanged: (_) => setState(() {}),
              ),
              const SizedBox(height: 14),

              // Companions
              _fieldLabel('PEOPLE TRAVELLING WITH YOU'),
              TextField(
                controller: _companionsCtrl,
                style: const TextStyle(color: POTheme.cream, fontSize: 14),
                decoration: _inputDecoration('e.g. Riding with Karthik (TN 09 AB 1234) or Solo', Icons.group_rounded),
                onChanged: (_) => setState(() {}),
              ),
              const SizedBox(height: 16),

              // Message Preview Box
              _fieldLabel('DISPATCH MESSAGE PREVIEW (SENT TO CONTACTS)'),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0x1AEAB308),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0x4DEAB308)),
                ),
                child: Text(
                  previewMsg,
                  style: const TextStyle(
                    color: Color(0xFFFEF08A),
                    fontSize: 12,
                    fontFamily: 'monospace',
                    height: 1.4,
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // Emergency Contacts Indicator
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Recipients: ${selectedContacts.length} contacts selected',
                    style: const TextStyle(color: POTheme.textMuted, fontSize: 12, fontWeight: FontWeight.w600),
                  ),
                  Text(
                    selectedContacts.map((c) => c.name.split(' ').first).join(', '),
                    style: const TextStyle(color: Color(0xFFEAB308), fontSize: 12, fontWeight: FontWeight.w700),
                  ),
                ],
              ),
              const SizedBox(height: 20),

              // Action button
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _onStartJourney,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFEAB308),
                    foregroundColor: Colors.black,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                  child: const Text(
                    'Start Journey & Notify Contacts →',
                    style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _fieldLabel(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Text(
        text,
        style: const TextStyle(
          color: POTheme.textMuted,
          fontSize: 11,
          fontWeight: FontWeight.w700,
          letterSpacing: 0.5,
        ),
      ),
    );
  }

  InputDecoration _inputDecoration(String hint, IconData icon) {
    return InputDecoration(
      prefixIcon: Icon(icon, color: POTheme.textMuted, size: 18),
      hintText: hint,
      hintStyle: const TextStyle(color: Colors.white24, fontSize: 13),
      filled: true,
      fillColor: const Color(0x22FFFFFF),
      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: BorderSide(color: POTheme.glassBorder),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: BorderSide(color: POTheme.glassBorder),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: Color(0xFFEAB308)),
      ),
    );
  }

  Widget _infoRow(String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: const TextStyle(color: POTheme.textMuted, fontSize: 13, fontWeight: FontWeight.w600)),
        Flexible(
          child: Text(
            value,
            textAlign: TextAlign.right,
            style: const TextStyle(color: POTheme.cream, fontSize: 13, fontWeight: FontWeight.w700),
          ),
        ),
      ],
    );
  }
}
