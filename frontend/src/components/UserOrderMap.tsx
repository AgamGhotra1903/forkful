import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface UserOrderMapProps {
  orderId: string;
  restaurantLocation: { lat: number; lng: number; name: string };
  customerLocation: { lat: number; lng: number; address: string };
  riderLocation?: { lat: number; lng: number };
  orderStatus: string;
  socket: any;
}

const FitBoundsUser = ({ positions }: { positions: L.LatLngExpression[] }) => {
  const map = useMap();
  useEffect(() => {
    if (positions.length >= 2) {
      map.fitBounds(positions as L.LatLngBoundsExpression, { padding: [80, 80], maxZoom: 16 });
    }
  }, [positions, map]);
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
      orderStatus === 'picked_up' ? '0.4' : '1'
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
        // For early statuses (placed/accepted/preparing/ready_for_rider),
        // draw the route from restaurant to customer so user sees the full delivery path.
        // Once a rider is assigned/picked up, route from rider's current position.
        const hasRider = ['rider_assigned', 'picked_up'].includes(orderStatus);
        const from = hasRider && riderLocation
          ? [riderLocation.lat, riderLocation.lng]
          : [restaurantLocation.lat, restaurantLocation.lng];
        const to = [customerLocation.lat, customerLocation.lng];

        const res = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`
        );
        const data = await res.json();
        if (data.routes?.[0]) {
          const coords = data.routes[0].geometry.coordinates.map(([lng, lat]: number[]) => [lat, lng] as [number, number]);
          setRouteCoords(coords);
        }
      } catch {
        // Fallback: straight line
        const hasRider = ['rider_assigned', 'picked_up'].includes(orderStatus);
        setRouteCoords([
          hasRider && riderLocation
            ? [riderLocation.lat, riderLocation.lng]
            : [restaurantLocation.lat, restaurantLocation.lng],
          [customerLocation.lat, customerLocation.lng],
        ]);
      }
    };
    fetchRoute();
  }, [orderStatus, riderLocation, restaurantLocation, customerLocation]);

  // Socket: parent (OrderPage) owns riderLocation and passes it as a prop.
  // We just join the order room so chat works.
  useEffect(() => {
    socket?.emit('chat:join_order', orderId);
    return () => {
      socket?.off('rider:location_update');
    };
  }, [orderId, socket]);

  const positions: L.LatLngExpression[] = riderLocation
    ? [
        [restaurantLocation.lat, restaurantLocation.lng],
        [riderLocation.lat, riderLocation.lng],
        [customerLocation.lat, customerLocation.lng],
      ]
    : [
        [restaurantLocation.lat, restaurantLocation.lng],
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
          </div>
        </Popup>
      </Marker>

      {/* Rider marker */}
      {riderLocation && (
        <Marker position={[riderLocation.lat, riderLocation.lng]} icon={riderIcon}>
          <Popup>Your Delivery Partner</Popup>
        </Marker>
      )}

      {/* Customer marker */}
      <Marker position={[customerLocation.lat, customerLocation.lng]} icon={customerIcon}>
        <Popup>
          <div className="text-sm">
            <p className="font-bold">Delivery Location</p>
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
            weight: 3,
            // Solid line when rider is actively moving; dashed while waiting
            dashArray: ['rider_assigned', 'picked_up'].includes(orderStatus) ? '' : '8 5',
            opacity: 0.9,
          }}
        />
      )}

      <FitBoundsUser positions={positions} />
    </MapContainer>
  );
};

export default UserOrderMap;
