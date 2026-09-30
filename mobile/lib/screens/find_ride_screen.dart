import 'package:flutter/material.dart';
import '../core/theme.dart';
import '../services/location_service.dart';
import 'matches_screen.dart';

class FindRideScreen extends StatefulWidget {
  final String? preselectedDestination;

  const FindRideScreen({Key? key, this.preselectedDestination}) : super(key: key);

  @override
  State<FindRideScreen> createState() => _FindRideScreenState();
}

class _FindRideScreenState extends State<FindRideScreen> {
  String _origin = 'Detecting your location...';
  bool _locating = true;
  bool _locationDenied = false;

  final TextEditingController _destinationController = TextEditingController();
  List<Map<String, String>> _suggestions = [];
  bool _showSuggestions = false;
  String _selectedTransport = 'BIKE';
  bool _womenOnly = false;

  // Local Places Dictionary (matching server/routes/places.js)
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
      'displayName': 'Velachery Vijayanagar Bus Terminus',
      'formattedAddress': 'Vijayanagar, Velachery, Chennai 600042',
      'keywords': 'velachery vijayanagar bus',
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
    if (widget.preselectedDestination != null) {
      _destinationController.text = widget.preselectedDestination!;
    }
    _requestLocation();
  }

  Future<void> _requestLocation() async {
    setState(() {
      _locating = true;
      _locationDenied = false;
    });

    final pos = await LocationService.getCurrentDeviceLocation();
    if (pos != null) {
      final area = LocationService.getHumanReadableArea(pos.latitude, pos.longitude);
      setState(() {
        _origin = 'Current location: $area';
        _locating = false;
        _locationDenied = false;
      });
    } else {
      setState(() {
        _origin = 'Current location: Velachery, Chennai (Manual)';
        _locating = false;
        _locationDenied = true;
      });
    }
  }

  void _onDestinationChanged(String query) {
    if (query.trim().length >= 2) {
      final q = query.toLowerCase();
      final results = _placesDb.where((p) {
        final text = '${p['displayName']} ${p['keywords']}'.toLowerCase();
        return text.contains(q);
      }).toList();

      setState(() {
        _suggestions = results;
        _showSuggestions = results.isNotEmpty;
      });
    } else {
      setState(() {
        _suggestions = [];
        _showSuggestions = false;
      });
    }
  }

  void _selectPlace(Map<String, String> place) {
    // CRITICAL: Shows only displayName in destination field (Requirement 1)
    setState(() {
      _destinationController.text = place['displayName']!;
      _showSuggestions = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('PO → PO', style: TextStyle(fontWeight: FontWeight.w900, color: POTheme.cream)),
        backgroundColor: POTheme.surface,
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Find a Ride',
              style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800, color: POTheme.cream),
            ),
            const SizedBox(height: 4),
            const Text(
              'Connect with someone already travelling your way',
              style: TextStyle(fontSize: 13, color: POTheme.primary, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 20),

            // Pickup / Origin
            const Text('FROM (PICKUP POINT)', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: POTheme.textMuted)),
            const SizedBox(height: 6),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: POTheme.surface,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: POTheme.glassBorder),
              ),
              child: Row(
                children: [
                  const Icon(Icons.my_location, color: POTheme.primary, size: 18),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      _origin,
                      style: const TextStyle(color: POTheme.cream, fontSize: 13, fontWeight: FontWeight.w600),
                    ),
                  ),
                  if (_locating)
                    const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: POTheme.primary)),
                ],
              ),
            ),
            if (_locationDenied) ...[
              const SizedBox(height: 6),
              Row(
                children: [
                  const Icon(Icons.info_outline, size: 14, color: POTheme.dustPink),
                  const SizedBox(width: 6),
                  const Expanded(
                    child: Text(
                      'Location access helps PO → PO find commuters near your route.',
                      style: TextStyle(color: POTheme.dustPink, fontSize: 11),
                    ),
                  ),
                  GestureDetector(
                    onTap: _requestLocation,
                    child: const Text(
                      'Enable GPS',
                      style: TextStyle(color: POTheme.primary, fontSize: 11, fontWeight: FontWeight.bold),
                    ),
                  ),
                ],
              ),
            ],
            const SizedBox(height: 18),

            // Destination / Autocomplete
            const Text('TO (DESTINATION)', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: POTheme.textMuted)),
            const SizedBox(height: 6),
            TextField(
              controller: _destinationController,
              onChanged: _onDestinationChanged,
              style: const TextStyle(color: POTheme.cream, fontSize: 14),
              decoration: InputDecoration(
                hintText: 'Search destination (e.g. srm eas, tidel...)',
                hintStyle: const TextStyle(color: POTheme.textMuted, fontSize: 13),
                prefixIcon: const Icon(Icons.location_on, color: POTheme.cream, size: 18),
                filled: true,
                fillColor: POTheme.surface,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: POTheme.glassBorder)),
                focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: POTheme.primary, width: 1.5)),
              ),
            ),

            // Places Suggestions Dropdown (Requirement 1)
            if (_showSuggestions)
              Container(
                margin: const EdgeInsets.only(top: 6),
                decoration: BoxDecoration(
                  color: POTheme.surface,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: POTheme.primary),
                ),
                child: ListView.separated(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: _suggestions.length,
                  separatorBuilder: (_, __) => const Divider(color: POTheme.glassBorder, height: 1),
                  itemBuilder: (context, index) {
                    final item = _suggestions[index];
                    return ListTile(
                      dense: true,
                      title: Text(item['displayName']!, style: const TextStyle(color: POTheme.cream, fontWeight: FontWeight.w700, fontSize: 13)),
                      subtitle: Text(item['formattedAddress']!, style: const TextStyle(color: POTheme.textMuted, fontSize: 11)),
                      onTap: () => _selectPlace(item),
                    );
                  },
                ),
              ),

            const SizedBox(height: 18),

            // Transport Mode Selection
            const Text('TRANSPORT MODE', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: POTheme.textMuted)),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: InkWell(
                    onTap: () => setState(() => _selectedTransport = 'BIKE'),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      decoration: BoxDecoration(
                        color: _selectedTransport == 'BIKE' ? const Color(0x28F63B03) : POTheme.surface,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: _selectedTransport == 'BIKE' ? POTheme.primary : POTheme.glassBorder, width: 1.5),
                      ),
                      child: const Center(
                        child: Text('🏍️ BIKE (Max 1)', style: TextStyle(color: POTheme.cream, fontWeight: FontWeight.w700)),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: InkWell(
                    onTap: () => setState(() => _selectedTransport = 'CAR'),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      decoration: BoxDecoration(
                        color: _selectedTransport == 'CAR' ? const Color(0x28F63B03) : POTheme.surface,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: _selectedTransport == 'CAR' ? POTheme.primary : POTheme.glassBorder, width: 1.5),
                      ),
                      child: const Center(
                        child: Text('🚗 CAR (Up to 4)', style: TextStyle(color: POTheme.cream, fontWeight: FontWeight.w700)),
                      ),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 18),

            // Women-Only Commute
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              decoration: BoxDecoration(
                color: const Color(0x1FE79E89),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: POTheme.dustPink),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('👩 Female-Only Commute', style: TextStyle(color: POTheme.cream, fontWeight: FontWeight.w700, fontSize: 13)),
                      Text('Strict binary safety filter', style: TextStyle(color: POTheme.textMuted, fontSize: 11)),
                    ],
                  ),
                  Switch(
                    value: _womenOnly,
                    onChanged: (v) => setState(() => _womenOnly = v),
                    activeColor: POTheme.primary,
                  ),
                ],
              ),
            ),
            const SizedBox(height: 28),

            // Search Button
            SizedBox(
              width: double.infinity,
              height: 52,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: POTheme.primary,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                onPressed: () {
                  if (_destinationController.text.isEmpty) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Please select or enter a destination.')),
                    );
                    return;
                  }
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => MatchesScreen(
                        origin: _origin,
                        destination: _destinationController.text,
                        transportMode: _selectedTransport,
                      ),
                    ),
                  );
                },
                child: const Text('Find a Ride →', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: POTheme.cream)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
