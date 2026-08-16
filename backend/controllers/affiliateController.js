import asyncHandler from "express-async-handler";
import crypto from "crypto";
import Affiliate from "../models/Affiliate.js";
import Order from "../models/Order.js";

function generateReferralCode(name) {
  const base = (name || "SLT")
    .normalize("NFKD")
    .replace(/[^a-zA-Z]/g, "")
    .slice(0, 6)
    .toUpperCase() || "SLT";
  const suffix = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `${base}-${suffix}`;
}

function generateRequestNumber() {
  return "AFF-" + Math.floor(100000 + Math.random() * 900000);
}

// @route  POST /api/affiliates/apply
// @access Private
export const applyAsAffiliate = asyncHandler(async (req, res) => {
  const { phone, marketingPlan } = req.body;

  if (!phone || !marketingPlan) {
    res.status(400);
    throw new Error("من فضلك اكتب رقم موبايلك وإزاي هتسوق للمنتجات");
  }

  const existing = await Affiliate.findOne({ user: req.user._id });
  if (existing) {
    res.status(400);
    throw new Error("انت قدمت طلب انضمام بالفعل");
  }

  let referralCode;
  let attempts = 0;
  do {
    referralCode = generateReferralCode(req.user.name);
    attempts++;
  } while ((await Affiliate.exists({ referralCode })) && attempts < 5);

  const affiliate = await Affiliate.create({
    user: req.user._id,
    requestNumber: generateRequestNumber(),
    phone,
    marketingPlan,
    referralCode,
  });

  res.status(201).json(affiliate);
});

// @route  GET /api/affiliates/mine
// @access Private
export const getMyAffiliateStatus = asyncHandler(async (req, res) => {
  const affiliate = await Affiliate.findOne({ user: req.user._id });
  if (!affiliate) {
    return res.json(null);
  }

  let stats = { productsSold: 0, revenue: 0, commission: 0, pendingCommission: 0, ordersCount: 0 };
  if (affiliate.status === "approved") {
    stats = await computeAffiliateStats(affiliate._id);
  }

  res.json({ ...affiliate.toJSON(), stats });
});

// Commission == the exact discount amount given on each order (the
// marketer's code discount IS their earning, no separate percentage).
// It only counts as CONFIRMED once the order is actually Delivered —
// cancelled/returned orders never pay out, and orders still in transit
// show as "pending" so the marketer can see it's coming but it isn't
// final yet.
async function computeAffiliateStats(affiliateId) {
  const orders = await Order.find({ affiliate: affiliateId });

  const delivered = orders.filter((o) => o.status === "Delivered");
  const inProgress = orders.filter((o) => o.status !== "Delivered");

  const productsSold = delivered.reduce((sum, o) => sum + o.items.reduce((s, i) => s + i.qty, 0), 0);
  const revenue = delivered.reduce((sum, o) => sum + o.subtotal, 0);
  const commission = delivered.reduce((sum, o) => sum + (o.discountAmount || 0), 0);
  const pendingCommission = inProgress.reduce((sum, o) => sum + (o.discountAmount || 0), 0);

  return {
    ordersCount: orders.length,
    deliveredCount: delivered.length,
    productsSold,
    revenue,
    commission,
    pendingCommission,
  };
}

// @route  GET /api/affiliates
// @access Private/Admin
export const getAllAffiliates = asyncHandler(async (req, res) => {
  const affiliates = await Affiliate.find({}).populate("user", "name email").sort({ createdAt: -1 });

  const withStats = await Promise.all(
    affiliates.map(async (a) => {
      const stats =
        a.status === "approved"
          ? await computeAffiliateStats(a._id)
          : { ordersCount: 0, deliveredCount: 0, productsSold: 0, revenue: 0, commission: 0, pendingCommission: 0 };
      return { ...a.toJSON(), stats };
    })
  );

  res.json(withStats);
});

// @route  GET /api/affiliates/validate/:code
// @access Public
// Lets the cart/checkout confirm a typed code is real before ordering,
// and show the discount it gives — without exposing other affiliate data.
export const validateReferralCode = asyncHandler(async (req, res) => {
  const code = req.params.code.trim().toUpperCase();
  const affiliate = await Affiliate.findOne({ referralCode: code, status: "approved" }).populate("user", "name");

  if (!affiliate) {
    return res.json({ valid: false });
  }

  res.json({
    valid: true,
    ownerName: affiliate.user?.name || "مسوق SOALECT",
    discountAmount: affiliate.discountAmount || 0,
  });
});

// @route  GET /api/affiliates/:id
// @access Private/Admin
// Full detail view for one affiliate, including their referred orders.
export const getAffiliateById = asyncHandler(async (req, res) => {
  const affiliate = await Affiliate.findById(req.params.id).populate("user", "name email");
  if (!affiliate) {
    res.status(404);
    throw new Error("المسوق غير موجود");
  }

  const orders = await Order.find({ affiliate: affiliate._id }).sort({ createdAt: -1 });
  const stats =
    affiliate.status === "approved"
      ? await computeAffiliateStats(affiliate._id)
      : { ordersCount: 0, deliveredCount: 0, productsSold: 0, revenue: 0, commission: 0, pendingCommission: 0 };

  res.json({ ...affiliate.toJSON(), stats, orders });
});

// @route  PATCH /api/affiliates/:id/status
// @access Private/Admin
export const updateAffiliateStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!["pending", "approved", "rejected"].includes(status)) {
    res.status(400);
    throw new Error("حالة غير صحيحة");
  }

  const affiliate = await Affiliate.findById(req.params.id);
  if (!affiliate) {
    res.status(404);
    throw new Error("الطلب غير موجود");
  }

  affiliate.status = status;
  await affiliate.save();

  res.json(affiliate);
});

// @route  PATCH /api/affiliates/:id/code
// @access Private/Admin
// Lets the admin set a custom, memorable code for this marketer instead
// of the random auto-generated one, and how much discount it gives the
// customer at checkout — this same code doubles as both a referral link
// parameter and a discount code typed in at checkout.
export const updateAffiliateCode = asyncHandler(async (req, res) => {
  let { referralCode, discountAmount } = req.body;
  if (!referralCode || !referralCode.trim()) {
    res.status(400);
    throw new Error("اكتب كود صحيح");
  }

  referralCode = referralCode.trim().toUpperCase().replace(/\s+/g, "-");

  const clash = await Affiliate.findOne({ referralCode, _id: { $ne: req.params.id } });
  if (clash) {
    res.status(400);
    throw new Error("الكود ده مستخدم بالفعل، اختار كود تاني");
  }

  const affiliate = await Affiliate.findById(req.params.id);
  if (!affiliate) {
    res.status(404);
    throw new Error("الطلب غير موجود");
  }

  affiliate.referralCode = referralCode;
  if (discountAmount !== undefined) {
    affiliate.discountAmount = Math.max(0, Number(discountAmount) || 0);
  }
  await affiliate.save();

  res.json(affiliate);
});
