import dotenv from "dotenv";

dotenv.config();

const requiredEnvVars = [
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
];

const missingEnvVars = requiredEnvVars.filter((envKey) => !process.env[envKey]);

if (missingEnvVars.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missingEnvVars.join(", ")}`
  );
}

const parsedPort = Number(process.env.PORT ?? 5000);

if (!Number.isFinite(parsedPort) || parsedPort <= 0) {
  throw new Error("PORT must be a valid positive number.");
}

export const env = Object.freeze({
  NODE_ENV: process.env.NODE_ENV ?? "development",
  PORT: parsedPort,
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? "*",
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
});