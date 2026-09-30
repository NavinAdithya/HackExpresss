import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import '../core/theme.dart';
import '../models/profile_model.dart';
import '../services/location_service.dart';
import '../shared/widgets/glass_widgets.dart';
import '../shared/widgets/glass_nav.dart';
import '../shared/widgets/safety_button.dart';
import '../shared/widgets/active_safety_banner.dart';
import 'find_ride_screen.dart';
import 'share_commute_screen.dart';
import 'trips_screen.dart';
import 'plans_screen.dart';
import 'profile_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({Key? key}) : super(key: key);

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _currentNavIndex = 0;
  int _activeSegmentIndex = 0; // 0: Find a Ride, 1: Share My Commute
  bool _womenOnlyActive = false;
  String _currentLocationName = 'Detecting location...';
  LatLng _deviceLatLng = const LatLng(12.9815, 80.2180); // Default Velachery, Chennai
  bool _hasLocationPermission = false;
  final UserProfile _user = UserProfile.defaultProfile();

  final List<String> _quickDestinations = [
    'Guindy',
    'Velachery',
    'T. Nagar',
    'OMR Sholinganallur',
    'DLF Porur',
    'Tidel Park',
  ];

  @override
  void initState() {
    super.initState();
    _initDeviceLocation();
  }

  Future<void> _initDeviceLocation() async {
    final hasPerm = await LocationService.requestLocationPermission();
    if (!mounted) return;

    if (hasPerm) {
      final pos = await LocationService.getCurrentDeviceLocation();
      if (!mounted) return;
      if (pos != null) {
        setState(() {
          _hasLocationPermission = true;
          _deviceLatLng = LatLng(pos.latitude, pos.longitude);
          _currentLocationName = LocationService.getHumanReadableArea(pos.latitude, pos.longitude);
        });
      } else {
        setState(() {
          _hasLocationPermission = true;
          _currentLocationName = 'Velachery, Chennai';
        });
      }
    } else {
      setState(() {
        _hasLocationPermission = false;
        _currentLocationName = 'Velachery, Chennai (Manual)';
      });
    }
  }

  void _openPlusActionSheet() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (ctx) => BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 16, sigmaY: 16),
        child: Container(
          padding: const EdgeInsets.all(24),
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
                  width: 48,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Colors.white24,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 20),
              Row(
                children: [
                  Image.asset(
                    'assets/branding/po_to_po_logo_mark.png',
                    width: 28,
                    height: 28,
                    errorBuilder: (context, error, stackTrace) =>
                        const Icon(Icons.navigation_rounded, color: POTheme.primary, size: 24),
                  ),
                  const SizedBox(width: 10),
                  const Text(
                    'Start Your Commute',
                    style: TextStyle(
                      color: POTheme.cream,
                      fontSize: 18,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              const Text(
                'Don\'t book a commercial cab. Share existing travel costs.',
                style: TextStyle(color: POTheme.textMuted, fontSize: 13),
              ),
              const SizedBox(height: 24),
              POGlassCard(
                hasGlow: true,
                onTap: () {
                  Navigator.pop(ctx);
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const FindRideScreen()),
                  );
                },
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: POTheme.primary.withOpacity(0.2),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.search_rounded, color: POTheme.primary, size: 24),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: const [
                          Text(
                            'Find a Ride',
                            style: TextStyle(
                              color: POTheme.cream,
                              fontWeight: FontWeight.w700,
                              fontSize: 16,
                            ),
                          ),
                          SizedBox(height: 2),
                          Text(
                            'Join a commuter travelling in your direction',
                            style: TextStyle(color: POTheme.textMuted, fontSize: 12),
                          ),
                        ],
                      ),
                    ),
                    const Icon(Icons.arrow_forward_ios_rounded, color: POTheme.cream, size: 16),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              POGlassCard(
                onTap: () {
                  Navigator.pop(ctx);
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const ShareCommuteScreen()),
                  );
                },
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: POTheme.brightOrange.withOpacity(0.2),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.alt_route_rounded, color: POTheme.brightOrange, size: 24),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: const [
                          Text(
                            'Share My Commute',
                            style: TextStyle(
                              color: POTheme.cream,
                              fontWeight: FontWeight.w700,
                              fontSize: 16,
                            ),
                          ),
                          SizedBox(height: 2),
                          Text(
                            'Offer empty seats along your planned route',
                            style: TextStyle(color: POTheme.textMuted, fontSize: 12),
                          ),
                        ],
                      ),
                    ),
                    const Icon(Icons.arrow_forward_ios_rounded, color: POTheme.cream, size: 16),
                  ],
                ),
              ),
              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    );
  }

  void _onQuickDestinationSelected(String destination) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => FindRideScreen(preselectedDestination: destination),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: POTheme.background,
      body: Stack(
        children: [
          // Background atmospheric glows
          Positioned(
            top: -60,
            right: -60,
            child: Container(
              width: 240,
              height: 240,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: POTheme.primary.withOpacity(0.12),
              ),
            ),
          ),
          Positioned(
            top: 320,
            left: -80,
            child: Container(
              width: 260,
              height: 260,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: POTheme.darkBrown.withOpacity(0.25),
              ),
            ),
          ),

          // Main View Tabs
          SafeArea(
            bottom: false,
            child: IndexedStack(
              index: _currentNavIndex,
              children: [
                _buildHomeTab(),
                const TripsScreen(),
                const PlansScreen(),
                const ProfileScreen(),
              ],
            ),
          ),

          // Floating Liquid Glass Bottom Navigation Bar
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: POGlassNav(
              currentIndex: _currentNavIndex,
              onTabSelected: (idx) {
                setState(() => _currentNavIndex = idx);
              },
              onPlusPressed: _openPlusActionSheet,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHomeTab() {
    return SingleChildScrollView(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.only(bottom: 110),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildHeader(),
          const ActiveSafetyBanner(),
          const SizedBox(height: 12),
          _buildHeroSection(),
          const SizedBox(height: 16),
          _buildSegmentSwitch(),
          const SizedBox(height: 20),
          _buildMapSection(),
          const SizedBox(height: 20),
          _buildQuickDestinations(),
          const SizedBox(height: 20),
          _buildActiveCommutersCard(),
          const SizedBox(height: 16),
          _buildWomenOnlySafetyCard(),
        ],
      ),
    );
  }

  Widget _buildHeader() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              Image.asset(
                'assets/branding/po_to_po_logo_mark.png',
                width: 38,
                height: 38,
                errorBuilder: (context, error, stackTrace) => Container(
                  width: 38,
                  height: 38,
                  decoration: BoxDecoration(
                    color: POTheme.primary.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: POTheme.primary),
                  ),
                  child: const Icon(Icons.arrow_forward_rounded, color: POTheme.primary, size: 22),
                ),
              ),
              const SizedBox(width: 12),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Welcome back',
                    style: TextStyle(
                      color: POTheme.textMuted,
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  Text(
                    _user.fullName,
                    style: const TextStyle(
                      color: POTheme.cream,
                      fontSize: 18,
                      fontWeight: FontWeight.w800,
                      letterSpacing: -0.2,
                    ),
                  ),
                ],
              ),
            ],
          ),
          Row(
            children: [
              const SafetyButton(),
              const SizedBox(width: 8),
              POGlassPill(
                text: _user.plan,
                color: POTheme.primary,
                textColor: POTheme.cream,
                icon: Icons.verified_rounded,
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildHeroSection() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          RichText(
            text: const TextSpan(
              children: [
                TextSpan(
                  text: 'Find someone ',
                  style: TextStyle(
                    color: POTheme.cream,
                    fontSize: 28,
                    fontWeight: FontWeight.w800,
                    height: 1.15,
                  ),
                ),
                TextSpan(
                  text: 'going your way',
                  style: TextStyle(
                    color: POTheme.primary,
                    fontSize: 28,
                    fontWeight: FontWeight.w800,
                    height: 1.15,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 6),
          const Text(
            'Don\'t book a commercial cab. Share existing travel costs.',
            style: TextStyle(
              color: POTheme.textMuted,
              fontSize: 14,
              fontWeight: FontWeight.w400,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSegmentSwitch() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: POGlassSegment(
        selectedIndex: _activeSegmentIndex,
        onSegmentChanged: (idx) {
          setState(() => _activeSegmentIndex = idx);
          if (idx == 0) {
            Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const FindRideScreen()),
            );
          } else {
            Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const ShareCommuteScreen()),
            );
          }
        },
      ),
    );
  }

  Widget _buildMapSection() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Container(
        height: 250,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: POTheme.glassBorder),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.5),
              blurRadius: 18,
              offset: const Offset(0, 6),
            ),
          ],
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(24),
          child: Stack(
            children: [
              FlutterMap(
                options: MapOptions(
                  initialCenter: _deviceLatLng,
                  initialZoom: 13.5,
                  interactionOptions: const InteractionOptions(
                    flags: InteractiveFlag.all,
                  ),
                ),
                children: [
                  TileLayer(
                    urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                    userAgentPackageName: 'com.popo.popo_mobile',
                  ),
                  MarkerLayer(
                    markers: [
                      // User's Current Location Marker
                      Marker(
                        point: _deviceLatLng,
                        width: 44,
                        height: 44,
                        child: Container(
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: POTheme.primary.withOpacity(0.25),
                            border: Border.all(color: POTheme.primary, width: 2),
                          ),
                          child: Center(
                            child: Container(
                              width: 16,
                              height: 16,
                              decoration: const BoxDecoration(
                                shape: BoxShape.circle,
                                color: POTheme.primary,
                              ),
                            ),
                          ),
                        ),
                      ),
                      // Sample eligible peer commuter marker along route
                      Marker(
                        point: LatLng(_deviceLatLng.latitude + 0.012, _deviceLatLng.longitude + 0.015),
                        width: 42,
                        height: 42,
                        child: Container(
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: const Color(0xE6141414),
                            border: Border.all(color: POTheme.matchStrong, width: 1.5),
                          ),
                          child: const Icon(Icons.two_wheeler_rounded, color: POTheme.matchStrong, size: 20),
                        ),
                      ),
                    ],
                  ),
                ],
              ),

              // Floating Current Location Glass Card on Map
              Positioned(
                bottom: 12,
                left: 12,
                right: 12,
                child: POGlassCard(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  borderRadius: 16,
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: POTheme.primary.withOpacity(0.2),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.my_location_rounded, color: POTheme.primary, size: 18),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'CURRENT LOCATION',
                              style: TextStyle(
                                color: POTheme.textMuted,
                                fontSize: 10,
                                fontWeight: FontWeight.w700,
                                letterSpacing: 0.5,
                              ),
                            ),
                            Text(
                              _currentLocationName,
                              style: const TextStyle(
                                color: POTheme.cream,
                                fontSize: 14,
                                fontWeight: FontWeight.w700,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),
                      if (!_hasLocationPermission)
                        TextButton(
                          onPressed: _initDeviceLocation,
                          child: const Text('Allow', style: TextStyle(color: POTheme.primary)),
                        ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildQuickDestinations() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Padding(
          padding: EdgeInsets.symmetric(horizontal: 20),
          child: Text(
            'QUICK DESTINATIONS',
            style: TextStyle(
              color: POTheme.textMuted,
              fontSize: 11,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.8,
            ),
          ),
        ),
        const SizedBox(height: 10),
        SizedBox(
          height: 38,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            physics: const BouncingScrollPhysics(),
            padding: const EdgeInsets.symmetric(horizontal: 20),
            itemCount: _quickDestinations.length,
            separatorBuilder: (_, __) => const SizedBox(width: 8),
            itemBuilder: (context, index) {
              final dest = _quickDestinations[index];
              return InkWell(
                onTap: () => _onQuickDestinationSelected(dest),
                borderRadius: BorderRadius.circular(19),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  decoration: BoxDecoration(
                    color: const Color(0xCC1A1A1A),
                    borderRadius: BorderRadius.circular(19),
                    border: Border.all(color: POTheme.glassBorder),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.place_rounded, size: 14, color: POTheme.primary),
                      const SizedBox(width: 6),
                      Text(
                        dest,
                        style: const TextStyle(
                          color: POTheme.cream,
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _buildActiveCommutersCard() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: POGlassCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: const [
                    Icon(Icons.people_alt_rounded, color: POTheme.primary, size: 18),
                    SizedBox(width: 8),
                    Text(
                      'ACTIVE COMMUTERS NEAR YOU',
                      style: TextStyle(
                        color: POTheme.textMuted,
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.6,
                      ),
                    ),
                  ],
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: POTheme.matchStrong.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Text(
                    '2 online',
                    style: TextStyle(
                      color: POTheme.matchStrong,
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: const [
                      Text(
                        'Route Corridor: Velachery → OMR',
                        style: TextStyle(
                          color: POTheme.cream,
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      SizedBox(height: 2),
                      Text(
                        'Travellers leaving within 15 mins. Shared fuel contribution from ₹35.',
                        style: TextStyle(color: POTheme.textMuted, fontSize: 12),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 10),
                IconButton(
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const FindRideScreen()),
                    );
                  },
                  icon: const Icon(Icons.arrow_forward_rounded, color: POTheme.primary),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildWomenOnlySafetyCard() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: POGlassCard(
        borderColor: _womenOnlyActive ? POTheme.dustPink.withOpacity(0.6) : null,
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: POTheme.dustPink.withOpacity(0.2),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.shield_rounded, color: POTheme.dustPink, size: 22),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: const [
                  Text(
                    'WOMEN-ONLY COMMUTE',
                    style: TextStyle(
                      color: POTheme.cream,
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  SizedBox(height: 2),
                  Text(
                    'Safer journeys for a stronger community.',
                    style: TextStyle(color: POTheme.textMuted, fontSize: 12),
                  ),
                ],
              ),
            ),
            Switch(
              value: _womenOnlyActive,
              activeColor: POTheme.dustPink,
              activeTrackColor: POTheme.dustPink.withOpacity(0.3),
              inactiveThumbColor: Colors.grey,
              inactiveTrackColor: Colors.white12,
              onChanged: (val) {
                setState(() => _womenOnlyActive = val);
              },
            ),
          ],
        ),
      ),
    );
  }
}
