import axios from "axios";
import WebSocket from "ws";
import https from "https";
// import https from "https"; // se seu Traccar for HTTPS self-signed, veja o comentário mais abaixo

const baseURL = process.env.TRACCAR_BASE_URL; // ex.: http://localhost:8082 OU http://localhost:8082/api
const user    = process.env.TRACCAR_USER;     // admin (ou outro)
const pass    = process.env.TRACCAR_PASS;     // senha
const token   = process.env.TRACCAR_TOKEN;    // alternativa usando token
const allowSelfSigned = String(process.env.ALLOW_SELF_SIGNED || '') === 'true';

const trimmedBaseURL = baseURL?.replace(/\/+$/, '');
const httpBaseURL = trimmedBaseURL?.endsWith('/api') ? trimmedBaseURL.slice(0, -4) : trimmedBaseURL;
const apiBaseURL = httpBaseURL ? `${httpBaseURL}/api` : undefined;

// --- Registro dos clientes SSE do navegador
const sseClients = new Set();
export function addSseClient(res) {
  sseClients.add(res);
  res.on("close", () => sseClients.delete(res));
}
function broadcast(type, payload) {
  const chunk = `event: ${type}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const res of sseClients) res.write(chunk);
}

function buildWsUrl(base) {
  const trimmed = base.replace(/\/+$/, '');
  const proto = trimmed.startsWith('https') ? 'wss' : 'ws';
  const host  = trimmed.replace(/^https?:\/\//, '');
  return `${proto}://${host}/api/socket`;
}

function logAxiosError(tag, e) {
  const status = e.response?.status;
  const data   = e.response?.data;
  console.error(`[${tag}]`, 'status:', status, 'message:', e.message, 'data:', data);
}

// --- Conexão com o WS do Traccar usando cookie de sessão
let ws;
let reconnectTimer;
let backoff = 1000;

async function createSession() {
  const url = `${apiBaseURL}/session`;
  const httpsCfg = allowSelfSigned ? { httpsAgent: new https.Agent({ rejectUnauthorized: false }) } : {};

  if (user && pass) {
    // 1) JSON
    try {
      const resp = await axios.post(
        url,
        { email: user, password: pass },
        { headers: { "Content-Type": "application/json", Accept: "application/json" }, withCredentials: true, ...httpsCfg }
      );
      const cookie = resp.headers["set-cookie"]?.find(c => c.startsWith("JSESSIONID="));
      if (!cookie) throw new Error("Sessão sem JSESSIONID (JSON)");
      return cookie.split(";")[0];
    } catch (e) {
      logAxiosError('session-json', e);
      const status = e.response?.status;
      if (status !== 400 && status !== 415) throw e;
    }

    // 2) x-www-form-urlencoded
    try {
      const form = new URLSearchParams({ email: user, password: pass });
      const resp2 = await axios.post(url, form.toString(), {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        withCredentials: true,
        ...httpsCfg,
      });
      const cookie2 = resp2.headers["set-cookie"]?.find(c => c.startsWith("JSESSIONID="));
      if (!cookie2) throw new Error("Sessão sem JSESSIONID (form)");
      return cookie2.split(";")[0];
    } catch (e) {
      logAxiosError('session-form', e);
    }

    // 3) Basic Auth
    try {
      const basic = Buffer.from(`${user}:${pass}`).toString("base64");
      const resp3 = await axios.get(url, {
        headers: { Authorization: `Basic ${basic}` },
        withCredentials: true,
        ...httpsCfg,
      });
      const cookie3 = resp3.headers["set-cookie"]?.find(c => c.startsWith("JSESSIONID="));
      if (!cookie3) throw new Error("Sessão sem JSESSIONID (basic)");
      return cookie3.split(";")[0];
    } catch (e) {
      logAxiosError('session-basic', e);
    }
  }

  if (token) {
    try {
      const resp = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
        ...httpsCfg,
      });
      const cookie = resp.headers["set-cookie"]?.find(c => c.startsWith("JSESSIONID="));
      if (!cookie) throw new Error("Sessão sem JSESSIONID (token)");
      return cookie.split(";")[0];
    } catch (e) {
      logAxiosError('session-token', e);
    }
  }

  throw new Error("Não foi possível obter cookie de sessão do Traccar");
}


function openWs(cookie) {
  const wsUrl = buildWsUrl(httpBaseURL);
  const wsOpts = { headers: { Cookie: cookie } };
  if (allowSelfSigned) wsOpts.rejectUnauthorized = false;

  console.log('Abrindo WS para:', wsUrl);
  ws = new WebSocket(wsUrl, wsOpts);

  ws.on("open", () => { console.log("Traccar WS conectado"); backoff = 1000; });

  ws.on("message", (buf) => {
    try {
      const msg = JSON.parse(buf.toString());
      Object.entries(msg).forEach(([type, payload]) => broadcast(type, payload));
    } catch (e) {
      console.error("WS message parse error:", e.message);
    }
  });

  ws.on("close", (code, reason) => {
    console.warn("Traccar WS fechado; code:", code, "reason:", reason?.toString());
    scheduleReconnect();
  });

  ws.on("error", (e) => {
    console.error("Traccar WS erro:", e?.name, e?.message, e?.code);
    try { ws.close(); } catch {}
  });
}


async function connect() {
  try {
    const cookie = await createSession();
    openWs(cookie);
  } catch (e) {
    console.error("Falha ao conectar WS:", e.message);
    scheduleReconnect();
  }
}

function scheduleReconnect() {
  clearTimeout(reconnectTimer);
  reconnectTimer = setTimeout(connect, backoff);
  backoff = Math.min(backoff * 2, 15000); // até 15s
}

export function startRealtimeBridge() {
  if (!baseURL) {
    console.warn("TRACCAR_BASE_URL não definido; WS não será iniciado.");
    return;
  }

  if (!httpBaseURL || !apiBaseURL) {
    console.warn("TRACCAR_BASE_URL inválido; informe algo como http://host:8082 ou http://host:8082/api.");
    return;
  }

  if (!((user && pass) || token)) {
    console.warn("Credenciais do Traccar ausentes; defina TRACCAR_USER/TRACCAR_PASS ou TRACCAR_TOKEN para habilitar o WS.");
    return;
  }

  connect();
}
