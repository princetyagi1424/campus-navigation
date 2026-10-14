import app from "./app";
import { logger } from "./lib/logger";

// Vercel imports this module as the request handler. Export the Express app
// and avoid binding a long-lived port inside its serverless runtime.
export default app;

// Preserve the existing standalone server behavior for local development.
if (process.env.VERCEL !== "1") {
  const rawPort = process.env["PORT"] ?? "3000";
  const port = Number(rawPort);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid PORT value: "${rawPort}"`);
  }

  const server = app.listen(port, () => {
    logger.info({ port }, "Server listening");
  });

  server.on("error", (err) => {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  });
}
