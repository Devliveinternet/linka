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
  createDevice,
  updateDevice,
  deleteDevice,
} from "./services/traccarClient.js";

import { addSseClient, startRealtimeBridge } from "./realtime/traccarBridge.js";
import {
  initializeUserStore,
  getUserByEmail,
  sanitizeUser,
  listUsersFor,
  createUser,
  getAllUsers,
} from "./users/userStore.js";
import { verifyPassword } from "./users/crypto.js";
import { createSession, revokeSession } from "./users/sessionStore.js";
import { requireAuth } from "./users/authMiddleware.js";
import {
  getMapConfig,
  initializeMapConfigStore,
  updateMapConfig,
} from "./config/mapConfigStore.js";
import {
  initializeDeviceAssignments,
  ensureMasterDeviceAssignments,
  getDeviceAccess,
  filterDevicesByAccess,
  filterPositionsByAccess,
  filterEventsByAccess,
  filterTripsByAccess,
  canAccessDevice,
  getAssignedDeviceIds,
  updateMasterDeviceAssignments,
} from "./users/deviceAssignments.js";

// ----------------- setup -----------------
const app  = express();
const PORT = process.env.PORT || 3000;
const knotsToKmh = (knots = 0) => Math.round(knots * 1.852);

initializeUserStore();
initializeDeviceAssignments();
initializeMapConfigStore();
for (const user of getAllUsers()) {
  if (user.role === "master") {
    ensureMasterDeviceAssignments(user.id);
  }
}

const ALLOWED_ORIGINS = [
  'http://45.235.44.146:8080', // seu front
];

const origins = (process.env.CORS_ORIGINS || "").split(",").filter(Boolean);
app.use(cors({
  origin: ALLOWED_ORIGINS,
  credentials: true, // se usa cookies/autorização
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
}));
app.use(express.json());

const traccarRouter = express.Router();
traccarRouter.use(requireAuth);

// ----------------- auth -----------------
app.post("/auth/login", (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "Informe e-mail e senha" });
  }

  const user = getUserByEmail(email);
  if (!user || !verifyPassword(password, user.passwordHash, user.passwordSalt)) {
    return res.status(401).json({ error: "Credenciais inválidas" });
  }

  const session = createSession(user.id);
  res.json({ token: session.token, expiresAt: session.expiresAt, user: sanitizeUser(user) });
});

app.get("/auth/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

app.post("/auth/logout", requireAuth, (req, res) => {
  revokeSession(req.authToken);
  res.json({ success: true });
});

// ----------------- map configuration -----------------
app.get("/config/maps", requireAuth, (req, res) => {
  const config = getMapConfig();
  res.json({ config });
});

app.post("/config/maps", requireAuth, (req, res) => {
  try {
    const updated = updateMapConfig(req.user, req.body || {});
    res.json({ config: updated });
  } catch (error) {
    const status = error.statusCode || 400;
    res.status(status).json({ error: error.message || "Não foi possível atualizar a configuração do mapa" });
  }
});

// ----------------- user management -----------------
app.get("/users", requireAuth, (req, res) => {
  const users = listUsersFor(req.user);
  res.json({ users });
});

app.post("/users", requireAuth, (req, res) => {
  try {
    const created = createUser(req.user, req.body || {});
    res.status(201).json({ user: created });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

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

function sendFiltered(res, fetcher, filter, { soft404 = false, soft400 = false } = {}) {
  Promise.resolve()
    .then(fetcher)
    .then((data) => res.json(filter ? filter(data) : data))
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

const isPlainObject = (value) => value && typeof value === "object" && !Array.isArray(value);

const toNumberOrUndefined = (value) => {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const prepareDevicePayload = (input = {}, { requireUniqueId = true } = {}) => {
  const trackerRaw = input.trackerId ?? input.uniqueId ?? input.imei ?? input.deviceIdentifier ?? "";
  const uniqueId = trackerRaw != null ? String(trackerRaw).trim() : "";

  if (!uniqueId && requireUniqueId) {
    const error = new Error("Informe o IMEI/ID do rastreador");
    error.statusCode = 400;
    throw error;
  }

  const baseName = input.name ?? input.plate ?? input.model ?? uniqueId;
  const name = String(baseName ?? "").trim() || uniqueId;
  const category = input.vehicleType || input.category;

  const baseAttributes = isPlainObject(input.attributes) ? { ...input.attributes } : {};

  const setAttribute = (key, value, { numeric = false } = {}) => {
    if (value === undefined || value === null || value === "") {
      delete baseAttributes[key];
      return;
    }
    if (numeric) {
      const parsed = toNumberOrUndefined(value);
      if (parsed === undefined) {
        delete baseAttributes[key];
        return;
      }
      baseAttributes[key] = parsed;
      return;
    }
    baseAttributes[key] = value;
  };

  setAttribute("plate", input.plate);
  setAttribute("clientId", input.clientId);
  setAttribute("brand", input.brand);
  setAttribute("model", input.model);
  setAttribute("color", input.color);
  setAttribute("year", input.year, { numeric: true });
  setAttribute("chassisNumber", input.chassisNumber);
  setAttribute("vehicleType", input.vehicleType);
  setAttribute("initialOdometer", input.initialOdometer, { numeric: true });
  setAttribute("currentOdometer", input.currentOdometer, { numeric: true });
  setAttribute("photo", input.photo);
  setAttribute("status", input.status);

  const payload = { name };

  if (uniqueId) {
    payload.uniqueId = uniqueId;
  }
  if (category) {
    payload.category = category;
  }
  if (input.groupId != null) {
    payload.groupId = input.groupId;
  }
  if (input.contact != null) {
    payload.contact = input.contact;
  }
  if (input.phone != null) {
    payload.phone = input.phone;
  }

  if (Object.keys(baseAttributes).length > 0) {
    payload.attributes = baseAttributes;
  }

  return payload;
};

const respondTraccarError = (res, error, fallbackStatus = 500) => {
  const status = error?.statusCode || error?.response?.status || fallbackStatus;
  const details = error?.response?.data;
  const message = error?.message || details?.message || "Erro ao comunicar com o Traccar";
  console.error("[traccar] erro na operação de dispositivo", status, details || message);
  res.status(status).json({ error: message, status, details });
};

// ----------------- health -----------------
app.get("/health", (_req, res) => res.send("ok"));

// ----------------- REST proxy -----------------
traccarRouter.get("/devices", (req, res) => {
  const access = getDeviceAccess(req.user);
  sendFiltered(res, () => listDevices(), (devices) => filterDevicesByAccess(devices, access));
});

traccarRouter.post("/devices", async (req, res) => {
  try {
    const access = getDeviceAccess(req.user);
    const payload = prepareDevicePayload(req.body || {});
    const created = await createDevice(payload);

    if (!access.allowAll && access.masterId) {
      const current = getAssignedDeviceIds(access.masterId);
      const createdId = created?.id != null ? String(created.id) : null;
      if (createdId && !current.includes(createdId)) {
        updateMasterDeviceAssignments(access.masterId, [...current, createdId]);
      }
    }

    res.status(201).json(created);
  } catch (error) {
    respondTraccarError(res, error, 400);
  }
});

traccarRouter.put("/devices/:id", async (req, res) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ error: "Informe o ID do dispositivo" });
  }

  const access = getDeviceAccess(req.user);
  if (!canAccessDevice(access, id)) {
    return res.status(403).json({ error: "Você não tem acesso a este dispositivo" });
  }

  try {
    const payload = prepareDevicePayload({ ...req.body, trackerId: req.body?.trackerId ?? req.body?.uniqueId });
    const updated = await updateDevice(id, payload);
    res.json(updated);
  } catch (error) {
    respondTraccarError(res, error, 400);
  }
});

traccarRouter.delete("/devices/:id", async (req, res) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ error: "Informe o ID do dispositivo" });
  }

  const access = getDeviceAccess(req.user);
  if (!canAccessDevice(access, id)) {
    return res.status(403).json({ error: "Você não tem acesso a este dispositivo" });
  }

  try {
    await deleteDevice(id);
    if (!access.allowAll && access.masterId) {
      const current = getAssignedDeviceIds(access.masterId);
      const normalizedId = String(id);
      if (current.includes(normalizedId)) {
        updateMasterDeviceAssignments(access.masterId, current.filter((deviceId) => deviceId !== normalizedId));
      }
    }
    res.json({ success: true });
  } catch (error) {
    respondTraccarError(res, error, 400);
  }
});

traccarRouter.get("/positions", (req, res) => {
  const access = getDeviceAccess(req.user);
  sendFiltered(res, () => listPositions(), (positions) => filterPositionsByAccess(positions, access));
});

traccarRouter.get("/events", (req, res) => {
  const access = getDeviceAccess(req.user);
  const now  = new Date();
  const to   = req.query.to   || now.toISOString();
  const from = req.query.from || new Date(now.getTime() - 24*60*60*1000).toISOString();
  const params = { ...req.query, from, to };
  if (!access.allowAll && params.deviceId && !canAccessDevice(access, params.deviceId)) {
    return res.json([]);
  }
  sendFiltered(
    res,
    () => listEvents(params),
    (events) => filterEventsByAccess(events, access),
    { soft404: true, soft400: true }
  );
});

traccarRouter.get("/trips", (req, res) => {
  const access = getDeviceAccess(req.user);
  const { deviceId, from, to } = req.query;
  if (!deviceId || !from || !to) {
    console.warn("Trips sem params necessários → []");
    return res.json([]);
  }
  if (!canAccessDevice(access, deviceId)) {
    return res.json([]);
  }
  sendFiltered(
    res,
    () => listTrips({ deviceId, from, to }),
    (trips) => filterTripsByAccess(trips, access),
    { soft400: true, soft404: true }
  );
});

traccarRouter.get("/geofences", (_req, res) => send(res, listGeofences()));

// ----------------- SSE (tempo real) -----------------
traccarRouter.get("/stream", (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  res.write('event: hello\ndata: "connected"\n\n');
  addSseClient(req.user, res);
});

// ----------------- helpers REST extras -----------------
const posTimestamp = (p) =>
  new Date(p.fixTime || p.deviceTime || p.serverTime || 0).getTime();

traccarRouter.get("/positions/latest", async (req, res) => {
  const access = getDeviceAccess(req.user);
  try {
    const all = await listPositions();
    const filtered = filterPositionsByAccess(all, access);
    const byDevice = new Map();
    for (const p of filtered || []) {
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

traccarRouter.get("/devices/map", async (req, res) => {
  const access = getDeviceAccess(req.user);
  try {
    const devs = await listDevices();
    const filtered = filterDevicesByAccess(devs, access);
    const map = {};
    for (const d of filtered || []) map[d.id] = d.name || `Device ${d.id}`;
    res.json(map);
  } catch {
    res.json({});
  }
});

// últimas N horas por device (default 2h)
traccarRouter.get("/route", (req, res) => {
  const access = getDeviceAccess(req.user);
  const { deviceId } = req.query;
  const hours = Number(req.query.hours ?? 2);
  if (!deviceId) return res.json([]);
  if (!canAccessDevice(access, deviceId)) return res.json([]);
  const to = new Date();
  const from = new Date(to.getTime() - hours * 60 * 60 * 1000);
  sendFiltered(
    res,
    () => listRoute({ deviceId, from: from.toISOString(), to: to.toISOString() }),
    (positions) => filterPositionsByAccess(positions, access),
    { soft404: true, soft400: true }
  );
});

// devices enriquecidos (nome, status, lastUpdate, última posição, speed, address)
traccarRouter.get("/devices/enriched", async (req, res) => {
  const access = getDeviceAccess(req.user);
  try {
    const devices = await listDevices();
    const positions = await listPositions();

    const relevantDevices = filterDevicesByAccess(devices, access);
    const relevantPositions = filterPositionsByAccess(positions, access);

    const latestMap = new Map();
    for (const p of relevantPositions || []) {
      const key = p.deviceId;
      const curr = latestMap.get(key);
      const t = posTimestamp(p);
      const tc = curr ? posTimestamp(curr) : -Infinity;
      if (!curr || t >= tc) latestMap.set(key, p);
    }

    const now = Date.now();
    const enriched = (relevantDevices || []).map((d) => {
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

app.use("/traccar", traccarRouter);

// ----------------- start -----------------
app.listen(PORT, '0.0.0.0', () => {
  console.log(`API up em http://0.0.0.0:${PORT}`);
  startRealtimeBridge(); // inicia a ponte WS->SSE
});
