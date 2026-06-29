import { useEffect, useState } from "react";

import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import type { IOrder } from "../types";
import axios from "axios";
import { riderService, realtimeService } from "../main";
import { useSocket } from "../context/SocketContext";


const riderIcon = L.divIcon({
  className: "",
  html: `<div style="background:var(--color-route,#FF5733);width:20px;height:20px;border-radius:50%;border:3px solid white;box-shadow:0 0 12px var(--color-route);animation:rider-pulse 2s infinite;"></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

const destIcon = L.divIcon({
  className: "",
  html: `<div style="background:#10B981;width:16px;height:16px;border-radius:50%;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length >= 2) map.fitBounds(positions as any, { padding: [40, 40] });
  }, [positions, map]);
  return null;
}

interface RiderOrderMapProps {
  order: IOrder;
}

const RiderOrderMap = ({ order }: RiderOrderMapProps) => {
  const { socket } = useSocket();
  const [myLocation, setMyLocation] = useState<[number, number] | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);



  const emitLocation = async (latitude: number, longitude: number) => {
    // Keep existing REST update (core rider location flow)
    axios
      .put(
        `${riderService}/api/rider/location`,
        { latitude, longitude },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      )
      .catch((err) => console.error("Rider location update failed:", err));

    // Real-time relay (customer tracking + rider self-map)
    const token = localStorage.getItem("token");
    if (!token) return;

    // Bidirectional requirement: emit into both rooms.
    // - customer room is always `order.userId`
    // - rider room is current user id from socket auth; if socket/user mismatch, self-map still works via local setMyLocation.
    const customerRoom = `user:${order.userId}`;
    // Socket types don’t expose `data` on the client-side Socket type; emit to customer room
    // and rely on local rendering for the rider’s own view.
    const selfRoom = null;


    const rooms = [customerRoom, selfRoom].filter(Boolean) as string[];

    await Promise.all(
      rooms.map((room) =>
        axios.post(
          `${realtimeService}/api/v1/internal/emit`,
          {
            event: "rider:location",
            room,
            payload: {
              latitude,
              longitude,
              orderId: order._id,
              updatedAt: Date.now(),
            },
          },
          {
            headers: {
              "x-internal-key": import.meta.env.VITE_INTERNAL_SERVICE_KEY,
            },
          }
        )
      )
    );
  };

  // Rider emits real browser geolocation while this map is mounted
  useEffect(() => {
    if (!navigator.geolocation || !order?._id) return;

    let mounted = true;

    const fetchLocation = () => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (!mounted) return;
          const latitude = pos.coords.latitude;
          const longitude = pos.coords.longitude;
          setMyLocation([latitude, longitude]);
          setLastUpdatedAt(Date.now());
          emitLocation(latitude, longitude).catch(() => { });
        },
        (err) => console.log("Location Error:", err),
        {
          enableHighAccuracy: true,
          maximumAge: 5000,
          timeout: 10000,
        }
      );
    };

    fetchLocation();
    const interval = setInterval(fetchLocation, 10000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order._id, order.userId, socket]);

  // Rider map also listens to the relayed event so its rendering is driven by the same socket stream
  useEffect(() => {
    if (!socket || !order?._id) return;

    const onLoc = ({ latitude, longitude, updatedAt }: any) => {
      if (!latitude || !longitude) return;
      setMyLocation([latitude, longitude]);
      setLastUpdatedAt(updatedAt ?? Date.now());
    };

    socket.on("rider:location", onLoc);
    return () => {
      socket.off("rider:location", onLoc);
    };
  }, [socket, order?._id]);




  const dest = order.deliveryAddress
    ? ([order.deliveryAddress.latitude, order.deliveryAddress.longitude] as [number, number])
    : null;



  const positions: [number, number][] = myLocation && dest ? [myLocation, dest] : [];

  const staleSeconds = lastUpdatedAt ? Math.floor((Date.now() - lastUpdatedAt) / 1000) : null;
  const isStale = staleSeconds != null && staleSeconds >= 20;

  if (!myLocation || !dest) {
    return (
      <div
        className="w-full h-52 rounded-2xl flex items-center justify-center glass-card"
      >
        <p className="text-xs font-mono" style={{ color: "var(--color-manifest)" }}>
          Locating delivery point…
        </p>
      </div>
    );
  }


  return (
    <div className="w-full h-52 rounded-2xl overflow-hidden shadow-sm" style={{ border: "1px solid var(--color-rule)" }}>
      {isStale && (
        <div className="absolute z-[1000] top-3 left-3 px-3 py-1.5 rounded-full glass-card" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
          <span className="text-[10px] font-mono font-bold" style={{ color: "var(--color-manifest)" }}>
            Last updated {staleSeconds}s ago
          </span>
        </div>
      )}

      <MapContainer
        center={myLocation}
        zoom={13}
        style={{ width: "100%", height: "100%", zIndex: 1 }}
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <FitBounds positions={positions} />
        <Marker position={myLocation} icon={riderIcon} />
        <Marker position={dest} icon={destIcon} />
        <Polyline
          positions={positions}
          pathOptions={{ color: "var(--color-route, #FF5733)", weight: 3, dashArray: "6 4" }}
        />
      </MapContainer>
    </div>
  );

};

export default RiderOrderMap;
