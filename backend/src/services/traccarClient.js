import axios from "axios";
import https from "https"; // permite desabilitar verificação de certificado quando necessário

import { parseTraccarBaseUrl } from "../utils/traccarUrls.js";

const baseURL = process.env.TRACCAR_BASE_URL;
const token   = process.env.TRACCAR_TOKEN;
const user    = process.env.TRACCAR_USER;
const pass    = process.env.TRACCAR_PASS;
const allowSelfSigned = String(process.env.ALLOW_SELF_SIGNED || "") === "true";

const { httpBaseURL, error: baseUrlError } = parseTraccarBaseUrl(baseURL);
const axiosBaseURL = httpBaseURL ?? baseURL;

if (!axiosBaseURL && baseUrlError) {
  console.warn(`TRACCAR_BASE_URL inválido; informe algo como http://host:8082 ou http://host:8082/api. (${baseUrlError})`);
}

const headers = {};
if (token) {
  headers.Authorization = `Bearer ${token}`;
} else if (user && pass) {
  const basic = Buffer.from(`${user}:${pass}`).toString("base64");
  headers.Authorization = `Basic ${basic}`;
}

const axiosConfig = {
  baseURL: axiosBaseURL,
  headers,
  timeout: 10000,
};

if (allowSelfSigned) {
  axiosConfig.httpsAgent = new https.Agent({ rejectUnauthorized: false });
}

export const traccar = axios.create(axiosConfig);

export const listDevices   = async () => (await traccar.get("/api/devices")).data;
export const listPositions = async () => (await traccar.get("/api/positions")).data;
export const listEvents = async (params = {}) => {
  try {
    const { data } = await traccar.get("/api/events", { params });
    return data;
  } catch (e) {
    // Algumas builds expõem via /api/reports/events
    if (e.response?.status === 404) {
      const { data } = await traccar.get("/api/reports/events", { params });
      return data;
    }
    throw e;
  }
};
export const listRoute = async (params = {}) => {
  try {
    const { data } = await traccar.get("/api/reports/route", { params });
    return data; // array de posições
  } catch (e) {
    // fallback “suave” se a rota não existir nessa build
    if (e.response?.status === 404) return [];
    throw e;
  }
};


export const listTrips     = async (params) => (await traccar.get("/api/reports/trips", { params })).data;
export const listGeofences = async () => (await traccar.get("/api/geofences")).data;
