import { useEffect, useState } from "react";
import OrderTable from "../../components/OrderTable/OrderTable";
import { adminApi } from "../../services/api";
import { getSocket, joinAdminRoom, disconnectSocket } from "../../services/socket";
import { ORDER_STATUS_LABELS } from "../../utils/format";

const FILTERS = ["New", "Confirmed", "Shipped", "Delivered", "Cancelled"];

export default function Orders() {
  const [orders, setOrders] = useState(null);
  const [status, setStatus] = useState("all");
  const [newOrderId, setNewOrderId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => {
    adminApi.getOrders().then(setOrders);

    // Live sync: a new checkout on the storefront (or a status change made
    // from another admin tab) appears here instantly, no refresh needed.
    joinAdminRoom();
    const socket = getSocket();

    function mapIncoming(o) {
      return { ...o, id: o.orderNumber, totals: { subtotal: o.subtotal } };
    }

    function handleNew(order) {
      const mapped = mapIncoming(order);
      setOrders((prev) => (prev ? [mapped, ...prev] : [mapped]));
      setNewOrderId(mapped.id);
      setTimeout(() => setNewOrderId(null), 3000);
    }

    function handleUpdated(order) {
      const mapped = mapIncoming(order);
      setOrders((prev) => (prev ? prev.map((o) => (o._id === mapped._id ? mapped : o)) : prev));
    }

    function handleDeleted(orderId) {
      setOrders((prev) => (prev ? prev.filter((o) => o._id !== orderId) : prev));
    }

    socket.on("order:new", handleNew);
    socket.on("order:updated", handleUpdated);
    socket.on("order:deleted", handleDeleted);

    return () => {
      socket.off("order:new", handleNew);
      socket.off("order:updated", handleUpdated);
      socket.off("order:deleted", handleDeleted);
      disconnectSocket();
    };
  }, []);

  async function handleStatusChange(order, newStatus) {
    const updated = await adminApi.updateOrderStatus(order._id, newStatus);
    setOrders((prev) => prev.map((o) => (o._id === updated._id ? updated : o)));
  }

  async function handleDelete() {
    await adminApi.deleteOrder(confirmDelete._id);
    setOrders((prev) => prev.filter((o) => o._id !== confirmDelete._id));
    setConfirmDelete(null);
  }

  const filtered = orders ? (status === "all" ? orders : orders.filter((o) => o.status === status)) : null;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>الطلبات</h1>
          <p>تابع الطلبات وغيّر حالتها: جديد ← تم التأكيد ← تم الشحن ← تم التسليم.</p>
        </div>
      </div>

      <div className="chip-select" style={{ marginBottom: 20 }}>
        <button className={`chip ${status === "all" ? "is-active" : ""}`} onClick={() => setStatus("all")}>
          الكل
        </button>
        {FILTERS.map((s) => (
          <button key={s} className={`chip ${status === s ? "is-active" : ""}`} onClick={() => setStatus(s)}>
            {ORDER_STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      <div className="card">
        {!filtered ? (
          <div className="table-empty">جاري التحميل...</div>
        ) : (
          <OrderTable
            orders={filtered}
            onStatusChange={handleStatusChange}
            onDelete={setConfirmDelete}
            highlightId={newOrderId}
          />
        )}
      </div>

      {confirmDelete && (
        <div className="modal-backdrop" onClick={() => setConfirmDelete(null)}>
          <div className="modal" style={{ maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: 12 }}>حذف الطلب رقم {confirmDelete.id}؟</h3>
            <p style={{ color: "var(--text-mid)", fontSize: 14, marginBottom: 24 }}>
              الإجراء ده مش هينفع يتراجع فيه. الطلب هيتشال نهائيًا من قاعدة البيانات.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn btn-danger" style={{ flex: 1 }} onClick={handleDelete}>
                نعم، احذف
              </button>
              <button className="btn btn-outline" onClick={() => setConfirmDelete(null)}>إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
