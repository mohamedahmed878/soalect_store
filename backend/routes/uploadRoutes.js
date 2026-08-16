import express from "express";
import { upload } from "../middleware/uploadMiddleware.js";
import { protect } from "../middleware/authMiddleware.js";
import { adminOnly } from "../middleware/adminMiddleware.js";
import { uploadImage } from "../controllers/uploadController.js";

const router = express.Router();

// multer errors (bad file type, too large) throw synchronously inside
// upload.single, so wrap it to route into the error handler cleanly.
router.post("/", protect, adminOnly, (req, res, next) => {
  upload.single("image")(req, res, (err) => {
    if (err) {
      res.status(400);
      return next(err);
    }
    next();
  });
}, uploadImage);

export default router;
