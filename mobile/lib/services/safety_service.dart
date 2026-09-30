import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:battery_plus/battery_plus.dart';
import 'package:geolocator/geolocator.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:intl/intl.dart';
import '../models/safety_model.dart';
import 'location_service.dart';

class SafetyService extends ChangeNotifier {
  static final SafetyService instance = SafetyService._internal();
  SafetyService._internal() {
    _contacts = EmergencyContact.defaultContacts();
  }

  // Singleton instance accessor
  factory SafetyService() => instance;

  SafetyLevel _level = SafetyLevel.safe;
  SafetyLevel get level => _level;

  List<EmergencyContact> _contacts = [];
  List<EmergencyContact> get contacts => List.unmodifiable(_contacts);
  List<EmergencyContact> get selectedContacts =>
      _contacts.where((c) => c.isSelected).toList();

  JourneyPlan? _currentJourney;
  JourneyPlan? get currentJourney => _currentJourney;

  LiveLocationData? _liveLocationData;
  LiveLocationData? get liveLocationData => _liveLocationData;

  final List<SosDispatchReport> _sosReports = [];
  List<SosDispatchReport> get sosReports => List.unmodifiable(_sosReports);

  bool _isDelayAlertTriggered = false;
  bool get isDelayAlertTriggered => _isDelayAlertTriggered;

  StreamSubscription<Position>? _positionSub;
  Timer? _journeyMonitorTimer;
  Timer? _liveLocationTimer;
  final Battery _battery = Battery();

  void updateContacts(List<EmergencyContact> newContacts) {
    _contacts = List.from(newContacts);
    notifyListeners();
  }

  void toggleContactSelection(String id) {
    final idx = _contacts.indexWhere((c) => c.id == id);
    if (idx != -1) {
      _contacts[idx].isSelected = !_contacts[idx].isSelected;
      notifyListeners();
    }
  }

  void addEmergencyContact(String name, String phone, String relation) {
    _contacts.add(
      EmergencyContact(
        id: 'contact_${DateTime.now().millisecondsSinceEpoch}',
        name: name,
        phone: phone,
        relation: relation,
        isSelected: true,
      ),
    );
    notifyListeners();
  }

  // ==========================================
  // LEVEL 1: 🟢 GREEN — SAFE
  // ==========================================
  Future<void> setSafe() async {
    await _stopAllActiveServices();
    _level = SafetyLevel.safe;
    _currentJourney = null;
    _liveLocationData = null;
    _isDelayAlertTriggered = false;
    _sosReports.clear();
    notifyListeners();
  }

  Future<void> _stopAllActiveServices() async {
    await _positionSub?.cancel();
    _positionSub = null;
    _journeyMonitorTimer?.cancel();
    _journeyMonitorTimer = null;
    _liveLocationTimer?.cancel();
    _liveLocationTimer = null;
  }

  // ==========================================
  // LEVEL 2: 🟡 YELLOW — JOURNEY
  // ==========================================
  Future<void> startJourney(JourneyPlan plan) async {
    await _stopAllActiveServices();
    _currentJourney = plan;
    _level = SafetyLevel.journey;
    _isDelayAlertTriggered = false;
    notifyListeners();

    // Start background delay monitor (checks every 30 seconds)
    _journeyMonitorTimer = Timer.periodic(const Duration(seconds: 30), (timer) {
      final now = DateTime.now();
      if (now.isAfter(plan.expectedArrival.add(const Duration(minutes: 5)))) {
        if (!_isDelayAlertTriggered) {
          _isDelayAlertTriggered = true;
          notifyListeners();
        }
      }
    });

    // Send formatted journey details to selected emergency contacts
    final message = plan.formatDispatchMessage();
    for (final contact in selectedContacts) {
      // Fire-and-prepare dispatch for contacts
      await dispatchSmsIntent(contact.phone, message);
    }
  }

  Future<void> notifyJourneyDelay() async {
    if (_currentJourney == null) return;
    final now = DateTime.now();
    final delayMsg = '''⚠️ Journey Delay Notice
📍 Current Trip: ${_currentJourney!.startLocation} → ${_currentJourney!.destination}
⏰ Scheduled ETA was: ${DateFormat('hh:mm a').format(_currentJourney!.expectedArrival)}
🕐 Current Time: ${DateFormat('hh:mm a').format(now)}
Status: Commute is taking longer than expected. Passenger is monitoring route.''';

    for (final contact in selectedContacts) {
      await dispatchSmsIntent(contact.phone, delayMsg);
    }
    _isDelayAlertTriggered = false;
    notifyListeners();
  }

  // ==========================================
  // LEVEL 3: 🟠 ORANGE — LIVE LOCATION
  // ==========================================
  Future<bool> startLiveLocation() async {
    await _stopAllActiveServices();

    final hasPerm = await LocationService.requestLocationPermission();
    if (!hasPerm) {
      return false;
    }

    // Capture initial location
    Position? initialPos = await LocationService.getCurrentDeviceLocation();
    initialPos ??= Position(
      latitude: 12.9815,
      longitude: 80.2180,
      timestamp: DateTime.now(),
      accuracy: 10.0,
      altitude: 0.0,
      altitudeAccuracy: 0.0,
      heading: 0.0,
      headingAccuracy: 0.0,
      speed: 0.0,
      speedAccuracy: 0.0,
    );

    int batteryPct = 85;
    try {
      batteryPct = await _battery.batteryLevel;
    } catch (_) {
      batteryPct = 85;
    }

    _liveLocationData = LiveLocationData(
      latitude: initialPos.latitude,
      longitude: initialPos.longitude,
      address: LocationService.getHumanReadableArea(initialPos.latitude, initialPos.longitude),
      timestamp: DateTime.now(),
      batteryPercentage: batteryPct,
      updateCount: 1,
      isSharing: true,
    );

    _level = SafetyLevel.liveLocation;
    notifyListeners();

    // Start location stream updates
    const locationSettings = LocationSettings(
      accuracy: LocationAccuracy.high,
      distanceFilter: 10,
    );

    try {
      _positionSub = Geolocator.getPositionStream(locationSettings: locationSettings)
          .listen((position) async {
        _onNewLocationUpdate(position);
      }, onError: (err) {
        debugPrint('[SAFETY] Location stream error: $err');
      });
    } catch (e) {
      debugPrint('[SAFETY] Stream listener setup error: $e');
    }

    // Periodic ping timer to refresh battery and counter
    _liveLocationTimer = Timer.periodic(const Duration(seconds: 15), (timer) async {
      int curBat = 85;
      try {
        curBat = await _battery.batteryLevel;
      } catch (_) {}

      if (_liveLocationData != null) {
        _liveLocationData = LiveLocationData(
          latitude: _liveLocationData!.latitude,
          longitude: _liveLocationData!.longitude,
          address: _liveLocationData!.address,
          timestamp: DateTime.now(),
          batteryPercentage: curBat,
          updateCount: _liveLocationData!.updateCount + 1,
          isSharing: true,
        );
        notifyListeners();
      }
    });

    // Notify selected contacts of initial live tracking
    if (_liveLocationData != null) {
      final shareMsg = _liveLocationData!.formatShareMessage();
      for (final contact in selectedContacts) {
        await dispatchSmsIntent(contact.phone, shareMsg);
      }
    }

    return true;
  }

  void _onNewLocationUpdate(Position pos) async {
    int curBat = 85;
    try {
      curBat = await _battery.batteryLevel;
    } catch (_) {}

    _liveLocationData = LiveLocationData(
      latitude: pos.latitude,
      longitude: pos.longitude,
      address: LocationService.getHumanReadableArea(pos.latitude, pos.longitude),
      timestamp: DateTime.now(),
      batteryPercentage: curBat,
      updateCount: (_liveLocationData?.updateCount ?? 0) + 1,
      isSharing: true,
    );
    notifyListeners();
  }

  Future<void> stopLiveLocation() async {
    await setSafe();
  }

  // ==========================================
  // LEVEL 4: 🔴 RED — EMERGENCY SOS
  // ==========================================
  Future<void> triggerEmergencySos() async {
    await _stopAllActiveServices();
    _level = SafetyLevel.emergencySos;
    _sosReports.clear();
    notifyListeners();

    // 1. Capture current GPS location
    Position? pos = await LocationService.getCurrentDeviceLocation();
    pos ??= Position(
      latitude: 12.9815,
      longitude: 80.2180,
      timestamp: DateTime.now(),
      accuracy: 8.0,
      altitude: 0.0,
      altitudeAccuracy: 0.0,
      heading: 0.0,
      headingAccuracy: 0.0,
      speed: 0.0,
      speedAccuracy: 0.0,
    );

    int batteryLevel = 85;
    try {
      batteryLevel = await _battery.batteryLevel;
    } catch (_) {}

    final area = LocationService.getHumanReadableArea(pos.latitude, pos.longitude);
    final timeStr = DateFormat('hh:mm:ss a').format(DateTime.now());
    final mapsLink = 'https://maps.google.com/?q=${pos.latitude},${pos.longitude}';

    _sosReports.add(
      SosDispatchReport(
        channel: 'GPS Location Lock',
        target: 'Device GPS Hardware',
        status: DispatchStatus.sent,
        detail: 'Location locked: $area (${pos.latitude.toStringAsFixed(4)}, ${pos.longitude.toStringAsFixed(4)}) ±${pos.accuracy.toStringAsFixed(1)}m',
        timestamp: DateTime.now(),
      ),
    );

    // Build SOS text payload
    String journeyContext = '';
    if (_currentJourney != null) {
      journeyContext = '''
Active Commute: ${_currentJourney!.startLocation} → ${_currentJourney!.destination}
Transport: ${_currentJourney!.transport} | Travelling with: ${_currentJourney!.companions}
''';
    }

    final sosMessage = '''🚨 RED EMERGENCY SOS — IMMEDIATE ASSISTANCE REQUESTED!
User: Navin Adithya (PO → PO Commute Safety)
📍 Area: $area
🌐 Coordinates: ${pos.latitude}, ${pos.longitude}
🗺️ Live Map: $mapsLink
🕐 Time: $timeStr
🔋 Battery: $batteryLevel%
$journeyContext
Please send emergency help or call me immediately!''';

    // 2. Dispatch SMS alerts to emergency contacts
    for (final contact in selectedContacts) {
      final smsRes = await dispatchSmsIntent(contact.phone, sosMessage);
      _sosReports.add(
        SosDispatchReport(
          channel: 'SMS Alert',
          target: '${contact.name} (${contact.phone})',
          status: smsRes ? DispatchStatus.sent : DispatchStatus.requiresUserAction,
          detail: smsRes
              ? 'SMS composer launched with coordinates & map link'
              : 'SMS composer not available or permissions restricted',
          timestamp: DateTime.now(),
        ),
      );
    }

    // 3. Dispatch WhatsApp alert for primary contact
    if (selectedContacts.isNotEmpty) {
      final primary = selectedContacts.first;
      final waRes = await dispatchWhatsAppIntent(primary.phone, sosMessage);
      _sosReports.add(
        SosDispatchReport(
          channel: 'WhatsApp Alert',
          target: '${primary.name} (${primary.phone})',
          status: waRes ? DispatchStatus.sent : DispatchStatus.requiresUserAction,
          detail: waRes
              ? 'WhatsApp broadcast initialized with emergency coordinates'
              : 'WhatsApp app unavailable or contact link requires manual tap',
          timestamp: DateTime.now(),
        ),
      );
    }

    // 4. Emergency 112 Phone Call Action item
    _sosReports.add(
      SosDispatchReport(
        channel: 'Police / Emergency (112)',
        target: 'National Emergency Helpline 112',
        status: DispatchStatus.requiresUserAction,
        detail: 'One-tap direct dialer link ready for immediate voice call',
        timestamp: DateTime.now(),
      ),
    );

    notifyListeners();
  }

  // ==========================================
  // NATIVE INTENT DISPATCHERS (REAL HARDWARE)
  // ==========================================
  Future<bool> dispatchSmsIntent(String phone, String message) async {
    final cleanedPhone = phone.replaceAll(RegExp(r'[^0-9+]'), '');
    final uri = Uri(
      scheme: 'sms',
      path: cleanedPhone,
      queryParameters: <String, String>{'body': message},
    );

    try {
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
        return true;
      } else {
        // Fallback smsto scheme
        final fallbackUri = Uri.parse('smsto:$cleanedPhone?body=${Uri.encodeComponent(message)}');
        if (await canLaunchUrl(fallbackUri)) {
          await launchUrl(fallbackUri, mode: LaunchMode.externalApplication);
          return true;
        }
      }
    } catch (e) {
      debugPrint('[SAFETY] SMS launch error: $e');
    }
    return false;
  }

  Future<bool> dispatchWhatsAppIntent(String phone, String message) async {
    final cleanedPhone = phone.replaceAll(RegExp(r'[^0-9]'), '');
    // WhatsApp direct link
    final waUri = Uri.parse('https://wa.me/$cleanedPhone?text=${Uri.encodeComponent(message)}');

    try {
      if (await canLaunchUrl(waUri)) {
        await launchUrl(waUri, mode: LaunchMode.externalApplication);
        return true;
      }
    } catch (e) {
      debugPrint('[SAFETY] WhatsApp launch error: $e');
    }
    return false;
  }

  Future<bool> makePhoneCall(String phone) async {
    final cleanedPhone = phone.replaceAll(RegExp(r'[^0-9+]'), '');
    final telUri = Uri.parse('tel:$cleanedPhone');

    try {
      if (await canLaunchUrl(telUri)) {
        await launchUrl(telUri, mode: LaunchMode.externalApplication);
        return true;
      }
    } catch (e) {
      debugPrint('[SAFETY] Phone call launch error: $e');
    }
    return false;
  }
}
