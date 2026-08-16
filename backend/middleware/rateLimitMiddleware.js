import rateLimit from "express-rate-limit";

// Applies to /api/auth/* — login, register, admin-login, google.
// Generous enough for normal use, tight enough to slow down brute force.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "محاولات كتير — استنى شوية وحاول تاني" },
});

// A looser limiter for the rest of the API, mostly to blunt scripted abuse.
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "طلبات كتير من نفس الجهاز — استنى شوية" },
});
