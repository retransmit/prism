import WebSocket from "ws"

export type ActiveWebSocketConnection = {
  initialized: boolean;
  websocket: WebSocket;
};

const map = new Map<string, ActiveWebSocketConnection>();

export default map;
