import { useEffect, useRef, useCallback } from "react";
import { queryClient } from "@/lib/queryClient";

type WSMessage = {
  event: string;
  jobId?: string;
  status?: string;
  artifactId?: string;
  error?: string;
  timestamp?: number;
};

type WSListener = (msg: WSMessage) => void;

export function useWebSocket(
  projectId: string | null | undefined,
  tenantSlug?: string | null,
) {
  const wsRef = useRef<WebSocket | null>(null);
  const listenersRef = useRef<Set<WSListener>>(new Set());
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>();

  const connect = useCallback(() => {
    if (!projectId) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const url = `${protocol}//${window.location.host}/ws`;

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({ type: "subscribe", projectId }));
      };

      ws.onmessage = (evt) => {
        try {
          const msg: WSMessage = JSON.parse(evt.data);

          if (msg.event === "job:completed" || msg.event === "job:failed") {
            queryClient.invalidateQueries({ queryKey: ["/api/t", tenantSlug, "projects", projectId, "jobs"] });
            queryClient.invalidateQueries({ queryKey: ["/api/t", tenantSlug, "projects", projectId, "outputs"] });
            queryClient.invalidateQueries({ queryKey: ["/api/t", tenantSlug, "projects", projectId, "facts"] });
            queryClient.invalidateQueries({ queryKey: ["/api/t", tenantSlug, "projects", projectId] });
          }

          if (msg.event === "job:progress") {
            queryClient.invalidateQueries({ queryKey: ["/api/t", tenantSlug, "projects", projectId, "jobs"] });
          }

          listenersRef.current.forEach((fn) => fn(msg));
        } catch {}
      };

      ws.onclose = () => {
        wsRef.current = null;
        reconnectTimer.current = setTimeout(connect, 5000);
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch {}
  }, [projectId, tenantSlug]);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [connect]);

  const addListener = useCallback((fn: WSListener) => {
    listenersRef.current.add(fn);
    return () => {
      listenersRef.current.delete(fn);
    };
  }, []);

  return { addListener };
}
