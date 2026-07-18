import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';
import { riderService } from '../main';

interface RiderLiveMapProps {
  orderId: string;
  restaurantLocation: { lat: number; lng: number; name: string; phone: string | number; address: string };
  customerLocation: { lat: number; lng: number; address: string; phone: string | number; name: string };
  orderStatus: string;
  socket: any;
}

const FitBounds = ({ positions }: { positions: L.LatLngExpression[] }) => {
  const map = useMap();
  const lastKeyRef = React.useRef("");
  useEffect(() => {
    if (positions.length < 2) return;
    const key = JSON.stringify(positions);
    if (key === lastKeyRef.current) return; // only refit when values actually change
    lastKeyRef.current = key;
    map.fitBounds(positions as L.LatLngBoundsExpression, { padding: [80, 80], maxZoom: 16 });
  }, [positions, map]);
  return null;
};

const RiderLiveMap: React.FC<RiderLiveMapProps> = ({ orderId, restaurantLocation, customerLocation, orderStatus, socket }) => {
  const [riderPosition, setRiderPosition] = useState<[number, number] | null>(null);
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);
  const [_routeInfo, setRouteInfo] = useState<{ distance: number; duration: number }>({ distance: 0, duration: 0 });
  const watchIdRef = useRef<number | null>(null);

  // Custom marker icons with pulsing animation
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

  const restaurantIcon = L.divIcon({
    html: `<div style="background:#10b981;border-radius:50% 50% 50% 0;width:36px;height:36px;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(16,185,129,0.5);border:1.5px solid white">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="transform:rotate(45deg)">
        <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
        <path d="M7 2v20" />
        <path d="M21 15V2a5 5 0 0 0-5 5v8h5zm0 0v7" />
      </svg>
    </div>`,
    className: '',
    iconSize: [36, 36],
    iconAnchor: [18, 36],
  });

  const customerIcon = L.divIcon({
    html: `<div style="background:#3b82f6;border-radius:50% 50% 50% 0;width:36px;height:36px;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(59,130,246,0.5);border:1.5px solid white">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="transform:rotate(45deg)">
        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    </div>`,
    className: '',
    iconSize: [36, 36],
    iconAnchor: [18, 36],
  });

  // Fetch OSRM route
  const fetchRoute = async (from: [number, number], to: [number, number]) => {
    try {
      const res = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`
      );
      const data = await res.json();
      if (data.routes?.[0]) {
        const coords = data.routes[0].geometry.coordinates.map(([lng, lat]: number[]) => [lat, lng] as [number, number]);
        setRouteCoords(coords);
        setRouteInfo({
          distance: data.routes[0].distance / 1000,
          duration: Math.ceil(data.routes[0].duration / 60),
        });
        return { coords, distance: data.routes[0].distance, duration: data.routes[0].duration };
      }
    } catch {
      setRouteCoords([from, to]);
    }
  };

  // REST + Socket Location Emitter
  const emitLocation = async (latitude: number, longitude: number) => {
    // 1. Persist in database via rider service REST API
    const token = localStorage.getItem("token");
    if (token) {
      axios
        .put(
          `${riderService}/api/rider/location`,
          { latitude, longitude },
          { headers: { Authorization: `Bearer ${token}` } }
        )
        .catch((err) => console.error("Failed to update rider location in DB:", err.message));
    }

    // 2. Relay via Socket.io for immediate customer map tracking updates
    socket?.emit('rider:update_location', { lat: latitude, lng: longitude, orderId });
  };

  // GPS tracking
  useEffect(() => {
    const updateLocation = () => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setRiderPosition([latitude, longitude]);
          emitLocation(latitude, longitude);
        },
        (err) => console.warn('Geolocation error:', err),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    };

    updateLocation();
    
    // watchPosition updates local state immediately so rider sees marker moving in realtime
    watchIdRef.current = navigator.geolocation.watchPosition((pos) => {
      const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
      setRiderPosition(coords);
      // We also do a quick socket emit to update the customer without hitting DB on every tiny watch update
      socket?.emit('rider:update_location', {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        orderId,
      });
    });

    // Periodic 10s poll updates DB/REST layer
    const intervalId = setInterval(updateLocation, 10000);

    return () => {
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
      clearInterval(intervalId);
    };
  }, [orderId, socket]);

  // Fetch route when rider position updates
  useEffect(() => {
    if (riderPosition && restaurantLocation) {
      const targetLoc =
        orderStatus === 'picked_up'
          ? [customerLocation.lat, customerLocation.lng]
          : [restaurantLocation.lat, restaurantLocation.lng];
      fetchRoute(riderPosition, targetLoc as [number, number]);
    }
  }, [riderPosition, orderStatus, restaurantLocation, customerLocation]);

  // Socket listener for updates
  useEffect(() => {
    socket?.emit('chat:join_order', orderId);
    socket?.on('rider:location_update', (data: { lat: number; lng: number; orderId: string }) => {
      if (data.orderId === orderId) {
        setRiderPosition([data.lat, data.lng]);
      }
    });
    return () => {
      socket?.off('rider:location_update');
    };
  }, [orderId, socket]);

  const positions: L.LatLngExpression[] = [
    [restaurantLocation.lat, restaurantLocation.lng],
    riderPosition || [restaurantLocation.lat, restaurantLocation.lng],
    [customerLocation.lat, customerLocation.lng],
  ];

  return (
    <MapContainer
      center={[restaurantLocation.lat, restaurantLocation.lng]}
      zoom={13}
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

      {/* Restaurant marker */}
      <Marker position={[restaurantLocation.lat, restaurantLocation.lng]} icon={restaurantIcon}>
        <Popup>
          <div className="text-sm">
            <p className="font-bold">{restaurantLocation.name}</p>
            <p className="text-xs text-gray-600">{restaurantLocation.address}</p>
          </div>
        </Popup>
      </Marker>

      {/* Rider marker */}
      {riderPosition && (
        <Marker position={riderPosition} icon={riderIcon}>
          <Popup>Your Delivery Partner</Popup>
        </Marker>
      )}

      {/* Customer marker */}
      <Marker position={[customerLocation.lat, customerLocation.lng]} icon={customerIcon}>
        <Popup>
          <div className="text-sm">
            <p className="font-bold">{customerLocation.name}</p>
            <p className="text-xs text-gray-600">{customerLocation.address}</p>
          </div>
        </Popup>
      </Marker>

      {/* Route polyline */}
      {routeCoords.length > 0 && (
        <Polyline
          positions={routeCoords}
          pathOptions={{
            color: '#f97316',
            weight: 4,
            dashArray: orderStatus === 'picked_up' ? '' : '10 6',
            opacity: 0.9,
          }}
        />
      )}

      <FitBounds positions={positions} />
    </MapContainer>
  );
};

export default RiderLiveMap;
