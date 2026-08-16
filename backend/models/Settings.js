import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema(
  {
    // Singleton pattern: there's only ever one document, found by this key.
    key: { type: String, default: "site", unique: true },

    // The only thing editable from the admin panel — everything else on
    // the homepage (headings, tagline, feature list, CTA) is fixed site
    // copy so the admin only ever has to swap the product photo.
    heroImage: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("Settings", settingsSchema);
