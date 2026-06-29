import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const DEFAULT_CENTER: [number, number] = [28.6139, 77.209];
const DEFAULT_ZOOM = 15;

const FlyToPosition = ({ position }: { position: [number, number] }) => {
  const map = useMap();
  const prevRef = useRef<[number, number] | null>(null);
  useEffect(() => {
    if (!prevRef.current) {
      map.setView(position, DEFAULT_ZOOM);
    } else {
      map.flyTo(position, DEFAULT_ZOOM, { animate: true, duration: 1 });
    }
    prevRef.current = position;
  }, [position, map]);
  return null;
};

const RiderIdleMap: React.FC = () => {
  const [riderPos, setRiderPos] = useState<[number, number]>(DEFAULT_CENTER);

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

  useEffect(() => {
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setRiderPos([pos.coords.latitude, pos.coords.longitude]);
      },
      () => {
        // Permission denied or unavailable — keep default center
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

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
