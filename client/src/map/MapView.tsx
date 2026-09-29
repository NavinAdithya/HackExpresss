/**
 * MapView — Leaflet map integrated into PO → PO visual identity
 *
 * - CartoDB Dark Matter tiles for a sleek dark aesthetic
 * - Custom glowing DivIcons for origin, destination, and live vehicles
 * - Glowing polyline with route geometry
 * - Smooth auto-fit bounds
 * - Floating glass status overlays
 */

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { theme } from '../theme';

interface MapViewProps {
  origin?: [number, number]; // [lat, lng]
  destination?: [number, number]; // [lat, lng]
  routeGeoJSON?: any;
  liveLocation?: [number, number] | null; // [lat, lng]
  height?: string;
  zoom?: number;
  interactive?: boolean;
  className?: string;
}

export function MapView({
  origin,
  destination,
  routeGeoJSON,
  liveLocation,
  height = '100%',
  zoom = 13,
  interactive = true,
  className = '',
}: MapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const routeLayerRef = useRef<L.GeoJSON | null>(null);
  const markersRef = useRef<{
    origin?: L.Marker;
    destination?: L.Marker;
    live?: L.Marker;
  }>({});

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Default center Chennai (13.0827, 80.2707)
    const initialCenter = origin || [13.0827, 80.2707];

    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom,
      zoomControl: interactive,
      dragging: interactive,
      scrollWheelZoom: interactive,
      attributionControl: false,
    });

    // Public OpenStreetMap tiles — 100% free, zero API key required
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(map);

    mapInstanceRef.current = map;

    // Ensure map tiles layout properly on mount and resize
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      clearTimeout(timer);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Origin and Destination Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Origin Marker (Cyan A)
    if (origin) {
      if (markersRef.current.origin) {
        markersRef.current.origin.setLatLng(origin);
      } else {
        const originIcon = L.divIcon({
          className: 'custom-map-icon',
          html: `
            <div style="
              width: 32px;
              height: 32px;
              background: #00f2fe;
              border: 2px solid #ffffff;
              box-shadow: 0 0 16px #00f2fe, 0 0 24px rgba(0, 242, 254, 0.4);
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-family: 'Inter', sans-serif;
              font-weight: 800;
              font-size: 13px;
              color: #06060c;
            ">A</div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });
        markersRef.current.origin = L.marker(origin, { icon: originIcon }).addTo(map);
      }
    }

    // Destination Marker (Violet B)
    if (destination) {
      if (markersRef.current.destination) {
        markersRef.current.destination.setLatLng(destination);
      } else {
        const destIcon = L.divIcon({
          className: 'custom-map-icon',
          html: `
            <div style="
              width: 32px;
              height: 32px;
              background: #7f00ff;
              border: 2px solid #ffffff;
              box-shadow: 0 0 16px #7f00ff, 0 0 24px rgba(127, 0, 255, 0.4);
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-family: 'Inter', sans-serif;
              font-weight: 800;
              font-size: 13px;
              color: #ffffff;
            ">B</div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });
        markersRef.current.destination = L.marker(destination, { icon: destIcon }).addTo(map);
      }
    }
  }, [origin, destination]);

  // Update Route Polyline
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (routeLayerRef.current) {
      map.removeLayer(routeLayerRef.current);
      routeLayerRef.current = null;
    }

    if (routeGeoJSON) {
      const geoLayer = L.geoJSON(routeGeoJSON, {
        style: {
          color: '#00f2fe',
          weight: 5,
          opacity: 0.9,
          lineCap: 'round',
          lineJoin: 'round',
        },
      }).addTo(map);

      routeLayerRef.current = geoLayer;

      // Fit bounds with smooth padding
      const bounds = geoLayer.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
      }
    } else if (origin && destination) {
      const bounds = L.latLngBounds([origin, destination]);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [routeGeoJSON, origin, destination]);

  // Update Live Location Marker
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !liveLocation) return;

    if (markersRef.current.live) {
      markersRef.current.live.setLatLng(liveLocation);
    } else {
      const liveIcon = L.divIcon({
        className: 'custom-map-icon',
        html: `
          <div style="position: relative; width: 36px; height: 36px;">
            <div style="
              position: absolute;
              inset: 0;
              background: #00ffa3;
              border-radius: 50%;
              opacity: 0.4;
              animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
            "></div>
            <div style="
              position: absolute;
              inset: 4px;
              background: #00ffa3;
              border: 3px solid #ffffff;
              box-shadow: 0 0 16px #00ffa3;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              color: #06060c;
              font-size: 14px;
            ">🚗</div>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });
      markersRef.current.live = L.marker(liveLocation, { icon: liveIcon, zIndexOffset: 1000 }).addTo(map);
    }
  }, [liveLocation]);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height,
        borderRadius: '24px',
        overflow: 'hidden',
        border: `1px solid ${theme.glassBorder}`,
      }}
      className={className}
    >
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
