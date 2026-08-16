import { formatDate, formatPrice, ORDER_STATUS_LABELS, ORDER_STATUS_STEPS } from "../../utils/format";
import "./orderTable.css";

const STATUS_CLASS = {
  New: "status-pill--new",
  Confirmed: "status-pill--confirmed",
  Shipped: "status-pill--shipped",
  Delivered: "status-pill--delivered",
  Cancelled: "status-pill--rejected",
};

export default function OrderTable({ orders, onStatusChange, onDelete, compact = false, highlightId = null }) {
  if (orders.length === 0) {
    return <div className="table-empty">مفيش طلبات لسه.</div>;
  }

  return (
    <div className="table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            <th>رقم الطلب</th>
            <th>العميل</th>
            <th>التاريخ</th>
            <th>المنتجات</th>
            <th>الإجمالي</th>
            <th>الحالة</th>
            {!compact && <th></th>}
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => {
            const total = order.totals.subtotal - (order.discountAmount || 0);
            const isCancelled = order.status === "Cancelled";
            return (
              <tr key={order._id || order.id} className={highlightId === order.id ? "row-highlight" : ""}>
                <td className="order-id-cell">{order.id}</td>
                <td>
                  <p className="order-customer__name">{order.customer.fullName}</p>
                  <p className="order-customer__meta">{order.customer.governorate} · {order.customer.phone}</p>
                </td>
                <td>{formatDate(order.createdAt)}</td>
                <td>{order.items.length} منتج ({order.items.reduce((s, i) => s + i.qty, 0)} قطعة)</td>
                <td>
                  {formatPrice(total)}
                  {order.discountAmount > 0 && (
                    <div style={{ fontSize: 11, color: "var(--lime)" }}>خصم {order.discountCode}: -{formatPrice(order.discountAmount)}</div>
                  )}
                </td>
                <td>
                  <span className={`status-pill ${STATUS_CLASS[order.status]}`}>{ORDER_STATUS_LABELS[order.status]}</span>
                </td>
                {!compact && (
                  <td>
                    <div className="row-actions">
                      {!isCancelled ? (
                        <select
                          className="status-select"
                          value={order.status}
                          onChange={(e) => onStatusChange(order, e.target.value)}
                        >
                          {ORDER_STATUS_STEPS.map((s) => (
                            <option key={s} value={s}>
                              {ORDER_STATUS_LABELS[s]}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span style={{ fontSize: 12, color: "var(--text-low)" }}>ملغي من العميل</span>
                      )}
                      {onDelete && (
                        <button className="btn-icon" onClick={() => onDelete(order)} aria-label="حذف الطلب">
                          <svg viewBox="0 0 24 24" fill="none" width="15" height="15">
                            <path d="M5 7h14M9 7V5h6v2M7 7l1 13h8l1-13" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
