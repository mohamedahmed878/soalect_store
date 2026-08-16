import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Reveal from "../../components/Reveal/Reveal";
import SEO from "../../components/SEO/SEO";
import { api } from "../../services/api";
import { getSocket, joinUserRoom, disconnectSocket } from "../../services/socket";
import { formatDate, formatPrice, ORDER_STATUS_LABELS, ORDER_STATUS_STEPS } from "../../utils/format";
import "./account.css";

function OrderStatusTracker({ status }) {
  if (status === "Cancelled") {
    return (
      <div className="status-cancelled">
        <span className="status-cancelled__dot" />
        ملغي
      </div>
    );
  }

  const currentIndex = ORDER_STATUS_STEPS.indexOf(status);
  return (
    <div className="status-tracker">
      {ORDER_STATUS_STEPS.map((step, i) => (
        <div className={`status-step ${i <= currentIndex ? "is-done" : ""}`} key={step}>
          <span className="status-step__dot" />
          <span className="status-step__label">{ORDER_STATUS_LABELS[step]}</span>
          {i < ORDER_STATUS_STEPS.length - 1 && <span className="status-step__line" />}
        </div>
      ))}
    </div>
  );
}

export default function Account() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState(null);
  const [justUpdated, setJustUpdated] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);
  const [cancelError, setCancelError] = useState(null);

  useEffect(() => {
    if (!user) return;

    api.getMyOrders().then(setOrders);

    // Live updates: when the admin changes an order's status, it appears
    // here immediately without needing a page refresh.
    joinUserRoom(user.id || user._id);
    const socket = getSocket();

    function handleUpdated(updatedOrder) {
      setOrders((prev) => {
        if (!prev) return prev;
        const exists = prev.some((o) => o.orderNumber === updatedOrder.orderNumber);
        if (!exists) return prev;
        return prev.map((o) =>
          o.orderNumber === updatedOrder.orderNumber
            ? { ...updatedOrder, id: updatedOrder.orderNumber, totals: { subtotal: updatedOrder.subtotal } }
            : o
        );
      });
      setJustUpdated(updatedOrder.orderNumber);
      setTimeout(() => setJustUpdated(null), 3000);
    }

    socket.on("order:updated", handleUpdated);

    return () => {
      socket.off("order:updated", handleUpdated);
      disconnectSocket();
    };
  }, [user]);

  async function handleCancel(order) {
    if (!window.confirm(`متأكد إنك عايز تلغي طلب رقم ${order.id}؟`)) return;
    setCancellingId(order.id);
    setCancelError(null);
    try {
      const updated = await api.cancelOrder(order._id);
      setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, ...updated } : o)));
    } catch (err) {
      setCancelError(err.message);
    } finally {
      setCancellingId(null);
    }
  }

  if (!user) {
    return (
      <section className="section container" style={{ textAlign: "center" }}>
        <p className="eyebrow" style={{ justifyContent: "center" }}>حسابي</p>
        <h1 className="section-title" style={{ marginBottom: 16 }}>سجّل دخولك الأول</h1>
        <p style={{ color: "var(--text-mid)", marginBottom: 26 }}>
          لازم تسجل الدخول عشان تشوف بياناتك وطلباتك السابقة.
        </p>
        <div style={{ display: "flex", gap: 14, justifyContent: "center" }}>
          <Link to="/login" className="btn btn-primary">تسجيل الدخول</Link>
          <Link to="/register" className="btn btn-outline">إنشاء حساب</Link>
        </div>
      </section>
    );
  }

  return (
    <section className="section container">
      <SEO title="حسابي" path="/account" noindex />
      <Reveal>
        <div className="account-head">
          <div>
            <p className="eyebrow">حسابي</p>
            <h1 className="section-title">أهلًا، {user.name}</h1>
          </div>
          <button
            className="btn btn-outline"
            onClick={() => {
              logout();
              navigate("/");
            }}
          >
            تسجيل الخروج
          </button>
        </div>
      </Reveal>

      <div className="account-grid">
        <Reveal delay={0.05} className="account-card">
          <h3>بياناتي</h3>
          <div className="account-field">
            <span>الاسم</span>
            <strong>{user.name}</strong>
          </div>
          <div className="account-field">
            <span>البريد الإلكتروني</span>
            <strong>{user.email}</strong>
          </div>
        </Reveal>

        <Reveal delay={0.1} className="account-orders">
          <h3>طلباتي السابقة</h3>
          {cancelError && <p className="field-error" style={{ marginBottom: 14 }}>{cancelError}</p>}

          {!orders ? (
            <p style={{ color: "var(--text-mid)" }}>جاري التحميل...</p>
          ) : orders.length === 0 ? (
            <div className="account-orders__empty">
              <p>لسه معملتش أي طلب.</p>
              <Link to="/products" className="btn btn-primary btn-sm">ابدأ التسوق</Link>
            </div>
          ) : (
            <div className="order-list">
              {orders.map((order) => (
                <div className={`order-card ${justUpdated === order.orderNumber ? "order-card--pulse" : ""}`} key={order.id}>
                  <div className="order-card__head">
                    <div>
                      <p className="order-card__id">طلب رقم {order.id}</p>
                      <p className="order-card__date">{formatDate(order.createdAt)}</p>
                    </div>
                    <div style={{ textAlign: "left" }}>
                      {order.discountAmount > 0 && (
                        <p className="order-card__discount">خصم كود {order.discountCode}: -{formatPrice(order.discountAmount)}</p>
                      )}
                      <p className="order-card__total">{formatPrice(order.totals.subtotal - (order.discountAmount || 0))}</p>
                    </div>
                  </div>

                  <OrderStatusTracker status={order.status} />

                  <ul className="order-card__items">
                    {order.items.map((item, i) => (
                      <li key={`${item.product}-${item.color}-${item.size}-${i}`}>
                        {item.name} · {item.color} · {item.size} × {item.qty}
                      </li>
                    ))}
                  </ul>

                  {order.status === "New" && (
                    <button
                      className="order-card__cancel"
                      onClick={() => handleCancel(order)}
                      disabled={cancellingId === order.id}
                    >
                      {cancellingId === order.id ? "جاري الإلغاء..." : "إلغاء الطلب"}
                    </button>
                  )}
                  {order.status === "New" && (
                    <p className="order-card__cancel-note">يمكنك إلغاء الطلب قبل تأكيده من قبل الإدارة</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </Reveal>
      </div>
    </section>
  );
}
