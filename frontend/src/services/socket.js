import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

let socket = null;

// Lazily creates a single shared socket connection and joins this user's
// private room so order status changes made in the admin panel push here
// live, without the customer needing to refresh.
export function getSocket() {
  if (!socket) {
    socket = io(SOCKET_URL, { autoConnect: false });
  }
  return socket;
}

export function joinUserRoom(userId) {
  const s = getSocket();
  if (!s.connected) s.connect();
  s.emit("join:user", userId);
}

export function disconnectSocket() {
  if (socket?.connected) socket.disconnect();
}
