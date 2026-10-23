/**
 * Minimal client for obs-websocket v5 (built into OBS Studio 28+: Tools → WebSocket Server Settings).
 * Protocol: Hello (op 0) → Identify (op 1, with the SHA-256 challenge if a password is set) → Identified (op 2),
 * then Requests (op 6) / RequestResponses (op 7) and Events (op 5).
 */

type Json = Record<string, unknown>;

interface Pending {
  resolve: (data: Json) => void;
  reject: (err: Error) => void;
  timer: number;
}

export class ObsRequestError extends Error {
  constructor(
    message: string,
    public code: number,
  ) {
    super(message);
  }
}

/** Event subscriptions: General (1) | Scenes (4) | Outputs (64). */
const EVENT_SUBSCRIPTIONS = 1 | 4 | 64;

async function sha256Base64(text: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  let binary = '';
  for (const b of new Uint8Array(digest)) binary += String.fromCharCode(b);
  return btoa(binary);
}

export class ObsSocket {
  private ws: WebSocket | null = null;
  private seq = 0;
  private pending = new Map<string, Pending>();
  private listeners = new Map<string, Set<(data: Json) => void>>();
  onClose: (reason: string) => void = () => {};

  /** Resolves once identified. Rejects with a readable (Catalan) message. */
  connect(url: string, password: string): Promise<{ obsVersion: string }> {
    this.close();
    return new Promise((resolve, reject) => {
      let settled = false;
      let obsVersion = '';
      const fail = (msg: string) => {
        if (settled) return;
        settled = true;
        reject(new Error(msg));
        this.close();
      };

      let ws: WebSocket;
      try {
        ws = new WebSocket(url, 'obswebsocket.json');
      } catch {
        fail('L’adreça no és vàlida. Ha de ser semblant a ws://localhost:4455');
        return;
      }
      this.ws = ws;
      const timeout = window.setTimeout(() => fail('OBS no respon. Comprova que OBS està obert i el servidor WebSocket activat.'), 8000);

      ws.onmessage = async (ev) => {
        let msg: { op: number; d: Json };
        try {
          msg = JSON.parse(String(ev.data));
        } catch {
          return;
        }
        if (msg.op === 0) {
          obsVersion = String(msg.d.obsWebSocketVersion ?? '');
          const auth = msg.d.authentication as { challenge: string; salt: string } | undefined;
          const identify: Json = { rpcVersion: 1, eventSubscriptions: EVENT_SUBSCRIPTIONS };
          if (auth) {
            if (!password) {
              window.clearTimeout(timeout);
              fail('OBS demana contrasenya. Copia-la a Eines → Configuració del servidor WebSocket → Mostra la informació de connexió (Tools → WebSocket Server Settings).');
              return;
            }
            const secret = await sha256Base64(password + auth.salt);
            identify.authentication = await sha256Base64(secret + auth.challenge);
          }
          ws.send(JSON.stringify({ op: 1, d: identify }));
        } else if (msg.op === 2) {
          window.clearTimeout(timeout);
          settled = true;
          resolve({ obsVersion });
        } else if (msg.op === 5) {
          const type = String(msg.d.eventType);
          this.listeners.get(type)?.forEach((cb) => cb((msg.d.eventData as Json) ?? {}));
        } else if (msg.op === 7) {
          const id = String(msg.d.requestId);
          const p = this.pending.get(id);
          if (!p) return;
          this.pending.delete(id);
          window.clearTimeout(p.timer);
          const status = msg.d.requestStatus as { result: boolean; code: number; comment?: string };
          if (status.result) p.resolve((msg.d.responseData as Json) ?? {});
          else p.reject(new ObsRequestError(status.comment || `Error ${status.code}`, status.code));
        }
      };

      ws.onerror = () => {
        window.clearTimeout(timeout);
        fail('No s’ha pogut connectar amb OBS. Obre OBS en aquest ordinador, activa Eines → Configuració del servidor WebSocket i, si el navegador ho demana, permet l’accés a la xarxa local.');
      };

      ws.onclose = (ev) => {
        window.clearTimeout(timeout);
        // 4009 = authentication failed.
        const reason = ev.code === 4009 ? 'Contrasenya incorrecta.' : 'Connexió amb OBS tancada.';
        if (!settled) fail(reason);
        for (const p of this.pending.values()) {
          window.clearTimeout(p.timer);
          p.reject(new Error(reason));
        }
        this.pending.clear();
        if (this.ws === ws) {
          this.ws = null;
          if (settled) this.onClose(reason);
        }
      };
    });
  }

  get connected() {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  request<T = Json>(requestType: string, requestData?: Json): Promise<T> {
    const ws = this.ws;
    if (!ws || ws.readyState !== WebSocket.OPEN) return Promise.reject(new Error('No connectat a OBS.'));
    const requestId = `r${++this.seq}`;
    return new Promise<T>((resolve, reject) => {
      const timer = window.setTimeout(() => {
        this.pending.delete(requestId);
        reject(new Error('OBS no ha respost a temps.'));
      }, 10_000);
      this.pending.set(requestId, { resolve: resolve as (d: Json) => void, reject, timer });
      ws.send(JSON.stringify({ op: 6, d: { requestType, requestId, requestData } }));
    });
  }

  on(eventType: string, cb: (data: Json) => void) {
    let set = this.listeners.get(eventType);
    if (!set) {
      set = new Set();
      this.listeners.set(eventType, set);
    }
    set.add(cb);
    return () => set.delete(cb);
  }

  close() {
    const ws = this.ws;
    this.ws = null;
    if (ws && ws.readyState <= WebSocket.OPEN) ws.close(1000);
  }
}
