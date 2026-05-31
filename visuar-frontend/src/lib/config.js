/**
 * Central API / WebSocket URLs from Vite env (see .env.local).
 */
export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const WS_URL = (() => {
  try {
    const url = new URL(API_URL);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    url.pathname = "/ws/vision";
    return url.toString();
  } catch {
    return "ws://localhost:8000/ws/vision";
  }
})();
