import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Roles } from "../users/userStore.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.resolve(__dirname, "../data");
const dataFile = path.join(dataDir, "mapConfig.json");

const DEFAULT_CONFIG = Object.freeze({
  googleMapsApiKey: "",
  googleMapsMapId: "",
  updatedAt: null,
  updatedBy: null,
});

let cache = null;

function ensureDataFile() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (!fs.existsSync(dataFile)) {
    fs.writeFileSync(dataFile, JSON.stringify(DEFAULT_CONFIG, null, 2));
    cache = { ...DEFAULT_CONFIG };
    return;
  }

  if (cache) {
    return;
  }

  try {
    const raw = fs.readFileSync(dataFile, "utf-8");
    const parsed = JSON.parse(raw);
    cache = {
      ...DEFAULT_CONFIG,
      ...(typeof parsed === "object" && parsed ? parsed : {}),
    };
  } catch (error) {
    console.error("Falha ao carregar configuração do mapa. Recriando arquivo padrão.", error);
    cache = { ...DEFAULT_CONFIG };
    fs.writeFileSync(dataFile, JSON.stringify(DEFAULT_CONFIG, null, 2));
  }
}

function readConfig() {
  ensureDataFile();
  if (!cache) {
    try {
      const raw = fs.readFileSync(dataFile, "utf-8");
      cache = {
        ...DEFAULT_CONFIG,
        ...(JSON.parse(raw) ?? {}),
      };
    } catch (error) {
      console.error("Erro ao ler configuração do mapa. Recriando arquivo padrão.", error);
      cache = { ...DEFAULT_CONFIG };
      fs.writeFileSync(dataFile, JSON.stringify(DEFAULT_CONFIG, null, 2));
    }
  }
  return cache;
}

function writeConfig(nextConfig) {
  cache = { ...DEFAULT_CONFIG, ...nextConfig };
  fs.writeFileSync(dataFile, JSON.stringify(cache, null, 2));
}

export function initializeMapConfigStore() {
  cache = null;
  ensureDataFile();
  readConfig();
}

export function getMapConfig() {
  const config = { ...readConfig() };

  if (!config.googleMapsApiKey && process.env.GOOGLE_MAPS_API_KEY) {
    config.googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY.trim();
  }

  if (!config.googleMapsMapId && process.env.GOOGLE_MAPS_MAP_ID) {
    config.googleMapsMapId = process.env.GOOGLE_MAPS_MAP_ID.trim();
  }

  return config;
}

export function updateMapConfig(actor, payload = {}) {
  if (!actor) {
    const error = new Error("Usuário autenticado obrigatório");
    error.statusCode = 401;
    throw error;
  }

  if (actor.role !== Roles.ADMIN) {
    const error = new Error("Permissão insuficiente para alterar configurações do mapa");
    error.statusCode = 403;
    throw error;
  }

  const apiKey = String(payload.googleMapsApiKey ?? "").trim();
  const mapId = String(payload.googleMapsMapId ?? "").trim();

  if (!apiKey) {
    const error = new Error("Informe a chave da API do Google Maps");
    error.statusCode = 400;
    throw error;
  }

  if (!mapId) {
    const error = new Error("Informe o ID do mapa do Google Maps");
    error.statusCode = 400;
    throw error;
  }

  const nextConfig = {
    googleMapsApiKey: apiKey,
    googleMapsMapId: mapId,
    updatedAt: new Date().toISOString(),
    updatedBy: actor.id,
  };

  writeConfig(nextConfig);
  return getMapConfig();
}

