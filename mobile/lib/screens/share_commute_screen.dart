import 'package:flutter/material.dart';
import '../core/theme.dart';
import '../services/location_service.dart';
import '../shared/widgets/glass_widgets.dart';

class ShareCommuteScreen extends StatefulWidget {
  const ShareCommuteScreen({Key? key}) : super(key: key);

  @override
  State<ShareCommuteScreen> createState() => _ShareCommuteScreenState();
}

class _ShareCommuteScreenState extends State<ShareCommuteScreen> {
  String _origin = 'Velachery, Chennai';
  bool _locating = false;
  final TextEditingController _destinationController = TextEditingController();
  List<Map<String, String>> _suggestions = [];
  bool _showSuggestions = false;

  String _selectedTransport = 'CAR'; // CAR or BIKE only
  int _availableSeats = 2;
  bool _isPublishing = false;

  final List<Map<String, String>> _placesDb = [
    {
      'displayName': 'SRM Easwari Engineering College',
      'formattedAddress': 'Bharathi Salai, Ramapuram, Chennai, Tamil Nadu 600089',
      'keywords': 'srm easwari ramapuram engineering college',
    },
    {
      'displayName': 'Tidel Park Taramani',
      'formattedAddress': 'Rajiv Gandhi Salai, Taramani, Chennai, Tamil Nadu 600113',
      'keywords': 'tidel park taramani omr tech',
    },
    {
      'displayName': 'DLF Cybercity Porur',
      'formattedAddress': 'Mount Poonamallee Road, Porur, Chennai 600089',
      'keywords': 'dlf cybercity porur it park',
    },
    {
      'displayName': 'Guindy Kathipara Junction',
      'formattedAddress': 'Grand Southern Trunk Rd, Guindy, Chennai 600016',
      'keywords': 'guindy kathipara junction alandur',
    },
    {
      'displayName': 'OMR Sholinganallur Junction',
      'formattedAddress': 'Rajiv Gandhi Salai, Sholinganallur, Chennai 600119',
      'keywords': 'omr sholinganallur junction elcot',
    },
  ];

  @override
  void initState() {
    super.initState();
    _detectOrigin();
  }

  Future<void> _detectOrigin() async {
    setState(() => _locating = true);
    final pos = await LocationService.getCurrentDeviceLocation();
    if (mounted) {
      setState(() {
        _locating = false;
        if (pos != null) {
          _origin = LocationService.getHumanReadableArea(pos.latitude, pos.longitude);
        } else {
          _origin = 'Velachery, Chennai';
        }
      });
    }
  }

  void _onDestinationChanged(String query) {
    if (query.trim().isEmpty) {
      setState(() {
        _suggestions = [];
        _showSuggestions = false;
      });
      return;
    }

    final lower = query.toLowerCase();
    final matches = _placesDb.where((p) {
      final name = p['displayName']!.toLowerCase();
      final kw = p['keywords']!.toLowerCase();
      return name.contains(lower) || kw.contains(lower);
    }).toList();

    setState(() {
      _suggestions = matches;
      _showSuggestions = matches.isNotEmpty;
    });
  }

  void _selectDestination(Map<String, String> place) {
    setState(() {
      _destinationController.text = place['displayName']!;
      _showSuggestions = false;
    });
  }

  void _publishCommute() {
    if (_destinationController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please specify your destination.')),
      );
      return;
    }

    setState(() => _isPublishing = true);

    Future.delayed(const Duration(seconds: 1), () {
      if (!mounted) return;
      setState(() => _isPublishing = false);

      showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
          backgroundColor: const Color(0xFF1A1A1A),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
            side: const BorderSide(color: POTheme.glassBorder),
          ),
          title: Row(
            children: const [
              Icon(Icons.check_circle_rounded, color: POTheme.matchExcellent, size: 24),
              SizedBox(width: 10),
              Text('Commute Published', style: TextStyle(color: POTheme.cream, fontSize: 18)),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Your planned commute to ${_destinationController.text} is active.',
                style: const TextStyle(color: POTheme.cream, fontSize: 14),
              ),
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0x33FFFFFF),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: POTheme.glassBorder),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: const [
                    Text(
                      'DAILY COMMUTE QUOTA',
                      style: TextStyle(
                        color: POTheme.textMuted,
                        fontSize: 10,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.5,
                      ),
                    ),
                    SizedBox(height: 4),
                    Text(
                      '0 / 2 confirmed rides used today.',
                      style: TextStyle(color: POTheme.cream, fontSize: 13, fontWeight: FontWeight.w600),
                    ),
                    SizedBox(height: 2),
                    Text(
                      'Sharing commute consumes 0 quota until a passenger match is confirmed.',
                      style: TextStyle(color: POTheme.textMuted, fontSize: 11),
                    ),
                  ],
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () {
                Navigator.pop(ctx);
                Navigator.pop(context);
              },
              child: const Text('Done', style: TextStyle(color: POTheme.primary, fontWeight: FontWeight.w700)),
            ),
          ],
        ),
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: POTheme.background,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: const Text(
          'Share My Commute',
          style: TextStyle(fontWeight: FontWeight.w800, color: POTheme.cream),
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_rounded, color: POTheme.cream),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Offer empty seats on your existing commute.',
              style: TextStyle(color: POTheme.textMuted, fontSize: 13),
            ),
            const SizedBox(height: 16),

            // Origin Card
            POGlassCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'DEPARTURE POINT',
                        style: TextStyle(
                          color: POTheme.textMuted,
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 0.5,
                        ),
                      ),
                      if (_locating)
                        const SizedBox(
                          width: 14,
                          height: 14,
                          child: CircularProgressIndicator(strokeWidth: 2, color: POTheme.primary),
                        ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      const Icon(Icons.my_location_rounded, color: POTheme.primary, size: 20),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          _origin,
                          style: const TextStyle(color: POTheme.cream, fontSize: 15, fontWeight: FontWeight.w600),
                        ),
                      ),
                      TextButton(
                        onPressed: _detectOrigin,
                        child: const Text('Refresh', style: TextStyle(color: POTheme.primary, fontSize: 12)),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            const SizedBox(height: 16),

            // Destination Card with Places Suggestions
            POGlassCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'DESTINATION',
                    style: TextStyle(
                      color: POTheme.textMuted,
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 0.5,
                    ),
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _destinationController,
                    onChanged: _onDestinationChanged,
                    style: const TextStyle(color: POTheme.cream, fontSize: 15),
                    decoration: InputDecoration(
                      hintText: 'e.g. SRM Easwari, Tidel Park, Guindy',
                      hintStyle: const TextStyle(color: POTheme.textMuted),
                      prefixIcon: const Icon(Icons.place_rounded, color: POTheme.brightOrange, size: 20),
                      filled: true,
                      fillColor: const Color(0x33FFFFFF),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(color: POTheme.glassBorder),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(color: POTheme.primary),
                      ),
                    ),
                  ),
                  if (_showSuggestions) ...[
                    const SizedBox(height: 8),
                    Container(
                      decoration: BoxDecoration(
                        color: const Color(0xEE1E1E1E),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: POTheme.glassBorder),
                      ),
                      child: ListView.separated(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        itemCount: _suggestions.length,
                        separatorBuilder: (_, __) => const Divider(color: Colors.white12, height: 1),
                        itemBuilder: (ctx, i) {
                          final place = _suggestions[i];
                          return ListTile(
                            dense: true,
                            leading: const Icon(Icons.place_outlined, color: POTheme.primary, size: 18),
                            title: Text(
                              place['displayName']!,
                              style: const TextStyle(color: POTheme.cream, fontWeight: FontWeight.w600),
                            ),
                            subtitle: Text(
                              place['formattedAddress']!,
                              style: const TextStyle(color: POTheme.textMuted, fontSize: 11),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            onTap: () => _selectDestination(place),
                          );
                        },
                      ),
                    ),
                  ],
                ],
              ),
            ),

            const SizedBox(height: 16),

            // Vehicle & Seats Selection
            POGlassCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'TRANSPORT MODE',
                    style: TextStyle(
                      color: POTheme.textMuted,
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 0.5,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: _buildTransportOption('CAR', Icons.directions_car_rounded, 'Car'),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: _buildTransportOption('BIKE', Icons.two_wheeler_rounded, 'Bike'),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Available Seats',
                        style: TextStyle(color: POTheme.cream, fontSize: 14, fontWeight: FontWeight.w600),
                      ),
                      Row(
                        children: [1, 2, 3].map((s) {
                          if (_selectedTransport == 'BIKE' && s > 1) {
                            return const SizedBox.shrink();
                          }
                          final isSelected = _availableSeats == s;
                          return Padding(
                            padding: const EdgeInsets.only(left: 8),
                            child: InkWell(
                              onTap: () => setState(() => _availableSeats = s),
                              child: Container(
                                width: 36,
                                height: 36,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: isSelected ? POTheme.primary : const Color(0x33FFFFFF),
                                  border: Border.all(
                                    color: isSelected ? POTheme.primary : POTheme.glassBorder,
                                  ),
                                ),
                                child: Center(
                                  child: Text(
                                    '$s',
                                    style: TextStyle(
                                      color: isSelected ? POTheme.cream : POTheme.textMuted,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          );
                        }).toList(),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            const SizedBox(height: 16),

            // Cost Sharing Transparency Card
            POGlassCard(
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: POTheme.matchStrong.withOpacity(0.2),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.currency_rupee_rounded, color: POTheme.matchStrong, size: 20),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: const [
                        Text(
                          'Cost Sharing Principle',
                          style: TextStyle(color: POTheme.cream, fontSize: 14, fontWeight: FontWeight.w700),
                        ),
                        SizedBox(height: 2),
                        Text(
                          'Fuel contribution is split equally among occupants: (Total Fuel Cost) / (Confirmed Occupants).',
                          style: TextStyle(color: POTheme.textMuted, fontSize: 12),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 28),

            // Publish Button
            POGlassButton(
              label: 'Publish My Commute',
              icon: Icons.check_circle_outline_rounded,
              isLoading: _isPublishing,
              onPressed: _publishCommute,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTransportOption(String mode, IconData icon, String label) {
    final isSelected = _selectedTransport == mode;
    return InkWell(
      onTap: () {
        setState(() {
          _selectedTransport = mode;
          if (mode == 'BIKE') _availableSeats = 1;
        });
      },
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          color: isSelected ? POTheme.primary.withOpacity(0.2) : const Color(0x33FFFFFF),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: isSelected ? POTheme.primary : POTheme.glassBorder,
            width: isSelected ? 1.5 : 1.0,
          ),
        ),
        child: Column(
          children: [
            Icon(icon, color: isSelected ? POTheme.primary : POTheme.textMuted, size: 26),
            const SizedBox(height: 4),
            Text(
              label,
              style: TextStyle(
                color: isSelected ? POTheme.cream : POTheme.textMuted,
                fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                fontSize: 13,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
