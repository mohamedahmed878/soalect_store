import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import OrderTable from "../../components/OrderTable/OrderTable";
import { adminApi } from "../../services/api";
import { getSocket, joinAdminRoom, disconnectSocket } from "../../services/socket";
import { formatPrice } from "../../utils/format";

const RANGES = [
  { value: "1h", label: "آخر ساعة" },
  { value: "24h", label: "آخر يوم" },
  { value: "7d", label: "آخر أسبوع" },
  { value: "30d", label: "آخر شهر" },
  { value: "365d", label: "آخر سنة" },
  { value: "all", label: "منذ الإنشاء" },
];

const RANGE_MS = {
  "1h": 60 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
  "365d": 365 * 24 * 60 * 60 * 1000,
};

const BUCKET_COUNT = 8;

function bucketize(orders, rangeStart, rangeEnd) {
  const span = rangeEnd - rangeStart || 1;
  const bucketMs = span / BUCKET_COUNT;
  const buckets = Array.from({ length: BUCKET_COUNT }, () => 0);

  orders.forEach((o) => {
    const t = new Date(o.createdAt).getTime();
    if (t < rangeStart || t > rangeEnd) return;
    let idx = Math.floor((t - rangeStart) / bucketMs);
    if (idx >= BUCKET_COUNT) idx = BUCKET_COUNT - 1;
    if (idx < 0) idx = 0;
    buckets[idx] += o.totals.subtotal;
  });

  return buckets;
}

export default function Dashboard() {
  const [products, setProducts] = useState(null);
  const [orders, setOrders] = useState(null);
  const [users, setUsers] = useState(null);
  const [range, setRange] = useState("7d");

  useEffect(() => {
    adminApi.getProducts().then(setProducts);
    adminApi.getOrders().then(setOrders);
    adminApi.getUsers().then(setUsers);

    // Live sync so the overview numbers move the moment a customer checks
    // out, without needing to refresh the page.
    joinAdminRoom();
    const socket = getSocket();

    function mapIncoming(o) {
      return { ...o, id: o.orderNumber, totals: { subtotal: o.subtotal } };
    }

    function handleNew(order) {
      setOrders((prev) => (prev ? [mapIncoming(order), ...prev] : prev));
    }

    function handleUpdated(order) {
      const mapped = mapIncoming(order);
      setOrders((prev) => (prev ? prev.map((o) => (o._id === mapped._id ? mapped : o)) : prev));
    }

    socket.on("order:new", handleNew);
    socket.on("order:updated", handleUpdated);

    return () => {
      socket.off("order:new", handleNew);
      socket.off("order:updated", handleUpdated);
      disconnectSocket();
    };
  }, []);

  const stats = useMemo(() => {
    if (!orders || !products || !users) return null;
    const revenue = orders.reduce((sum, o) => sum + o.totals.subtotal, 0);
    const pending = orders.filter((o) => o.status === "New" || o.status === "Confirmed").length;
    return { revenue, orders: orders.length, products: products.length, users: users.length, pending };
  }, [orders, products, users]);

  const periodAnalytics = useMemo(() => {
    if (!orders) return null;

    const now = Date.now();
    let rangeStart;
    if (range === "all") {
      rangeStart = orders.length
        ? Math.min(...orders.map((o) => new Date(o.createdAt).getTime()))
        : now - RANGE_MS["7d"];
    } else {
      rangeStart = now - RANGE_MS[range];
    }

    const inRange = orders.filter((o) => new Date(o.createdAt).getTime() >= rangeStart);
    const revenue = inRange.reduce((sum, o) => sum + o.totals.subtotal, 0);
    const avgOrder = inRange.length ? Math.round(revenue / inRange.length) : 0;
    const buckets = bucketize(orders, rangeStart, now);
    const maxBucket = Math.max(...buckets, 1);

    return {
      revenue,
      ordersCount: inRange.length,
      avgOrder,
      buckets,
      maxBucket,
    };
  }, [orders, range]);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>نظرة عامة</h1>
          <p>ملخص أداء المتجر — بيانات حية من قاعدة البيانات.</p>
        </div>
        <Link to="/products" className="btn btn-primary">+ إضافة منتج</Link>
      </div>

      {stats && (
        <div className="stat-grid">
          <div className="stat-card">
            <p className="stat-card__label">إجمالي الإيرادات</p>
            <p className="stat-card__value">{formatPrice(stats.revenue)}</p>
            <p className="stat-card__delta">من {stats.orders} طلب</p>
          </div>
          <div className="stat-card">
            <p className="stat-card__label">الطلبات</p>
            <p className="stat-card__value">{stats.orders}</p>
            <p className="stat-card__delta">{stats.pending} طلب محتاج متابعة</p>
          </div>
          <div className="stat-card">
            <p className="stat-card__label">المنتجات</p>
            <p className="stat-card__value">{stats.products}</p>
            <p className="stat-card__delta">نشطة في المتجر</p>
          </div>
          <div className="stat-card">
            <p className="stat-card__label">العملاء</p>
            <p className="stat-card__value">{stats.users}</p>
            <p className="stat-card__delta">مسجلين في المتجر</p>
          </div>
        </div>
      )}

      {/* ---- Time-range analytics ---- */}
      <div className="card analytics-card">
        <div className="page-head" style={{ marginBottom: 4 }}>
          <h2 style={{ fontSize: 16 }}>تحليل الأرباح</h2>
        </div>

        <div className="chip-select" style={{ marginBottom: 20 }}>
          {RANGES.map((r) => (
            <button
              key={r.value}
              className={`chip ${range === r.value ? "is-active" : ""}`}
              onClick={() => setRange(r.value)}
            >
              {r.label}
            </button>
          ))}
        </div>

        {!periodAnalytics ? (
          <p style={{ color: "var(--text-mid)" }}>جاري التحميل...</p>
        ) : (
          <>
            <div className="analytics-summary">
              <div>
                <p className="stat-card__label">الأرباح في الفترة دي</p>
                <p className="stat-card__value">{formatPrice(periodAnalytics.revenue)}</p>
              </div>
              <div>
                <p className="stat-card__label">عدد الطلبات</p>
                <p className="stat-card__value">{periodAnalytics.ordersCount}</p>
              </div>
              <div>
                <p className="stat-card__label">متوسط قيمة الطلب</p>
                <p className="stat-card__value">{formatPrice(periodAnalytics.avgOrder)}</p>
              </div>
            </div>

            <div className="bar-chart">
              {periodAnalytics.buckets.map((value, i) => (
                <div className="bar-chart__col" key={i}>
                  <div
                    className="bar-chart__bar"
                    style={{ height: `${Math.max(4, (value / periodAnalytics.maxBucket) * 100)}%` }}
                    title={formatPrice(value)}
                  />
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="card" style={{ padding: 26 }}>
        <div className="page-head" style={{ marginBottom: 18 }}>
          <h2 style={{ fontSize: 16 }}>أحدث الطلبات</h2>
          <Link to="/orders" className="btn btn-outline btn-sm">عرض كل الطلبات</Link>
        </div>
        {!orders ? (
          <p style={{ color: "var(--text-mid)" }}>جاري التحميل...</p>
        ) : (
          <OrderTable orders={orders.slice(0, 5)} compact />
        )}
      </div>
    </>
  );
}
