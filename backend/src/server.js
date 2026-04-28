import app from "./app.js";
import { env } from "./config/env.js";

const server = app.listen(env.PORT, () => {
  console.log(`Server running on port ${env.PORT} in ${env.NODE_ENV} mode.`);
});

const shutdown = (signal, error) => {
  if (error) {
    console.error(`[${signal}]`, error);
  }

  server.close(() => {
    console.log(`HTTP server closed after ${signal}.`);
    process.exit(error ? 1 : 0);
  });
};

process.on("unhandledRejection", (reason) => shutdown("UNHANDLED_REJECTION", reason));
process.on("uncaughtException", (error) => shutdown("UNCAUGHT_EXCEPTION", error));
process.on("SIGTERM", () => shutdown("SIGTERM"));