import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { io, type Socket } from "socket.io-client";
import { useAppData } from "./AppContext";
import { realtimeService } from "../main";

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({ socket: null, isConnected: false });

export const SocketProvider = ({ children }: { children: ReactNode }) => {
  const { isAuth } = useAppData();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!isAuth) {
      setSocket((prev) => {
        prev?.disconnect();
        return null;
      });
      setIsConnected(false);
      return;
    }

    const newSocket = io(realtimeService, {
      auth: {
        token: localStorage.getItem("token"),
      },
      // Support both WebSocket and polling for load-balanced setups
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
      // For Redis adapter with multiple instances - sticky sessions via ip_hash
      // Enable polling as fallback
      upgrade: true,
      forceNew: false,
    });

    newSocket.on("connect", () => {
      console.log("✅ Socket Connected:", newSocket.id);
      setSocket(newSocket);
      setIsConnected(true);
    });

    newSocket.on("disconnect", (reason) => {
      console.log("🔌 Socket Disconnected:", reason);
      setIsConnected(false);
    });

    newSocket.on("connect_error", (err) => {
      console.warn("⚠️ Socket Connection Error:", err.message);
    });

    newSocket.on("error", (err) => {
      console.error("❌ Socket Error:", err);
    });

    // Reconnection events
    newSocket.on("reconnect", () => {
      console.log("🔄 Socket Reconnected");
      setIsConnected(true);
    });

    newSocket.on("reconnect_attempt", () => {
      console.log("🔄 Attempting reconnection...");
    });

    newSocket.on("reconnect_error", (err) => {
      console.warn("⚠️ Reconnection Error:", err);
    });

    newSocket.on("reconnect_failed", () => {
      console.error("❌ Reconnection failed");
    });

    // Set immediately so listeners can attach
    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
      setSocket(null);
      setIsConnected(false);
    };
  }, [isAuth]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
