/**
 * MapView — Leaflet map integrated into PO → PO visual identity
 *
 * - Dark CartoDB Dark Matter tiles
 * - PO → PO Orange (#F63B03) glowing origin and route
 * - Cream & Dark Brown destination pin
 * - Nearby commuter markers (Bike / Car)
 * - Auto-fit bounds
 */

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { theme } from '../theme';

export interface NearbyCommuterMarker {
  coords: [number, number]; // [lat, lng]
  name: string;
  transportMode: 'BIKE' | 'CAR';
}

interface MapViewProps {
  origin?: [number, number]; // [lat, lng]
  destination?: [number, number]; // [lat, lng]
  routeGeoJSON?: any;
  liveLocation?: [number, number] | null; // [lat, lng]
  nearbyCommuters?: NearbyCommuterMarker[];
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
  nearbyCommuters = [],
  height = '100%',
  zoom = 13,
  interactive = true,
  className = '',
}: MapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const routeLayerRef = useRef<L.GeoJSON | null>(null);
  const nearbyLayersRef = useRef<L.LayerGroup | null>(null);
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

    // OpenStreetMap dark-mode tile layer (using PO → PO dark filter in index.css)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      subdomains: 'abc',
    }).addTo(map);

    nearbyLayersRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Origin and Destination Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Origin Marker (PO → PO Orange)
    if (origin) {
      if (markersRef.current.origin) {
        markersRef.current.origin.setLatLng(origin);
      } else {
        const originIcon = L.divIcon({
          className: 'custom-map-icon',
          html: `
            <div style="
              width: 34px;
              height: 34px;
              background: #F63B03;
              border: 2px solid #FFF8E5;
              box-shadow: 0 0 16px rgba(246, 59, 3, 0.8), 0 0 24px rgba(246, 59, 3, 0.4);
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-family: 'Inter', sans-serif;
              font-weight: 800;
              font-size: 13px;
              color: #FFF8E5;
            ">A</div>
          `,
          iconSize: [34, 34],
          iconAnchor: [17, 17],
        });
        markersRef.current.origin = L.marker(origin, { icon: originIcon }).addTo(map);
      }
    }

    // Destination Marker (Cream & Dark Brown)
    if (destination) {
      if (markersRef.current.destination) {
        markersRef.current.destination.setLatLng(destination);
      } else {
        const destIcon = L.divIcon({
          className: 'custom-map-icon',
          html: `
            <div style="
              width: 34px;
              height: 34px;
              background: #FFF8E5;
              border: 2px solid #4F1409;
              box-shadow: 0 0 16px rgba(255, 248, 229, 0.8), 0 0 24px rgba(246, 59, 3, 0.3);
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-family: 'Inter', sans-serif;
              font-weight: 800;
              font-size: 13px;
              color: #4F1409;
            ">B</div>
          `,
          iconSize: [34, 34],
          iconAnchor: [17, 17],
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
          color: '#F63B03',
          weight: 5,
          opacity: 0.95,
          lineCap: 'round',
          lineJoin: 'round',
        },
      }).addTo(map);

      routeLayerRef.current = geoLayer;

      const bounds = geoLayer.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
      }
    } else if (origin && destination) {
      // Connect straight line if no route geojson provided yet
      const poly = L.polyline([origin, destination], {
        color: '#F63B03',
        weight: 4,
        dashArray: '8, 8',
        opacity: 0.8,
      }).addTo(map);
      routeLayerRef.current = poly as any;
      const bounds = L.latLngBounds([origin, destination]);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    } else if (origin) {
      map.setView(origin, zoom);
    }
  }, [routeGeoJSON, origin, destination]);

  // Update Nearby Commuter Markers
  useEffect(() => {
    const group = nearbyLayersRef.current;
    if (!group) return;

    group.clearLayers();

    nearbyCommuters.forEach((c) => {
      const iconHtml = `
        <div style="
          padding: 4px 8px;
          background: rgba(10, 10, 10, 0.85);
          border: 1.5px solid #F63B03;
          border-radius: 12px;
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          font-weight: 700;
          color: #FFF8E5;
          box-shadow: 0 2px 10px rgba(0,0,0,0.5);
          white-space: nowrap;
        ">
          <span>${c.transportMode === 'BIKE' ? '🏍️' : '🚗'}</span>
          <span>${c.name}</span>
        </div>
      `;
      const icon = L.divIcon({
        className: 'nearby-commuter-marker',
        html: iconHtml,
        iconSize: [80, 24],
        iconAnchor: [40, 12],
      });
      L.marker(c.coords, { icon }).addTo(group);
    });
  }, [nearbyCommuters]);

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
          <div style="
            width: 22px;
            height: 22px;
            background: #F73C06;
            border: 3px solid #FFFFFF;
            border-radius: 50%;
            box-shadow: 0 0 16px rgba(247, 60, 6, 0.9);
          "></div>
        `,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });
      markersRef.current.live = L.marker(liveLocation, { icon: liveIcon }).addTo(map);
    }
  }, [liveLocation]);

  return (
    <div
      ref={mapContainerRef}
      className={className}
      style={{
        width: '100%',
        height,
        position: 'relative',
        zIndex: 1,
        borderRadius: theme.radiusMd,
        overflow: 'hidden',
      }}
    />
  );
}
