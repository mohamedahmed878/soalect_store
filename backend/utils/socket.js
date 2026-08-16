let ioInstance = null;

export function setIO(io) {
  ioInstance = io;
}

export function getIO() {
  return ioInstance;
}

/**
 * Room conventions:
 * - "admin"        → every connected admin dashboard client
 * - "user:<id>"     → a single customer's active tabs
 *
 * Events:
 * - "order:new"     → emitted to "admin" when a customer places an order
 * - "order:updated" → emitted to "admin" AND "user:<id>" when status changes
 * - "order:deleted" → emitted to "admin" when an order is hard-deleted
 */
export function emitOrderCreated(order) {
  getIO()?.to("admin").emit("order:new", order);
}

export function emitOrderUpdated(order) {
  getIO()?.to("admin").emit("order:updated", order);
  getIO()?.to(`user:${order.user}`).emit("order:updated", order);
}

export function emitOrderDeleted(orderId) {
  getIO()?.to("admin").emit("order:deleted", orderId);
}
