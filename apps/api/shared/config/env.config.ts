import dotenv from "dotenv";
dotenv.config();

export const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: Number(process.env.PORT) || 5000,

  // Database
  MONGO_URI: process.env.MONGO_URI!,
  REDIS_URI: process.env.REDIS_URI || "redis://localhost:6379",

  // JWT
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET!,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET!,
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || "1d",
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || "30d",
  JWT_INVITE_EXPIRES_IN: process.env.JWT_INVITE_EXPIRES_IN || "7d",
  REFRESH_COOKIE_MAX_AGE_MS:
    Number(process.env.REFRESH_COOKIE_MAX_AGE_MS) || 30 * 24 * 60 * 60 * 1000,
  AUTH_COOKIE_SAME_SITE:
    process.env.AUTH_COOKIE_SAME_SITE ||
    (process.env.NODE_ENV === "production" ? "none" : "lax"),
  AUTH_COOKIE_DOMAIN: process.env.AUTH_COOKIE_DOMAIN,

  // Google OAuth
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID!,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET!,
  GOOGLE_REDIRECT_URI:
    process.env.GOOGLE_REDIRECT_URI ||
    "http://localhost:5000/auth/google/callback",

  // App - Backend's own URL
  APP_URL: process.env.APP_URL || "http://localhost:3000",

  // Frontend URL for OAuth redirects
  FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:5000",

  // CORS
  CORS_ORIGIN: process.env.CORS_ORIGIN || "*",

  // GCP Cloud Tasks
  GCP_PROJECT_ID: process.env.GCP_PROJECT_ID,
  GCP_REGION: process.env.GCP_REGION,
  GCP_QUEUE_NAME: process.env.GCP_QUEUE_NAME,

  // Gmail Pub/Sub
  GMAIL_PUBSUB_TOPIC:
    process.env.GMAIL_PUBSUB_TOPIC || "gmail-push-notifications",
  GMAIL_CONCURRENCY_LIMIT: Number(process.env.GMAIL_CONCURRENCY_LIMIT) || 5,

  // Backend / Worker
  BACKEND_URL: process.env.BACKEND_URL,
  INTERNAL_SECRET: process.env.INTERNAL_SECRET,

  // Email (Resend)
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  EMAIL_FROM: process.env.EMAIL_FROM || "CRM <noreply@yourdomain.com>",

  // Twilio
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,

  get isProduction() {
    return this.NODE_ENV === "production";
  },
};
