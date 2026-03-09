import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { toErrorResponse } from "./errors";
import { logger } from "./logger";
import { setupWebSocket, closeAllConnections } from "./ws";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  helmet({
    contentSecurityPolicy: process.env.NODE_ENV === "production"
      ? {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "blob:"],
            connectSrc: ["'self'", "wss:", "ws:"],
            fontSrc: ["'self'", "data:"],
            objectSrc: ["'none'"],
            frameAncestors: ["'none'"],
          },
        }
      : false,
    crossOriginEmbedderPolicy: false,
  })
);

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express", context?: { tenantId?: string; projectId?: string; jobId?: string }) {
  logger.info(message, { source, ...context });
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        const bodyStr = JSON.stringify(capturedJsonResponse);
        logLine += ` :: ${bodyStr.length > 200 ? bodyStr.substring(0, 200) + "..." : bodyStr}`;
      }

      const context: { tenantId?: string; projectId?: string; jobId?: string } = {};
      const tenantMatch = path.match(/\/api\/t\/([^/]+)/);
      const projectMatch = path.match(/\/projects\/([^/]+)/);
      const jobMatch = path.match(/\/jobs\/([^/]+)/);
      if (tenantMatch) context.tenantId = tenantMatch[1];
      if (projectMatch) context.projectId = projectMatch[1];
      if (jobMatch) context.jobId = jobMatch[1];
      log(logLine, "express", Object.keys(context).length > 0 ? context : undefined);
    }
  });

  next();
});

(async () => {
  if (process.env.NODE_ENV === "production" && !process.env.SESSION_SECRET) {
    logger.error("SESSION_SECRET environment variable is required in production.", { source: "startup" });
    process.exit(1);
  }

  const { seedDatabase } = await import("./seed");
  await seedDatabase().catch((err) => logger.error("Seed error", { source: "seed", message: err.message }));

  const sessionMiddleware = await registerRoutes(httpServer, app);

  setupWebSocket(httpServer, sessionMiddleware);

  const { runLoop, stopLoop } = await import("./jobs/runner");
  runLoop().catch((err) => logger.error("Job runner fatal error", { source: "job-runner", message: err.message }));

  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) {
      return next(err);
    }

    const { status, body } = toErrorResponse(err, undefined);
    logger.error(err.message || "Internal Server Error", {
      source: "express",
      code: body.error.code,
      requestId: body.error.requestId,
      method: req.method,
      path: req.path,
      stack: err.stack,
    });

    return res.status(status).json(body);
  });

  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );

  let shuttingDown = false;

  async function gracefulShutdown(signal: string) {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info(`Received ${signal}, starting graceful shutdown...`, { source: "shutdown" });

    stopLoop();
    closeAllConnections();

    httpServer.close(() => {
      logger.info("HTTP server closed", { source: "shutdown" });
    });

    const { pool } = await import("./db");
    await pool.end().catch(() => {});

    const shutdownTimeout = setTimeout(() => {
      logger.warn("Graceful shutdown timed out, forcing exit", { source: "shutdown" });
      process.exit(1);
    }, 10000);

    shutdownTimeout.unref();
    logger.info("Graceful shutdown complete", { source: "shutdown" });
  }

  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));
})();
