import express from "express";
import {
  createOrder,
  getMyOrders,
  cancelMyOrder,
  getAllOrders,
  updateOrderStatus,
  deleteOrder,
} from "../controllers/orderController.js";
import { protect } from "../middleware/authMiddleware.js";
import { adminOnly } from "../middleware/adminMiddleware.js";

const router = express.Router();

router.post("/", protect, createOrder);
router.get("/mine", protect, getMyOrders);
router.patch("/:id/cancel", protect, cancelMyOrder);
router.get("/", protect, adminOnly, getAllOrders);
router.patch("/:id/status", protect, adminOnly, updateOrderStatus);
router.delete("/:id", protect, adminOnly, deleteOrder);

export default router;
