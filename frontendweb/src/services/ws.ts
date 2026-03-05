import type { WSEvent, WSEventType } from "@/types";

type Listener = (event: WSEvent) => void;

class WebSocketManager {
  private ws: WebSocket | null = null;
  private listeners: Map<WSEventType | "*", Set<Listener>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private url = "";
  private shouldReconnect = true;

  connect(warehouseId: string, token?: string) {
    this.shouldReconnect = true;
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = import.meta.env.VITE_WS_URL || `${protocol}//${window.location.host}`;
    this.url = `${host}/api/v1/ws/alerts/${warehouseId}${token ? `?token=${token}` : ""}`;
    this.createConnection();
  }

  private createConnection() {
    if (this.ws) {
      this.ws.close();
    }

    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
    };

    this.ws.onmessage = (event) => {
      try {
        const wsEvent: WSEvent = JSON.parse(event.data);
        this.emit(wsEvent.eventType, wsEvent);
        this.emit("*" as WSEventType, wsEvent);
      } catch {
        // ignore malformed messages
      }
    };

    this.ws.onclose = () => {
      if (this.shouldReconnect) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      return;
    }
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;
    this.reconnectTimer = setTimeout(() => {
      this.createConnection();
    }, delay);
  }

  private emit(eventType: WSEventType | "*", event: WSEvent) {
    const handlers = this.listeners.get(eventType);
    if (handlers) {
      handlers.forEach((fn) => fn(event));
    }
  }

  on(eventType: WSEventType | "*", listener: Listener) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(listener);
    return () => this.off(eventType, listener);
  }

  off(eventType: WSEventType | "*", listener: Listener) {
    this.listeners.get(eventType)?.delete(listener);
  }

  disconnect() {
    this.shouldReconnect = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    this.ws?.close();
    this.ws = null;
  }
}

export const wsManager = new WebSocketManager();
