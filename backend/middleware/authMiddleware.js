import jwt from "jsonwebtoken";
import asyncHandler from "express-async-handler";
import User from "../models/User.js";

// Verifies the Bearer token and attaches the user (without password) to req.user.
export const protect = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401);
    throw new Error("مش مسموح — لازم تسجل دخولك الأول");
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) {
      res.status(401);
      throw new Error("المستخدم مش موجود");
    }
    req.user = user;
    next();
  } catch (err) {
    res.status(401);
    throw new Error("جلسة الدخول غير صحيحة أو منتهية");
  }
});
