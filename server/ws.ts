import { WebSocketServer, WebSocket } from "ws";
import type { Server as HttpServer } from "http";
import type { IncomingMessage } from "http";
import { logger } from "./logger";
import { parse as parseCookie } from "cookie";
import { storage } from "./storage";

interface AuthenticatedSocket extends WebSocket {
  userId?: string;
  tenantIds?: Set<string>;
  projectId?: string;
  isAlive?: boolean;
}

const clients = new Set<AuthenticatedSocket>();

let wss: WebSocketServer | null = null;

export function setupWebSocket(server: HttpServer, sessionParser: any): void {
  wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (ws: AuthenticatedSocket, req: IncomingMessage) => {
    sessionParser(req, {} as any, async () => {
      const session = (req as any).session;
      const passport = session?.passport;
      if (!passport?.user) {
        ws.close(4001, "Unauthorized");
        return;
      }

      ws.userId = passport.user;
      ws.isAlive = true;
      ws.tenantIds = new Set<string>();

      try {
        const userTenants = await storage.getTenantsForUser(passport.user);
        for (const t of userTenants) {
          ws.tenantIds.add(t.id);
        }
      } catch {
        ws.close(4003, "Authorization failed");
        return;
      }

      clients.add(ws);

      ws.on("message", async (raw) => {
        try {
          const msg = JSON.parse(raw.toString());
          if (msg.type === "subscribe" && msg.projectId) {
            const project = await storage.getProject(msg.projectId);
            if (!project || !ws.tenantIds?.has(project.tenantId)) {
              ws.send(JSON.stringify({ event: "error", message: "Access denied to project" }));
              return;
            }
            ws.projectId = msg.projectId;
          }
        } catch {}
      });

      ws.on("pong", () => {
        ws.isAlive = true;
      });

      ws.on("close", () => {
        clients.delete(ws);
      });

      ws.on("error", () => {
        clients.delete(ws);
      });
    });
  });

  const pingInterval = setInterval(() => {
    clients.forEach((ws) => {
      if (ws.isAlive === false) {
        clients.delete(ws);
        return ws.terminate();
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on("close", () => {
    clearInterval(pingInterval);
  });

  logger.info("WebSocket server initialized on /ws", { source: "websocket" });
}

export function broadcast(projectId: string, event: string, payload: Record<string, any>): void {
  const message = JSON.stringify({ event, ...payload, timestamp: Date.now() });
  clients.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN && ws.projectId === projectId) {
      ws.send(message);
    }
  });
}

export function broadcastJobProgress(projectId: string, jobId: string, status: string, progress?: any): void {
  broadcast(projectId, "job:progress", { jobId, status, progress });
}

export function broadcastJobCompleted(projectId: string, jobId: string, artifactId?: string): void {
  broadcast(projectId, "job:completed", { jobId, artifactId });
}

export function broadcastJobFailed(projectId: string, jobId: string, error: string): void {
  broadcast(projectId, "job:failed", { jobId, error });
}

export function closeAllConnections(): void {
  clients.forEach((ws) => {
    ws.close(1001, "Server shutting down");
  });
  clients.clear();
  if (wss) {
    wss.close();
  }
}
