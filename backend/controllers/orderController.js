import asyncHandler from "express-async-handler";
import Order from "../models/Order.js";
import Affiliate from "../models/Affiliate.js";
import { emitOrderCreated, emitOrderUpdated, emitOrderDeleted } from "../utils/socket.js";

function generateOrderNumber() {
  return "SLT-" + Math.floor(100000 + Math.random() * 900000);
}

// @route  POST /api/orders
// @access Private (must be logged in to place an order)
export const createOrder = asyncHandler(async (req, res) => {
  const { items, customer, subtotal, referralCode } = req.body;

  if (!items || items.length === 0) {
    res.status(400);
    throw new Error("سلة المشتريات فارغة");
  }
  if (!customer || !customer.fullName || !customer.phone || !customer.address) {
    res.status(400);
    throw new Error("بيانات التوصيل ناقصة");
  }

  let affiliateId = null;
  let discountCode = null;
  let discountAmount = 0;

  if (referralCode) {
    const affiliate = await Affiliate.findOne({ referralCode: referralCode.trim().toUpperCase(), status: "approved" });
    if (affiliate) {
      affiliateId = affiliate._id;
      discountCode = affiliate.referralCode;
      // Never let the discount exceed the order value.
      discountAmount = Math.min(affiliate.discountAmount || 0, subtotal);
    }
  }

  const order = await Order.create({
    orderNumber: generateOrderNumber(),
    user: req.user._id,
    items,
    customer,
    subtotal,
    discountCode,
    discountAmount,
    status: "New",
    affiliate: affiliateId,
  });

  emitOrderCreated(order);

  res.status(201).json(order);
});

// @route  GET /api/orders/mine
// @access Private
export const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json(orders);
});

// @route  PATCH /api/orders/:id/cancel
// @access Private (must own the order, and it must still be "New")
export const cancelMyOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    res.status(404);
    throw new Error("الطلب غير موجود");
  }
  if (String(order.user) !== String(req.user._id)) {
    res.status(403);
    throw new Error("مش مسموح تلغي طلب مش بتاعك");
  }
  if (order.status !== "New") {
    res.status(400);
    throw new Error("مش ممكن تلغي الطلب بعد ما يتأكد من الإدارة");
  }

  order.status = "Cancelled";
  await order.save();

  emitOrderUpdated(order);

  res.json(order);
});

// @route  GET /api/orders
// @access Private/Admin
export const getAllOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({}).populate("user", "name email").sort({ createdAt: -1 });
  res.json(orders);
});

// @route  PATCH /api/orders/:id/status
// @access Private/Admin
export const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const allowed = ["New", "Confirmed", "Shipped", "Delivered"];

  if (!allowed.includes(status)) {
    res.status(400);
    throw new Error("حالة الطلب غير صحيحة");
  }

  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error("الطلب غير موجود");
  }
  if (order.status === "Cancelled") {
    res.status(400);
    throw new Error("الطلب ده ملغي من العميل، مش ممكن تغيّر حالته");
  }

  order.status = status;
  await order.save();

  emitOrderUpdated(order);

  res.json(order);
});

// @route  DELETE /api/orders/:id
// @access Private/Admin
export const deleteOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error("الطلب غير موجود");
  }

  await order.deleteOne();
  emitOrderDeleted(order._id);

  res.json({ message: "تم حذف الطلب" });
});
