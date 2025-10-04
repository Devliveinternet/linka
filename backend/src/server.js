import express from "express";
import cors from "cors";
import "dotenv/config";
import {
  listDevices, listPositions, listEvents, listTrips, listGeofences
} from "./services/traccarClient.js";

const app  = express();
const PORT = process.env.PORT || 3000;

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
        // evita quebrar o front quando a rota não existe ou faltam params
        return res.json([]);
      }
      res.status(status).json({ error: e.message, status, details: body });
    });
}

app.get("/health", (_req, res) => res.send("ok"));

app.get("/traccar/devices",   (_req, res) => send(res, listDevices()));
app.get("/traccar/positions", (_req, res) => send(res, listPositions()));

// EVENTS: última 24h por padrão; 400/404 viram [] para não derrubar o front
app.get("/traccar/events", (req, res) => {
  const now = new Date();
  const to   = req.query.to   || now.toISOString();
  const from = req.query.from || new Date(now.getTime() - 24*60*60*1000).toISOString();
  const params = { ...req.query, from, to };
  send(res, listEvents(params), { soft404: true, soft400: true });
});

// TRIPS: se não vier deviceId/from/to, devolve [] (suave)
app.get("/traccar/trips", (req, res) => {
  const { deviceId, from, to } = req.query;
  if (!deviceId || !from || !to) {
    console.warn("Trips sem params necessários → []");
    return res.json([]);
  }
  send(res, listTrips({ deviceId, from, to }), { soft400: true, soft404: true });
});

app.get("/traccar/geofences", (_req, res) => send(res, listGeofences()));

app.listen(PORT, () => console.log(`API up em http://localhost:${PORT}`));
