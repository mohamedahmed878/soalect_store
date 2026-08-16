import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    name: { type: String, required: true },
    color: { type: String, required: true },
    size: { type: String, required: true },
    qty: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true },
  },
  { _id: false }
);

const customerSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String },
    governorate: { type: String, required: true },
    city: { type: String, required: true },
    address: { type: String, required: true },
    notes: { type: String },
    payment: { type: String, enum: ["cod"], default: "cod" }, // cash on delivery only
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    items: { type: [orderItemSchema], required: true },
    customer: { type: customerSchema, required: true },
    subtotal: { type: Number, required: true },
    discountCode: { type: String, default: null },
    discountAmount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["New", "Confirmed", "Shipped", "Delivered", "Cancelled"],
      default: "New",
    },
    // Set when the customer arrived via an affiliate's referral link
    // (?ref=CODE) or typed their discount code, so commission can be
    // attributed to that marketer.
    affiliate: { type: mongoose.Schema.Types.ObjectId, ref: "Affiliate", default: null },
  },
  { timestamps: true }
);

export default mongoose.model("Order", orderSchema);
