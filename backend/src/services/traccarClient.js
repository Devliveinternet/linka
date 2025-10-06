import axios from "axios";
// import https from "https"; // se usar HTTPS self-signed, descomente o Agent abaixo

import { parseTraccarBaseUrl } from "../utils/traccarUrls.js";

const baseURL = process.env.TRACCAR_BASE_URL;
const token   = process.env.TRACCAR_TOKEN;

const { httpBaseURL, error: baseUrlError } = parseTraccarBaseUrl(baseURL);
const axiosBaseURL = httpBaseURL ?? baseURL;

if (!axiosBaseURL && baseUrlError) {
  console.warn(`TRACCAR_BASE_URL inválido; informe algo como http://host:8082 ou http://host:8082/api. (${baseUrlError})`);
}

const headers = {};
if (token) headers.Authorization = `Bearer ${token}`;

export const traccar = axios.create({
  baseURL: axiosBaseURL,
  headers,
  timeout: 10000,
  // httpsAgent: new https.Agent({ rejectUnauthorized: false }),
});

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
