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

  // OpenAI
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,

  // CORS
  CORS_ORIGIN: process.env.CORS_ORIGIN || "*",

  // GCP Cloud Tasks
  GCP_PROJECT_ID: process.env.GCP_PROJECT_ID,
  GCP_REGION: process.env.GCP_REGION,
  GCP_QUEUE_NAME: process.env.GCP_QUEUE_NAME,
  GCP_SMS_QUEUE_NAME: process.env.GCP_SMS_QUEUE_NAME,
  GCP_MASTER_QUEUE_NAME: process.env.GCP_MASTER_QUEUE_NAME,

  // Gmail Pub/Sub
  GMAIL_PUBSUB_TOPIC:
    process.env.GMAIL_PUBSUB_TOPIC || "gmail-push-notifications",
  GMAIL_CONCURRENCY_LIMIT: Number(process.env.GMAIL_CONCURRENCY_LIMIT) || 5,

  // Backend / Worker
  BACKEND_URL: process.env.BACKEND_URL,
  INTERNAL_SECRET: process.env.INTERNAL_SECRET,

  // Email (Resend)
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  RESEND_WEBHOOK_SECRET: process.env.RESEND_WEBHOOK_SECRET,
  REPLY_TO_EMAIL: process.env.REPLY_TO_EMAIL,
  EMAIL_FROM: process.env.EMAIL_FROM || "CRM <noreply@yourdomain.com>",
  CAMPAIGN_EMAIL_DOMAIN: process.env.CAMPAIGN_EMAIL_DOMAIN || "realty-crm.com",

  // Twilio
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,

  // Stripe
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  STRIPE_PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,

  // Cloudinary
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,

  // Static Assets
  STATIC_SCRIPT_URL: process.env.STATIC_SCRIPT_URL,

  get isProduction() {
    return this.NODE_ENV === "production";
  },
};

// ── Validation ────────────────────────────────────────────────────────
// ── Validation ────────────────────────────────────────────────────────
const REQUIRED_VARS = [
  "NODE_ENV",
  "PORT",
  "MONGO_URI",
  "REDIS_URI",
  "JWT_ACCESS_SECRET",
  "JWT_REFRESH_SECRET",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GOOGLE_REDIRECT_URI",
  "APP_URL",
  "FRONTEND_URL",
  "BACKEND_URL",
  "INTERNAL_SECRET",
];

const WARNING_VARS = [
  "OPENAI_API_KEY",
  "RESEND_API_KEY",
  "RESEND_WEBHOOK_SECRET",
  "REPLY_TO_EMAIL",
  "EMAIL_FROM",
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
  "STRIPE_SECRET_KEY",
  "STRIPE_PUBLISHABLE_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "GCP_PROJECT_ID",
  "GCP_REGION",
  "GCP_QUEUE_NAME",
  "GCP_SMS_QUEUE_NAME",
  "GCP_MASTER_QUEUE_NAME",
  "STATIC_SCRIPT_URL",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
  "GMAIL_PUBSUB_TOPIC",
];

REQUIRED_VARS.forEach((key) => {
  const val = process.env[key];
  if (!val || val.trim() === "") {
    console.error(`\x1b[31m[ENV ERROR] Missing required variable: ${key}\x1b[0m`);
  }
});

WARNING_VARS.forEach((key) => {
  const val = process.env[key];
  if (!val || val.trim() === "") {
    console.warn(`\x1b[33m[ENV WARNING] Missing variable: ${key}. Some features may be disabled.\x1b[0m`);
  }
});


