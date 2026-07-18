import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';
import { riderService } from '../main';

const DEFAULT_CENTER: [number, number] = [28.6139, 77.209];
const DEFAULT_ZOOM = 15;

// Smoothly pans to rider position — only refits when value actually changes
const FlyToPosition = ({ position }: { position: [number, number] }) => {
  const map = useMap();
  const prevRef = useRef<[number, number] | null>(null);
  useEffect(() => {
    const [lat, lng] = position;
    const [pLat, pLng] = prevRef.current ?? [null, null];
    if (lat === pLat && lng === pLng) return; // skip if unchanged
    if (!prevRef.current) {
      map.setView(position, DEFAULT_ZOOM);
    } else {
      map.flyTo(position, DEFAULT_ZOOM, { animate: true, duration: 1 });
    }
    prevRef.current = position;
  }, [position, map]);
  return null;
};

interface RiderIdleMapProps {
  isOnline?: boolean; // only push location to backend when online
}

const RiderIdleMap: React.FC<RiderIdleMapProps> = ({ isOnline = false }) => {
  const [riderPos, setRiderPos] = useState<[number, number]>(DEFAULT_CENTER);
  const posRef = useRef<[number, number]>(DEFAULT_CENTER);

  const riderIcon = L.divIcon({
    html: `<div style="position:relative;width:48px;height:48px">
      <div style="position:absolute;inset:0;background:rgba(255,87,51,0.25);border-radius:50%;animation:ping 1.5s ease-in-out infinite"></div>
      <div style="position:absolute;inset:4px;background:#FF5733;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 0 12px rgba(255,87,51,0.6);border:2px solid white">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="5.5" cy="17.5" r="2.5" />
          <circle cx="18.5" cy="17.5" r="2.5" />
          <path d="M8 17.5h6.5l2-5.5h-8l1.5-3.5H16" />
        </svg>
      </div>
    </div>`,
    className: '',
    iconSize: [48, 48],
    iconAnchor: [24, 24],
  });

  // Push GPS to backend (only when online)
  const pushLocation = (lat: number, lng: number) => {
    if (!isOnline) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    axios
      .put(
        `${riderService}/api/rider/location`,
        { latitude: lat, longitude: lng },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      .catch(() => {}); // silent — map still works if backend call fails
  };

  // Watch GPS, update local state + push to backend
  useEffect(() => {
    if (!navigator.geolocation) return;

    const onSuccess = (pos: GeolocationPosition) => {
      const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
      posRef.current = coords;
      setRiderPos(coords);
      pushLocation(pos.coords.latitude, pos.coords.longitude);
    };

    const watchId = navigator.geolocation.watchPosition(
      onSuccess,
      () => {}, // silent on denial — keep showing last known position
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
    );

    // Also poll every 15 s to ensure the backend stays fresh
    const interval = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        onSuccess,
        () => {},
        { enableHighAccuracy: true, maximumAge: 15000, timeout: 10000 }
      );
    }, 15000);

    return () => {
      navigator.geolocation.clearWatch(watchId);
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline]);

  return (
    <MapContainer
      center={riderPos}
      zoom={DEFAULT_ZOOM}
      style={{ width: '100%', height: '100%' }}
      zoomControl={false}
      attributionControl={false}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        subdomains="abcd"
        maxZoom={19}
      />
      <Marker position={riderPos} icon={riderIcon} />
      <FlyToPosition position={riderPos} />
    </MapContainer>
  );
};

export default RiderIdleMap;
