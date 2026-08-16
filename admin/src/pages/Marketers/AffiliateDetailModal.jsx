import { useEffect, useState } from "react";
import { adminApi } from "../../services/api";
import { formatDate, formatPrice, ORDER_STATUS_LABELS } from "../../utils/format";

const STATUS_LABELS = { pending: "قيد المراجعة", approved: "مقبول", rejected: "مرفوض" };

export default function AffiliateDetailModal({ affiliateId, onClose, onChanged }) {
  const [data, setData] = useState(null);
  const [codeInput, setCodeInput] = useState("");
  const [discountInput, setDiscountInput] = useState("0");
  const [codeError, setCodeError] = useState(null);
  const [savingCode, setSavingCode] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    adminApi.getAffiliateById(affiliateId).then((d) => {
      setData(d);
      setCodeInput(d.referralCode);
      setDiscountInput(String(d.discountAmount || 0));
    });
  }, [affiliateId]);

  async function handleStatus(status) {
    setBusy(true);
    try {
      await adminApi.updateAffiliateStatus(affiliateId, status);
      const refreshed = await adminApi.getAffiliateById(affiliateId);
      setData(refreshed);
      onChanged?.();
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveCode() {
    if (!codeInput.trim()) {
      setCodeError("اكتب كود صحيح");
      return;
    }
    setSavingCode(true);
    setCodeError(null);
    try {
      const updated = await adminApi.updateAffiliateCode(affiliateId, codeInput, Number(discountInput) || 0);
      setData((d) => ({ ...d, referralCode: updated.referralCode, discountAmount: updated.discountAmount }));
      onChanged?.();
    } catch (err) {
      setCodeError(err.message);
    } finally {
      setSavingCode(false);
    }
  }

  const referralLink = data ? `${window.location.origin.replace(":5174", ":5173")}/products?ref=${data.referralCode}` : "";

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal__head">
          <h3>بيانات المسوق</h3>
          <button className="btn-icon" onClick={onClose} aria-label="إغلاق">
            <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {!data ? (
          <p style={{ color: "var(--text-mid)" }}>جاري التحميل...</p>
        ) : (
          <>
            <div className="affiliate-detail__head">
              <div>
                <p className="affiliate-detail__name">{data.user?.name}</p>
                <p className="affiliate-detail__meta">{data.user?.email} · {data.phone}</p>
              </div>
              <span className={`status-pill status-pill--${data.status === "approved" ? "delivered" : data.status === "rejected" ? "rejected" : "new"}`}>
                {STATUS_LABELS[data.status]}
              </span>
            </div>

            <div className="affiliate-detail__section">
              <label>رقم الطلب</label>
              <p>{data.requestNumber} · قدّم الطلب في {formatDate(data.createdAt)}</p>
            </div>

            <div className="affiliate-detail__section">
              <label>هيسوق إزاي</label>
              <p>{data.marketingPlan}</p>
            </div>

            <div className="affiliate-detail__section">
              <label>كود المسوق (رابط إحالة + كود خصم بالكارت)</label>
              <div className="color-row">
                <input
                  type="text"
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                  style={{ direction: "ltr", textAlign: "right" }}
                />
                <button className="btn btn-outline btn-sm" onClick={handleSaveCode} disabled={savingCode}>
                  {savingCode ? "جاري الحفظ..." : "حفظ"}
                </button>
              </div>
              {codeError && <span className="field-error">{codeError}</span>}
              <p style={{ fontSize: 12, color: "var(--text-low)", marginTop: 6, direction: "ltr", textAlign: "right" }}>
                {referralLink}
              </p>

              <label style={{ marginTop: 16 }}>قيمة الخصم اللي بيدّيه الكود للعميل (ج.م)</label>
              <input
                type="number"
                min="0"
                value={discountInput}
                onChange={(e) => setDiscountInput(e.target.value)}
                placeholder="0"
                style={{ maxWidth: 160 }}
              />
              <p style={{ fontSize: 12, color: "var(--text-low)", marginTop: 6 }}>
                لو حطيت 0، الكود هيشتغل بس كإحالة من غير خصم على العميل. دوس "حفظ" فوق عشان القيمة تتحفظ.
              </p>
            </div>

            <div className="affiliate-detail__stats">
              <div>
                <p className="stat-card__label">إجمالي الطلبات</p>
                <p className="stat-card__value">{data.stats.ordersCount}</p>
              </div>
              <div>
                <p className="stat-card__label">تم التسليم</p>
                <p className="stat-card__value">{data.stats.deliveredCount}</p>
              </div>
              <div>
                <p className="stat-card__label">عمولة مؤكدة</p>
                <p className="stat-card__value" style={{ color: "var(--lime)" }}>{formatPrice(data.stats.commission)}</p>
              </div>
              <div>
                <p className="stat-card__label">عمولة معلقة</p>
                <p className="stat-card__value" style={{ color: "var(--warn)" }}>{formatPrice(data.stats.pendingCommission)}</p>
              </div>
            </div>
            <p style={{ fontSize: 12, color: "var(--text-low)", marginBottom: 20 }}>
              العمولة بتتأكد بس لما الطلب يوصل لحالة "تم التسليم" — الطلبات لسه في الطريق بتتحسب "معلقة" لحد ما تتأكد.
            </p>

            {data.orders?.length > 0 && (
              <div className="affiliate-detail__section">
                <label>الطلبات المحوّلة من خلاله</label>
                <div className="table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>رقم الطلب</th>
                        <th>التاريخ</th>
                        <th>القيمة</th>
                        <th>الحالة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.orders.map((o) => (
                        <tr key={o._id}>
                          <td className="order-id-cell">{o.orderNumber}</td>
                          <td>{formatDate(o.createdAt)}</td>
                          <td>{formatPrice(o.subtotal)}</td>
                          <td>{ORDER_STATUS_LABELS[o.status]}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
              {data.status !== "approved" && (
                <button className="btn btn-primary" style={{ flex: 1 }} disabled={busy} onClick={() => handleStatus("approved")}>
                  قبول المسوق
                </button>
              )}
              {data.status !== "rejected" && (
                <button className="btn btn-danger" style={{ flex: 1 }} disabled={busy} onClick={() => handleStatus("rejected")}>
                  {data.status === "approved" ? "إيقاف المسوق" : "رفض الطلب"}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
