import 'package:intl/intl.dart';

enum SafetyLevel {
  safe,
  journey,
  liveLocation,
  emergencySos,
}

extension SafetyLevelExtension on SafetyLevel {
  String get displayName {
    switch (this) {
      case SafetyLevel.safe:
        return 'Safe';
      case SafetyLevel.journey:
        return 'Journey';
      case SafetyLevel.liveLocation:
        return 'Live Location';
      case SafetyLevel.emergencySos:
        return 'Emergency SOS';
    }
  }

  String get shortLabel {
    switch (this) {
      case SafetyLevel.safe:
        return 'Safe';
      case SafetyLevel.journey:
        return 'Journey';
      case SafetyLevel.liveLocation:
        return 'Live GPS';
      case SafetyLevel.emergencySos:
        return 'SOS ACTIVE';
    }
  }

  String get emoji {
    switch (this) {
      case SafetyLevel.safe:
        return '🟢';
      case SafetyLevel.journey:
        return '🟡';
      case SafetyLevel.liveLocation:
        return '🟠';
      case SafetyLevel.emergencySos:
        return '🔴';
    }
  }
}

class EmergencyContact {
  final String id;
  final String name;
  final String phone;
  final String relation;
  bool isSelected;

  EmergencyContact({
    required this.id,
    required this.name,
    required this.phone,
    required this.relation,
    this.isSelected = true,
  });

  EmergencyContact copyWith({
    String? id,
    String? name,
    String? phone,
    String? relation,
    bool? isSelected,
  }) {
    return EmergencyContact(
      id: id ?? this.id,
      name: name ?? this.name,
      phone: phone ?? this.phone,
      relation: relation ?? this.relation,
      isSelected: isSelected ?? this.isSelected,
    );
  }

  static List<EmergencyContact> defaultContacts() {
    return [
      EmergencyContact(
        id: 'contact_1',
        name: 'Amma / Mom',
        phone: '+919840123456',
        relation: 'Family',
        isSelected: true,
      ),
      EmergencyContact(
        id: 'contact_2',
        name: 'Rohan Sharma',
        phone: '+919840234567',
        relation: 'Roommate / Colleague',
        isSelected: true,
      ),
      EmergencyContact(
        id: 'contact_3',
        name: 'Priya Raman',
        phone: '+919840345678',
        relation: 'Sister',
        isSelected: false,
      ),
    ];
  }
}

class JourneyPlan {
  final String startLocation;
  final String destination;
  final DateTime startTime;
  final DateTime expectedArrival;
  final String route;
  final String transport;
  final String companions;
  final String mapsLink;
  final bool isCompleted;

  JourneyPlan({
    required this.startLocation,
    required this.destination,
    required this.startTime,
    required this.expectedArrival,
    required this.route,
    required this.transport,
    required this.companions,
    required this.mapsLink,
    this.isCompleted = false,
  });

  /// Formats the journey details as specified in prompt:
  /// 🟡 Journey Started
  /// 📍 Start: [Location]
  /// 🏁 Destination: [Destination]
  /// 🕐 Start: [Time]
  /// ⏰ ETA: [Time]
  /// 👥 With: [People]
  /// 🗺️ Route: [Maps Link]
  String formatDispatchMessage() {
    final timeFormat = DateFormat('hh:mm a');
    return '''🟡 Journey Started
📍 Start: $startLocation
🏁 Destination: $destination
🕐 Start: ${timeFormat.format(startTime)}
⏰ ETA: ${timeFormat.format(expectedArrival)}
👥 With: $companions ($transport)
🗺️ Route: $mapsLink''';
  }
}

class LiveLocationData {
  final double latitude;
  final double longitude;
  final String address;
  final DateTime timestamp;
  final int batteryPercentage;
  final int updateCount;
  final bool isSharing;

  LiveLocationData({
    required this.latitude,
    required this.longitude,
    required this.address,
    required this.timestamp,
    required this.batteryPercentage,
    required this.updateCount,
    required this.isSharing,
  });

  String get mapsUrl => 'https://maps.google.com/?q=$latitude,$longitude';

  String formatShareMessage() {
    final timeFormat = DateFormat('hh:mm:ss a');
    return '''🟠 Live Location Active
📍 Location: $address
🌐 Coordinates: ${latitude.toStringAsFixed(5)}, ${longitude.toStringAsFixed(5)}
🕐 Timestamp: ${timeFormat.format(timestamp)}
🔋 Battery: $batteryPercentage%
🗺️ Live Map: $mapsUrl
🔄 Location Update #$updateCount''';
  }
}

enum DispatchStatus {
  pending,
  sent,
  requiresUserAction,
  failed,
}

class SosDispatchReport {
  final String channel; // 'SMS', 'WhatsApp', 'Phone Call', 'GPS Lock'
  final String target;  // Contact name or number
  final DispatchStatus status;
  final String detail;
  final DateTime timestamp;

  SosDispatchReport({
    required this.channel,
    required this.target,
    required this.status,
    required this.detail,
    required this.timestamp,
  });

  String get statusBadge {
    switch (status) {
      case DispatchStatus.sent:
        return '✓ SENT';
      case DispatchStatus.requiresUserAction:
        return 'ACTION REQUIRED';
      case DispatchStatus.failed:
        return 'FAILED';
      case DispatchStatus.pending:
        return 'SENDING...';
    }
  }
}
