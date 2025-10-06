import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROLE_ADMIN  = "admin";
const ROLE_MASTER = "master";
const ROLE_CHILD  = "child";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const dataDir    = path.resolve(__dirname, "../../data");
const dataFile   = path.join(dataDir, "device-assignments.json");

let cache = null;

function ensureDataFile() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (!fs.existsSync(dataFile)) {
    fs.writeFileSync(dataFile, JSON.stringify({}, null, 2));
    cache = {};
    return;
  }

  try {
    const raw = fs.readFileSync(dataFile, "utf-8");
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Estrutura inválida");
    }
    cache = parsed;
  } catch (error) {
    console.error("Erro ao carregar device-assignments, recriando arquivo padrão.", error);
    cache = {};
    fs.writeFileSync(dataFile, JSON.stringify({}, null, 2));
  }
}

function readAssignments() {
  if (cache) return cache;
  ensureDataFile();
  return cache || {};
}

function writeAssignments(assignments) {
  cache = assignments;
  fs.writeFileSync(dataFile, JSON.stringify(assignments, null, 2));
}

function normalizeDeviceId(value) {
  if (value == null) return null;
  const str = String(value).trim();
  return str ? str : null;
}

function sanitizeAssignedList(raw) {
  if (!Array.isArray(raw)) return [];
  const result = [];
  for (const entry of raw) {
    const normalized = normalizeDeviceId(entry);
    if (normalized && !result.includes(normalized)) {
      result.push(normalized);
    }
  }
  return result;
}

export function initializeDeviceAssignments() {
  cache = null;
  ensureDataFile();
}

export function ensureMasterDeviceAssignments(masterId) {
  if (!masterId) return;
  const assignments = readAssignments();
  if (!Array.isArray(assignments[masterId])) {
    assignments[masterId] = [];
    writeAssignments(assignments);
  }
}

export function updateMasterDeviceAssignments(masterId, deviceIds = []) {
  if (!masterId) return;
  const assignments = readAssignments();
  assignments[masterId] = sanitizeAssignedList(deviceIds);
  writeAssignments(assignments);
}

export function getAssignedDeviceIds(masterId) {
  if (!masterId) return [];
  const assignments = readAssignments();
  return sanitizeAssignedList(assignments[masterId]);
}

export function getDeviceAccess(user) {
  if (!user) {
    return { allowAll: false, masterId: null, assigned: [], visible: [], visibleSet: new Set() };
  }

  const role = user.role;
  if (role === ROLE_ADMIN) {
    return { allowAll: true, masterId: null, assigned: [], visible: [], visibleSet: new Set() };
  }

  const masterId = role === ROLE_MASTER ? user.id : user.parentId;
  if (!masterId) {
    return { allowAll: false, masterId: null, assigned: [], visible: [], visibleSet: new Set() };
  }

  const assigned = getAssignedDeviceIds(masterId);
  let visible = assigned;

  if (role === ROLE_CHILD) {
    const rawLimit = Number(user.restrictions?.deviceLimit);
    const hasLimit = Number.isFinite(rawLimit);
    const limit = hasLimit ? Math.max(0, Math.floor(rawLimit)) : assigned.length;
    visible = assigned.slice(0, limit);
  }

  return {
    allowAll: false,
    masterId,
    assigned,
    visible,
    visibleSet: new Set(visible),
  };
}

export function canAccessDevice(access, deviceId) {
  if (!access) return false;
  if (access.allowAll) return true;
  const normalized = normalizeDeviceId(deviceId);
  if (!normalized) return false;
  return access.visibleSet.has(normalized);
}

export function filterDevicesByAccess(devices, access) {
  if (!Array.isArray(devices)) return [];
  if (access?.allowAll) return devices;
  if (!access?.visibleSet?.size) return [];

  return devices.filter((device) => {
    const id  = normalizeDeviceId(device?.id);
    const uid = normalizeDeviceId(device?.uniqueId);
    return (id && access.visibleSet.has(id)) || (uid && access.visibleSet.has(uid));
  });
}

export function filterPositionsByAccess(positions, access) {
  if (!Array.isArray(positions)) return [];
  if (access?.allowAll) return positions;
  if (!access?.visibleSet?.size) return [];

  return positions.filter((p) => canAccessDevice(access, p?.deviceId));
}

export function filterEventsByAccess(events, access) {
  if (!Array.isArray(events)) return [];
  if (access?.allowAll) return events;
  if (!access?.visibleSet?.size) return [];

  return events.filter((ev) => canAccessDevice(access, ev?.deviceId ?? ev?.attributes?.deviceId));
}

export function filterTripsByAccess(trips, access) {
  if (!Array.isArray(trips)) return [];
  if (access?.allowAll) return trips;
  if (!access?.visibleSet?.size) return [];

  return trips.filter((trip) => canAccessDevice(access, trip?.deviceId));
}

export function filterDeviceMapByAccess(map, access) {
  if (access?.allowAll) return map || {};
  if (!access?.visibleSet?.size || !map) return {};

  const filtered = {};
  for (const [key, value] of Object.entries(map)) {
    if (canAccessDevice(access, key)) {
      filtered[key] = value;
    }
  }
  return filtered;
}

export function getVisibleDeviceIds(access) {
  if (access?.allowAll) return null;
  return Array.isArray(access?.visible) ? access.visible : [];
}

export function refreshAssignmentsCache() {
  cache = null;
  readAssignments();
}
