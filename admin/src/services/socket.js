import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

let socket = null;

export function getSocket() {
  if (!socket) {
    socket = io(SOCKET_URL, { autoConnect: false });
  }
  return socket;
}

export function joinAdminRoom() {
  const s = getSocket();
  if (!s.connected) s.connect();
  s.emit("join:admin");
}

export function disconnectSocket() {
  if (socket?.connected) socket.disconnect();
}
