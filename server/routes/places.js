/**
 * Places Discovery Route — PO → PO
 *
 * Implements Destination Autocomplete:
 * - Returns Places suggestions with place_id, displayName, formattedAddress, lat, lng
 * - Supports Google Places API when key is configured, plus high-fidelity Chennai/Indian places dictionary and Nominatim
 * - Primary UI exposes only displayName (e.g. "SRM Easwari Engineering College")
 * - Full geographic metadata (place_id, lat, lng, formattedAddress) retained for routing & PostGIS
 */

const express = require('express');
const axios = require('axios');
const router = express.Router();

// Pre-indexed high-frequency Chennai colleges, tech hubs, and transit centers
const CHENNAI_PLACES_INDEX = [
  {
    place_id: 'chennai_srm_easwari',
    displayName: 'SRM Easwari Engineering College',
    formattedAddress: 'Bharathi Salai, Ramapuram, Chennai, Tamil Nadu 600089',
    latitude: 13.0324,
    longitude: 80.1804,
    keywords: ['srm', 'easwari', 'ramapuram', 'engineering', 'college'],
  },
  {
    place_id: 'chennai_srm_vadapalani',
    displayName: 'SRM Institute Vadapalani Campus',
    formattedAddress: 'Jawaharlal Nehru Road, Vadapalani, Chennai, Tamil Nadu 600026',
    latitude: 13.0519,
    longitude: 80.2104,
    keywords: ['srm', 'vadapalani', 'institute'],
  },
  {
    place_id: 'chennai_srm_kattankulathur',
    displayName: 'SRM University Kattankulathur',
    formattedAddress: 'SRM Nagar, Potheri, Kattankulathur, Tamil Nadu 603203',
    latitude: 12.8231,
    longitude: 80.0442,
    keywords: ['srm', 'kattankulathur', 'potheri', 'university'],
  },
  {
    place_id: 'chennai_anna_univ',
    displayName: 'Anna University Guindy Campus',
    formattedAddress: 'Sardar Patel Road, Guindy, Chennai, Tamil Nadu 600025',
    latitude: 13.0109,
    longitude: 80.2355,
    keywords: ['anna', 'university', 'guindy', 'ceg'],
  },
  {
    place_id: 'chennai_iitm',
    displayName: 'IIT Madras',
    formattedAddress: 'Sardar Patel Road, Adyar, Chennai, Tamil Nadu 600036',
    latitude: 12.9915,
    longitude: 80.2337,
    keywords: ['iit', 'madras', 'adyar'],
  },
  {
    place_id: 'chennai_tidel_park',
    displayName: 'Tidel Park Taramani',
    formattedAddress: 'Rajiv Gandhi Salai, Taramani, Chennai, Tamil Nadu 600113',
    latitude: 12.9895,
    longitude: 80.2476,
    keywords: ['tidel', 'park', 'taramani', 'omr', 'tech'],
  },
  {
    place_id: 'chennai_dlf_it_park',
    displayName: 'DLF Cybercity Porur',
    formattedAddress: 'Mount Poonamallee Road, Ramapuram, Porur, Chennai, Tamil Nadu 600089',
    latitude: 13.0298,
    longitude: 80.1706,
    keywords: ['dlf', 'cybercity', 'porur', 'it', 'park', 'ramapuram'],
  },
  {
    place_id: 'chennai_kathipara',
    displayName: 'Guindy Kathipara Junction',
    formattedAddress: 'Grand Southern Trunk Rd, Alandur, Guindy, Chennai, Tamil Nadu 600016',
    latitude: 13.0067,
    longitude: 80.2080,
    keywords: ['guindy', 'kathipara', 'junction', 'alandur', 'metro'],
  },
  {
    place_id: 'chennai_velachery_vijayanagar',
    displayName: 'Velachery Vijayanagar Bus Terminus',
    formattedAddress: 'Vijayanagar, Velachery, Chennai, Tamil Nadu 600042',
    latitude: 12.9815,
    longitude: 80.2180,
    keywords: ['velachery', 'vijayanagar', 'bus', 'terminus'],
  },
  {
    place_id: 'chennai_sholinganallur',
    displayName: 'OMR Sholinganallur Junction',
    formattedAddress: 'Rajiv Gandhi Salai, Sholinganallur, Chennai, Tamil Nadu 600119',
    latitude: 12.9010,
    longitude: 80.2279,
    keywords: ['omr', 'sholinganallur', 'junction', 'elcot', 'tcs'],
  },
  {
    place_id: 'chennai_tnagar_panagal',
    displayName: 'T. Nagar Panagal Park',
    formattedAddress: 'Prakasam Road, T. Nagar, Chennai, Tamil Nadu 600017',
    latitude: 13.0405,
    longitude: 80.2337,
    keywords: ['t nagar', 'panagal', 'park', 'shopping', 'pondibazaar'],
  },
  {
    place_id: 'chennai_airport',
    displayName: 'Chennai International Airport (MAA)',
    formattedAddress: 'GST Road, Meenambakkam, Chennai, Tamil Nadu 600027',
    latitude: 12.9941,
    longitude: 80.1709,
    keywords: ['airport', 'chennai', 'meenambakkam', 'flight', 'terminal'],
  },
  {
    place_id: 'chennai_central',
    displayName: 'Puratchi Thalaivar Dr. M.G.R Central Railway Station',
    formattedAddress: 'Kannappar Thidal, Periyamet, Chennai, Tamil Nadu 600003',
    latitude: 13.0827,
    longitude: 80.2707,
    keywords: ['central', 'railway', 'station', 'mgr'],
  },
];

/**
 * GET /api/places/autocomplete?input=srm+eas
 */
router.get('/autocomplete', async (req, res) => {
  try {
    const input = (req.query.input || '').trim().toLowerCase();
    if (!input || input.length < 2) {
      return res.json({ suggestions: [] });
    }

    const matched = [];

    // 1. Search local pre-indexed high-precision Places dictionary
    const terms = input.split(/\s+/);
    for (const place of CHENNAI_PLACES_INDEX) {
      const haystack = `${place.displayName} ${place.formattedAddress} ${place.keywords.join(' ')}`.toLowerCase();
      const matchAll = terms.every((term) => haystack.includes(term));
      if (matchAll) {
        matched.push({
          place_id: place.place_id,
          displayName: place.displayName,
          formattedAddress: place.formattedAddress,
          latitude: place.latitude,
          longitude: place.longitude,
        });
      }
    }

    // 2. If Google Maps API Key is available, query Google Places API
    const googleKey = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_PLACES_API_KEY;
    if (googleKey && matched.length < 5) {
      try {
        const gRes = await axios.get('https://maps.googleapis.com/maps/api/place/autocomplete/json', {
          params: {
            input,
            key: googleKey,
            components: 'country:in',
            location: '13.0827,80.2707', // Chennai center
            radius: 50000,
          },
          timeout: 2500,
        });

        if (gRes.data && gRes.data.predictions) {
          for (const pred of gRes.data.predictions.slice(0, 5)) {
            // Check if already matched
            if (!matched.some((m) => m.place_id === pred.place_id)) {
              matched.push({
                place_id: pred.place_id,
                displayName: pred.structured_formatting?.main_text || pred.description.split(',')[0],
                formattedAddress: pred.description,
                // Coordinates resolved lazily or via details
                latitude: null,
                longitude: null,
              });
            }
          }
        }
      } catch (gErr) {
        // Fallback gracefully
      }
    }

    // 3. Photon / Nominatim geographic discovery fallback for any location in India
    if (matched.length < 3) {
      try {
        const nomRes = await axios.get('https://photon.komoot.io/api/', {
          params: {
            q: input,
            lat: 13.0827,
            lon: 80.2707,
            limit: 4,
          },
          timeout: 2000,
        });

        if (nomRes.data && nomRes.data.features) {
          for (const f of nomRes.data.features) {
            const props = f.properties;
            const coords = f.geometry.coordinates;
            const displayName = props.name || props.street || input;
            const addressParts = [props.street, props.suburb || props.district, props.city || props.state]
              .filter(Boolean)
              .join(', ');

            matched.push({
              place_id: `photon_${props.osm_id || Math.random().toString(36).substr(2, 9)}`,
              displayName,
              formattedAddress: addressParts || displayName,
              latitude: coords[1],
              longitude: coords[0],
            });
          }
        }
      } catch (nomErr) {
        // Ignored
      }
    }

    res.json({ suggestions: matched.slice(0, 6) });
  } catch (err) {
    console.error('[PLACES] autocomplete error:', err.message);
    res.status(500).json({ error: 'Failed to search places' });
  }
});

module.exports = router;
