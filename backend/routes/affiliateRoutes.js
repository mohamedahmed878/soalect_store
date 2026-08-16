import express from "express";
import {
  applyAsAffiliate,
  getMyAffiliateStatus,
  getAllAffiliates,
  getAffiliateById,
  updateAffiliateStatus,
  updateAffiliateCode,
  validateReferralCode,
} from "../controllers/affiliateController.js";
import { protect } from "../middleware/authMiddleware.js";
import { adminOnly } from "../middleware/adminMiddleware.js";

const router = express.Router();

router.post("/apply", protect, applyAsAffiliate);
router.get("/mine", protect, getMyAffiliateStatus);
router.get("/validate/:code", validateReferralCode);
router.get("/", protect, adminOnly, getAllAffiliates);
router.get("/:id", protect, adminOnly, getAffiliateById);
router.patch("/:id/status", protect, adminOnly, updateAffiliateStatus);
router.patch("/:id/code", protect, adminOnly, updateAffiliateCode);

export default router;
