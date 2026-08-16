import mongoose from "mongoose";

const affiliateSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    requestNumber: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    marketingPlan: { type: String, required: true }, // "هيسوق إزاي" — free text from the applicant
    referralCode: { type: String, required: true, unique: true },
    // Flat currency discount this code gives the customer at checkout.
    discountAmount: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
  },
  { timestamps: true }
);

affiliateSchema.set("toJSON", {
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    return ret;
  },
});

export default mongoose.model("Affiliate", affiliateSchema);
