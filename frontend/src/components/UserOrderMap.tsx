import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import AppTileLayer from './AppTileLayer';

interface UserOrderMapProps {
  orderId: string;
  restaurantLocation: { lat: number; lng: number; name: string };
  customerLocation: { lat: number; lng: number; address: string };
  riderLocation?: { lat: number; lng: number };
  orderStatus: string;
  socket: any;
}

// Ensures Leaflet recalculates dimensions after framer-motion page transition animations
const InvalidateMapSize = () => {
  const map = useMap();
  useEffect(() => {
    const t1 = setTimeout(() => map.invalidateSize(), 100);
    const t2 = setTimeout(() => map.invalidateSize(), 350);
    const handleResize = () => map.invalidateSize();
    window.addEventListener("resize", handleResize);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener("resize", handleResize);
    };
  }, [map]);
  return null;
};

// Coordinated camera controller that prevents map.fitBounds and map.flyTo from colliding
const CameraController = ({
  positions,
  riderPosition,
  orderStatus,
}: {
  positions: [number, number][];
  riderPosition?: { lat: number; lng: number };
  orderStatus: string;
}) => {
  const map = useMap();
  const hasInitializedRef = useRef(false);
  const lastStatusRef = useRef(orderStatus);

  // Fit bounds on mount or when order status transitions
  useEffect(() => {
    const valid = positions.filter(
      (p) => Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1])
    );
    if (valid.length < 2) return;

    const statusChanged = lastStatusRef.current !== orderStatus;
    if (!hasInitializedRef.current || statusChanged) {
      hasInitializedRef.current = true;
      lastStatusRef.current = orderStatus;
      try {
        map.fitBounds(valid as L.LatLngBoundsExpression, { padding: [60, 60], maxZoom: 16 });
      } catch (err) {
        console.warn("fitBounds error:", err);
      }
    }
  }, [positions, orderStatus, map]);

  // Smoothly pan to rider when moving, without triggering concurrent animation errors
  useEffect(() => {
    if (!riderPosition || !Number.isFinite(riderPosition.lat) || !Number.isFinite(riderPosition.lng)) return;
    if (orderStatus === 'picked_up' && hasInitializedRef.current) {
      try {
        map.panTo([riderPosition.lat, riderPosition.lng], { animate: true, duration: 1 });
      } catch {}
    }
  }, [riderPosition, orderStatus, map]);

  return null;
};

const UserOrderMap: React.FC<UserOrderMapProps> = ({
  orderId,
  restaurantLocation,
  customerLocation,
  riderLocation,
  orderStatus,
  socket,
}) => {
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);

  // Safe coordinates
  const safeRestLat = Number.isFinite(restaurantLocation?.lat) ? restaurantLocation.lat : 28.6139;
  const safeRestLng = Number.isFinite(restaurantLocation?.lng) ? restaurantLocation.lng : 77.2090;
  const safeCustLat = Number.isFinite(customerLocation?.lat) ? customerLocation.lat : 28.5244;
  const safeCustLng = Number.isFinite(customerLocation?.lng) ? customerLocation.lng : 77.1855;

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
    html: `<div style="background:#10b981;border-radius:50% 50% 50% 0;width:36px;height:36px;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(16,185,129,0.5);border:1.5px solid white;opacity:${
      orderStatus === 'picked_up' ? '0.5' : '1'
    }">
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

  // Fetch route on component mount or when relevant props change
  useEffect(() => {
    const fetchRoute = async () => {
      try {
        const hasRider = ['rider_assigned', 'picked_up'].includes(orderStatus);
        const from = hasRider && riderLocation && Number.isFinite(riderLocation.lat)
          ? [riderLocation.lat, riderLocation.lng]
          : [safeRestLat, safeRestLng];
        const to = [safeCustLat, safeCustLng];

        const res = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`
        );
        const data = await res.json();
        if (data.routes?.[0]) {
          const coords = data.routes[0].geometry.coordinates.map(([lng, lat]: number[]) => [lat, lng] as [number, number]);
          setRouteCoords(coords);
        } else {
          setRouteCoords([from as [number, number], to as [number, number]]);
        }
      } catch {
        // Fallback: direct line
        const hasRider = ['rider_assigned', 'picked_up'].includes(orderStatus);
        setRouteCoords([
          hasRider && riderLocation && Number.isFinite(riderLocation.lat)
            ? [riderLocation.lat, riderLocation.lng]
            : [safeRestLat, safeRestLng],
          [safeCustLat, safeCustLng],
        ]);
      }
    };
    fetchRoute();
  }, [orderStatus, riderLocation, safeRestLat, safeRestLng, safeCustLat, safeCustLng]);

  useEffect(() => {
    socket?.emit('chat:join_order', orderId);
    return () => {
      socket?.off('rider:location_update');
    };
  }, [orderId, socket]);

  const positions: [number, number][] = riderLocation && Number.isFinite(riderLocation.lat)
    ? [
        [safeRestLat, safeRestLng],
        [riderLocation.lat, riderLocation.lng],
        [safeCustLat, safeCustLng],
      ]
    : [
        [safeRestLat, safeRestLng],
        [safeCustLat, safeCustLng],
      ];

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <MapContainer
        center={[safeRestLat, safeRestLng]}
        zoom={13}
        style={{ width: '100%', height: '100%' }}
        zoomControl={false}
        attributionControl={false}
      >
        <AppTileLayer />

        {/* Restaurant marker */}
        <Marker position={[safeRestLat, safeRestLng]} icon={restaurantIcon}>
          <Popup>
            <div className="text-sm">
              <p className="font-bold">{restaurantLocation?.name || "Restaurant"}</p>
            </div>
          </Popup>
        </Marker>

        {/* Rider marker */}
        {riderLocation && Number.isFinite(riderLocation.lat) && (
          <Marker position={[riderLocation.lat, riderLocation.lng]} icon={riderIcon}>
            <Popup>Your Delivery Partner</Popup>
          </Marker>
        )}

        {/* Customer marker */}
        <Marker position={[safeCustLat, safeCustLng]} icon={customerIcon}>
          <Popup>
            <div className="text-sm">
              <p className="font-bold">Delivery Location</p>
              <p className="text-xs text-gray-600">{customerLocation?.address || ""}</p>
            </div>
          </Popup>
        </Marker>

        {/* Route polyline */}
        {routeCoords.length > 1 && (
          <Polyline
            positions={routeCoords}
            pathOptions={{
              color: '#f97316',
              weight: 3.5,
              dashArray: ['rider_assigned', 'picked_up'].includes(orderStatus) ? '' : '8 5',
              opacity: 0.9,
            }}
          />
        )}

        <CameraController
          positions={positions}
          riderPosition={riderLocation}
          orderStatus={orderStatus}
        />
        <InvalidateMapSize />
      </MapContainer>
    </div>
  );
};

export default UserOrderMap;
