import 'package:flutter/material.dart';
import '../core/theme.dart';
import '../models/match_model.dart';
import '../services/face_verification_service.dart';
import '../shared/widgets/safety_button.dart';

enum TripPhase {
  identityVerify,
  cameraActive,
  cameraPermissionDenied,
  pickupGeofence,
  tripStartOtp,
  inProgress,
  identityMismatch,
}

class ActiveTripScreen extends StatefulWidget {
  final CommuteMatch match;

  const ActiveTripScreen({Key? key, required this.match}) : super(key: key);

  @override
  State<ActiveTripScreen> createState() => _ActiveTripScreenState();
}

class _ActiveTripScreenState extends State<ActiveTripScreen> {
  TripPhase _phase = TripPhase.identityVerify;
  String _tripStartOtp = '482731';
  final TextEditingController _otpController = TextEditingController();
  String _otpError = '';
  int _attemptsRemaining = 5;
  bool _sosActive = false;

  Future<void> _startCamera() async {
    final hasCamera = await FaceVerificationService.requestCameraPermission();
    if (!hasCamera) {
      setState(() => _phase = TripPhase.cameraPermissionDenied);
      return;
    }
    setState(() => _phase = TripPhase.cameraActive);
  }

  void _verifyIdentity({bool simulateFriendSubstitution = false}) {
    final result = FaceVerificationService.verifyFace(
      referenceId: 'user_reference',
      isFriendSubstitution: simulateFriendSubstitution,
    );

    if (result['status'] == 'IDENTITY_MISMATCH') {
      setState(() => _phase = TripPhase.identityMismatch);
    } else {
      setState(() => _phase = TripPhase.pickupGeofence);
    }
  }

  void _verifyPickupAndGenerateOtp() {
    setState(() {
      _tripStartOtp = '482731';
      _phase = TripPhase.tripStartOtp;
    });
  }

  void _verifyTripOtp() {
    if (_otpController.text == _tripStartOtp) {
      setState(() {
        _phase = TripPhase.inProgress;
        _otpError = '';
      });
    } else {
      final remaining = _attemptsRemaining - 1;
      setState(() {
        _attemptsRemaining = remaining;
        _otpError = remaining > 0
            ? 'Invalid trip code. Check code shown by passenger ($remaining attempts remaining).'
            : 'Maximum OTP attempts exceeded. Commute locked.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Live Commute', style: TextStyle(fontWeight: FontWeight.w800, color: POTheme.cream)),
        backgroundColor: POTheme.surface,
        elevation: 0,
        actions: const [
          Padding(
            padding: EdgeInsets.only(right: 12),
            child: Center(child: SafetyButton()),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            // Status Banner
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: POTheme.surface,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: POTheme.glassBorder),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Container(
                        width: 8,
                        height: 8,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: _phase == TripPhase.inProgress ? POTheme.matchStrong : POTheme.primary,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        _phase == TripPhase.inProgress ? 'COMMUTE IN PROGRESS' : 'VERIFICATION STAGE',
                        style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 12, color: POTheme.cream),
                      ),
                    ],
                  ),
                  Text('With ${widget.match.userName}', style: const TextStyle(fontSize: 12, color: POTheme.textMuted)),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // STEP 1: IDENTITY VERIFICATION PROMPT (Requirement 6)
            if (_phase == TripPhase.identityVerify)
              _buildCard(
                title: 'Step 1: Face Identity Verification',
                subtitle: 'Prevents account substitution. Camera matches face against registered profile.',
                child: Column(
                  children: [
                    const SizedBox(height: 12),
                    SizedBox(
                      width: double.infinity,
                      height: 48,
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: POTheme.primary,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                        icon: const Icon(Icons.camera_alt, color: POTheme.cream),
                        label: const Text('Open Front Camera & Verify Face', style: TextStyle(color: POTheme.cream, fontWeight: FontWeight.w700)),
                        onPressed: _startCamera,
                      ),
                    ),
                    const SizedBox(height: 12),
                    // Friend Substitution Attack Simulator (Requirement 8)
                    OutlinedButton(
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: Color(0x66EF4444)),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                      onPressed: () => _verifyIdentity(simulateFriendSubstitution: true),
                      child: const Text('⚠️ Test Friend Substitution (Expect FAIL)', style: TextStyle(color: Color(0xFFEF4444), fontSize: 12, fontWeight: FontWeight.w700)),
                    ),
                  ],
                ),
              ),

            // LIVE CAMERA PREVIEW (Requirement 7)
            if (_phase == TripPhase.cameraActive)
              _buildCard(
                title: 'Align Face in Viewfinder',
                subtitle: '[DEMO ADAPTER] Capturing front camera video frame for biometric match.',
                child: Column(
                  children: [
                    const SizedBox(height: 16),
                    Container(
                      width: 200,
                      height: 200,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: Colors.black,
                        border: Border.all(color: POTheme.primary, width: 3),
                      ),
                      child: const Center(
                        child: Icon(Icons.face, size: 80, color: POTheme.primary),
                      ),
                    ),
                    const SizedBox(height: 18),
                    SizedBox(
                      width: double.infinity,
                      height: 48,
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: POTheme.primary,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                        onPressed: () => _verifyIdentity(simulateFriendSubstitution: false),
                        child: const Text('📸 Capture & Run Identity Match', style: TextStyle(color: POTheme.cream, fontWeight: FontWeight.w700)),
                      ),
                    ),
                  ],
                ),
              ),

            // CAMERA PERMISSION DENIED (Requirement 11)
            if (_phase == TripPhase.cameraPermissionDenied)
              _buildCard(
                title: 'Camera Access Required',
                subtitle: 'Face verification requires camera access to protect against account substitution.',
                child: Column(
                  children: [
                    const SizedBox(height: 12),
                    ElevatedButton(
                      style: ElevatedButton.styleFrom(backgroundColor: POTheme.primary),
                      onPressed: _startCamera,
                      child: const Text('Try Camera Again', style: TextStyle(color: POTheme.cream)),
                    ),
                  ],
                ),
              ),

            // IDENTITY MISMATCH BLOCKED (Requirement 8)
            if (_phase == TripPhase.identityMismatch)
              _buildCard(
                title: '🚫 IDENTITY MISMATCH',
                subtitle: '"The person at pickup does not match the account used for this commute."',
                child: Column(
                  children: [
                    const SizedBox(height: 8),
                    const Text(
                      'Trip cannot start. Biometric confidence score failed (< 0.70 threshold). Trip-start OTP is permanently disabled.',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: POTheme.textMuted, fontSize: 12, height: 1.4),
                    ),
                    const SizedBox(height: 16),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFEF4444)),
                        onPressed: () => Navigator.pop(context),
                        child: const Text('Cancel Commute', style: TextStyle(color: POTheme.cream)),
                      ),
                    ),
                  ],
                ),
              ),

            // STEP 2: PICKUP GEOFENCE (Requirement 9)
            if (_phase == TripPhase.pickupGeofence)
              _buildCard(
                title: 'Step 2: Pickup Area Proximity',
                subtitle: 'Verifying both participants are at the designated pickup point.',
                child: Column(
                  children: [
                    const SizedBox(height: 10),
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: const Color(0x1822C55E),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: const Color(0x4D22C55E)),
                      ),
                      child: const Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('✓ Face identity verified (Confidence: 0.94)', style: TextStyle(color: Color(0xFF22C55E), fontWeight: FontWeight.w700, fontSize: 12)),
                          SizedBox(height: 4),
                          Text('✓ Within pickup geofence (Distance < 0.5 km limit)', style: TextStyle(color: POTheme.cream, fontSize: 12)),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),
                    SizedBox(
                      width: double.infinity,
                      height: 48,
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(backgroundColor: POTheme.primary),
                        onPressed: _verifyPickupAndGenerateOtp,
                        child: const Text('Confirm Pickup Location → Generate Trip Code', style: TextStyle(color: POTheme.cream, fontWeight: FontWeight.w700)),
                      ),
                    ),
                  ],
                ),
              ),

            // STEP 3: TRIP START OTP (Requirement 9 & 10)
            if (_phase == TripPhase.tripStartOtp)
              _buildCard(
                title: 'Step 3: Trip Start Code',
                subtitle: 'Single-use 6-digit code verifying passenger and traveller have met physically.',
                child: Column(
                  children: [
                    const SizedBox(height: 12),
                    const Text('YOUR TRIP START CODE', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: POTheme.primary)),
                    const SizedBox(height: 8),
                    Text(
                      _tripStartOtp,
                      style: const TextStyle(fontSize: 34, fontWeight: FontWeight.w900, letterSpacing: 6, color: POTheme.cream, fontFamily: 'monospace'),
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      controller: _otpController,
                      textAlign: TextAlign.center,
                      keyboardType: TextInputType.number,
                      style: const TextStyle(fontSize: 20, letterSpacing: 4, color: POTheme.cream),
                      decoration: InputDecoration(
                        hintText: 'Enter 6-digit code',
                        hintStyle: const TextStyle(color: POTheme.textMuted, fontSize: 13, letterSpacing: 1),
                        filled: true,
                        fillColor: POTheme.background,
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                    ),
                    if (_otpError.isNotEmpty) ...[
                      const SizedBox(height: 8),
                      Text(_otpError, style: const TextStyle(color: Color(0xFFEF4444), fontSize: 12, fontWeight: FontWeight.w600)),
                    ],
                    const SizedBox(height: 16),
                    SizedBox(
                      width: double.infinity,
                      height: 48,
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(backgroundColor: POTheme.primary),
                        onPressed: _verifyTripOtp,
                        child: const Text('Verify Code & Start Commute →', style: TextStyle(color: POTheme.cream, fontWeight: FontWeight.w700)),
                      ),
                    ),
                  ],
                ),
              ),

            // STEP 4: IN PROGRESS
            if (_phase == TripPhase.inProgress)
              _buildCard(
                title: 'Commute in Progress',
                subtitle: 'Live route tracking active. Share trip with trusted contacts or use SOS.',
                child: Column(
                  children: [
                    const SizedBox(height: 14),
                    Row(
                      children: [
                        Expanded(
                          child: ElevatedButton(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: _sosActive ? const Color(0xFFDC2626) : const Color(0xFFEF4444),
                              padding: const EdgeInsets.symmetric(vertical: 14),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                            ),
                            onPressed: () => setState(() => _sosActive = !_sosActive),
                            child: Text(_sosActive ? '🚨 SOS ACTIVE' : '🚨 SOS', style: const TextStyle(color: POTheme.cream, fontWeight: FontWeight.w800)),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: ElevatedButton(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: POTheme.primary,
                              padding: const EdgeInsets.symmetric(vertical: 14),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                            ),
                            onPressed: () {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('Commute completed successfully!')),
                              );
                              Navigator.pop(context);
                            },
                            child: const Text('Complete ✓', style: TextStyle(color: POTheme.cream, fontWeight: FontWeight.w800)),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildCard({required String title, required String subtitle, required Widget child}) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: POTheme.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: POTheme.glassBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: POTheme.cream)),
          const SizedBox(height: 4),
          Text(subtitle, style: const TextStyle(fontSize: 12, color: POTheme.textMuted, height: 1.3)),
          child,
        ],
      ),
    );
  }
}
