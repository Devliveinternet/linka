import express from "express";
import cors from "cors";
import "dotenv/config";

import {
  listDevices,
  listPositions,
  listEvents,
  listTrips,
  listGeofences,
  listRoute,
} from "./services/traccarClient.js";

import { addSseClient, startRealtimeBridge } from "./realtime/traccarBridge.js";

// ----------------- setup -----------------
const app  = express();
const PORT = process.env.PORT || 3000;
const knotsToKmh = (knots = 0) => Math.round(knots * 1.852);

const origins = (process.env.CORS_ORIGINS || "").split(",").filter(Boolean);
app.use(cors({ origin: origins.length ? origins : true }));

// helper para padronizar respostas/erros
function send(res, promise, { soft404 = false, soft400 = false } = {}) {
  promise
    .then((data) => res.json(data))
    .catch((e) => {
      const status = e.response?.status || 500;
      const body   = e.response?.data;
      console.error("Traccar error:", status, body);
      if ((soft404 && status === 404) || (soft400 && status === 400)) {
        return res.json([]);
      }
      res.status(status).json({ error: e.message, status, details: body });
    });
}

// ----------------- health -----------------
app.get("/health", (_req, res) => res.send("ok"));

// ----------------- REST proxy -----------------
app.get("/traccar/devices",   (_req, res) => send(res, listDevices()));
app.get("/traccar/positions", (_req, res) => send(res, listPositions()));

app.get("/traccar/events", (req, res) => {
  const now  = new Date();
  const to   = req.query.to   || now.toISOString();
  const from = req.query.from || new Date(now.getTime() - 24*60*60*1000).toISOString();
  const params = { ...req.query, from, to };
  send(res, listEvents(params), { soft404: true, soft400: true });
});

app.get("/traccar/trips", (req, res) => {
  const { deviceId, from, to } = req.query;
  if (!deviceId || !from || !to) {
    console.warn("Trips sem params necessários → []");
    return res.json([]);
  }
  send(res, listTrips({ deviceId, from, to }), { soft400: true, soft404: true });
});

app.get("/traccar/geofences", (_req, res) => send(res, listGeofences()));

// ----------------- SSE (tempo real) -----------------
app.get("/traccar/stream", (_req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  res.write('event: hello\ndata: "connected"\n\n');
  addSseClient(res);
});

// ----------------- helpers REST extras -----------------
const posTimestamp = (p) =>
  new Date(p.fixTime || p.deviceTime || p.serverTime || 0).getTime();

app.get("/traccar/positions/latest", async (_req, res) => {
  try {
    const all = await listPositions();
    const byDevice = new Map();
    for (const p of all || []) {
      if (p?.deviceId == null) continue;
      const prev = byDevice.get(p.deviceId);
      if (!prev || posTimestamp(p) >= posTimestamp(prev)) byDevice.set(p.deviceId, p);
    }
    res.json(Array.from(byDevice.values()));
  } catch (e) {
    const status = e.response?.status || 500;
    const body   = e.response?.data;
    console.error("latest positions error:", status, body);
    res.json([]);
  }
});

app.get("/traccar/devices/map", async (_req, res) => {
  try {
    const devs = await listDevices();
    const map = {};
    for (const d of devs || []) map[d.id] = d.name || `Device ${d.id}`;
    res.json(map);
  } catch {
    res.json({});
  }
});

// últimas N horas por device (default 2h)
app.get("/traccar/route", (req, res) => {
  const { deviceId } = req.query;
  const hours = Number(req.query.hours ?? 2);
  if (!deviceId) return res.json([]);
  const to = new Date();
  const from = new Date(to.getTime() - hours * 60 * 60 * 1000);
  send(
    res,
    listRoute({ deviceId, from: from.toISOString(), to: to.toISOString() }),
    { soft404: true, soft400: true }
  );
});

// devices enriquecidos (nome, status, lastUpdate, última posição, speed, address)
app.get("/traccar/devices/enriched", async (_req, res) => {
  try {
    const devices = await listDevices();
    const positions = await listPositions();

    const latestMap = new Map();
    for (const p of positions || []) {
      const key = p.deviceId;
      const curr = latestMap.get(key);
      const t = posTimestamp(p);
      const tc = curr ? posTimestamp(curr) : -Infinity;
      if (!curr || t >= tc) latestMap.set(key, p);
    }

    const now = Date.now();
    const enriched = (devices || []).map((d) => {
      const pos = latestMap.get(d.id);
      const lastIso = d.lastUpdate || pos?.serverTime || pos?.deviceTime || pos?.fixTime;
      const lastMs  = lastIso ? new Date(lastIso).getTime() : 0;
      const minutesAgo = lastMs ? Math.round((now - lastMs) / 60000) : undefined;

      const derivedStatus =
        minutesAgo != null && minutesAgo <= 5 ? "online"
        : minutesAgo != null ? "offline"
        : "unknown";

      return {
        id: d.id,
        name: d.name,
        uniqueId: d.uniqueId,
        status: (d.status || derivedStatus || "unknown").toLowerCase(),
        model: d.model || d.attributes?.model,
        category: d.category || d.attributes?.category,
        lastUpdate: lastIso,
        minutesAgo,
        lastFixTime: pos?.fixTime || pos?.deviceTime || pos?.serverTime,
        speedKmh: pos?.speed != null ? knotsToKmh(pos.speed) : undefined,
        address: pos?.address,
      };
    });

    res.json(enriched);
  } catch (err) {
    console.error("[devices/enriched]", err?.message);
    res.status(500).json({ error: "failed_to_enrich_devices" });
  }
});

// ----------------- start -----------------
app.listen(PORT, () => {
  console.log(`API up em http://localhost:${PORT}`);
  startRealtimeBridge(); // inicia a ponte WS->SSE
});
