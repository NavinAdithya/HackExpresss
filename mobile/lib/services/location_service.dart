import 'package:geolocator/geolocator.dart';
import 'package:permission_handler/permission_handler.dart';

class LocationService {
  static Future<bool> requestLocationPermission() async {
    try {
      final status = await Permission.locationWhenInUse.request();
      return status.isGranted;
    } catch (_) {
      return true;
    }
  }

  static Future<Position?> getCurrentDeviceLocation() async {
    final hasPermission = await requestLocationPermission();
    if (!hasPermission) return null;

    try {
      return await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
        timeLimit: const Duration(seconds: 10),
      );
    } catch (e) {
      return null;
    }
  }

  static String getHumanReadableArea(double lat, double lng) {
    // Proximity to known Chennai hubs
    if ((lat - 12.9815).abs() < 0.02 && (lng - 80.2180).abs() < 0.02) {
      return 'Velachery, Chennai';
    }
    if ((lat - 13.0067).abs() < 0.02 && (lng - 80.2080).abs() < 0.02) {
      return 'Guindy, Chennai';
    }
    if ((lat - 13.0418).abs() < 0.02 && (lng - 80.2341).abs() < 0.02) {
      return 'T. Nagar, Chennai';
    }
    if ((lat - 12.9010).abs() < 0.03 && (lng - 80.2279).abs() < 0.03) {
      return 'OMR Sholinganallur, Chennai';
    }
    return 'Chennai, Tamil Nadu';
  }
}
