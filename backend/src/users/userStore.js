import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { hashPassword, verifyPassword } from "./crypto.js";
import { ensureMasterDeviceAssignments } from "./deviceAssignments.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.resolve(__dirname, "../../data");
const dataFile = path.join(dataDir, "users.json");

export const Roles = Object.freeze({
  ADMIN: "admin",
  MASTER: "master",
  CHILD: "child",
});

const DEFAULT_MASTER_POLICIES = {
  maxChildUsers: 15,
  childDeviceLimit: 50,
  childAllowedViews: ["dashboard", "map", "vehicles", "alerts", "trips"],
  childCanExportReports: false,
  childCanManageDrivers: false,
};

const DEFAULT_CHILD_RESTRICTIONS = {
  allowedViews: ["dashboard", "map", "alerts"],
  deviceLimit: 25,
  canExportReports: false,
  canManageDrivers: false,
  canAcknowledgeAlerts: true,
};

let cache = null;

function getDefaultAdminEmail() {
  return (
    process.env.ADMIN_DEFAULT_EMAIL ||
    process.env.TRACCAR_USER ||
    "admin@admin.com"
  );
}

function getDefaultAdminPassword() {
  return (
    process.env.ADMIN_DEFAULT_PASSWORD ||
    process.env.TRACCAR_PASS ||
    "admin123"
  );
}

function buildDefaultAdminUser() {
  const { hash, salt } = hashPassword(getDefaultAdminPassword());
  return {
    id: "admin",
    email: getDefaultAdminEmail(),
    name: "Administrador",
    role: Roles.ADMIN,
    passwordHash: hash,
    passwordSalt: salt,
    restrictions: {
      masterPolicies: {
        ...DEFAULT_MASTER_POLICIES,
      },
    },
    createdAt: new Date().toISOString(),
  };
}

function ensureDefaultAdmin(users) {
  const defaultEmail = getDefaultAdminEmail();
  const defaultPassword = getDefaultAdminPassword();

  const adminUser = users.find((user) => user.id === "admin");
  if (!adminUser) {
    users.push(buildDefaultAdminUser());
    return true;
  }

  let updated = false;

  if (adminUser.email !== defaultEmail) {
    adminUser.email = defaultEmail;
    updated = true;
  }

  if (!verifyPassword(defaultPassword, adminUser.passwordHash, adminUser.passwordSalt)) {
    const { hash, salt } = hashPassword(defaultPassword);
    adminUser.passwordHash = hash;
    adminUser.passwordSalt = salt;
    updated = true;
  }

  return updated;
}

function ensureDataFile() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  if (!fs.existsSync(dataFile)) {
    const adminUser = buildDefaultAdminUser();
    fs.writeFileSync(dataFile, JSON.stringify([adminUser], null, 2));
    return;
  }

  try {
    const raw = fs.readFileSync(dataFile, "utf-8");
    const users = JSON.parse(raw);
    if (Array.isArray(users) && ensureDefaultAdmin(users)) {
      fs.writeFileSync(dataFile, JSON.stringify(users, null, 2));
    }
  } catch (error) {
    console.error("Erro ao carregar usuários, recriando arquivo padrão.", error);
    const adminUser = buildDefaultAdminUser();
    fs.writeFileSync(dataFile, JSON.stringify([adminUser], null, 2));
  }
}

function readUsers() {
  if (cache) return cache;
  ensureDataFile();
  const raw = fs.readFileSync(dataFile, "utf-8");
  cache = JSON.parse(raw);
  return cache;
}

function writeUsers(users) {
  cache = users;
  fs.writeFileSync(dataFile, JSON.stringify(users, null, 2));
}

export function initializeUserStore() {
  ensureDataFile();
  cache = null;
  readUsers();
}

export function getAllUsers() {
  return readUsers();
}

export function getUserByEmail(email) {
  if (!email) return undefined;
  return readUsers().find((user) => user.email.toLowerCase() === email.toLowerCase());
}

export function getUserById(id) {
  if (!id) return undefined;
  return readUsers().find((user) => user.id === id);
}

function nextUserId(prefix) {
  const users = readUsers();
  let counter = 1;
  const base = prefix || "user";
  let candidate = `${base}-${counter}`;
  const ids = new Set(users.map((u) => u.id));
  while (ids.has(candidate)) {
    counter += 1;
    candidate = `${base}-${counter}`;
  }
  return candidate;
}

export function sanitizeUser(user) {
  if (!user) return undefined;
  const { passwordHash, passwordSalt, ...rest } = user;
  return rest;
}

function countChildren(masterId) {
  return readUsers().filter((u) => u.parentId === masterId).length;
}

function sanitizeChildRestrictions(input = {}, policies = DEFAULT_MASTER_POLICIES) {
  const allowedUniverse = policies.childAllowedViews || DEFAULT_MASTER_POLICIES.childAllowedViews;
  const allowedViews = Array.isArray(input.allowedViews)
    ? input.allowedViews.filter((view) => allowedUniverse.includes(view))
    : DEFAULT_CHILD_RESTRICTIONS.allowedViews.filter((view) => allowedUniverse.includes(view));
  const deviceLimitRaw = Number(input.deviceLimit ?? DEFAULT_CHILD_RESTRICTIONS.deviceLimit);
  const deviceLimit = Math.max(1, Math.min(deviceLimitRaw, policies.childDeviceLimit || DEFAULT_MASTER_POLICIES.childDeviceLimit));

  return {
    allowedViews: allowedViews.length ? [...new Set(allowedViews)] : [...allowedUniverse],
    deviceLimit,
    canExportReports: Boolean(input.canExportReports && (policies.childCanExportReports ?? false)),
    canManageDrivers: Boolean(input.canManageDrivers && (policies.childCanManageDrivers ?? false)),
    canAcknowledgeAlerts:
      input.canAcknowledgeAlerts == null
        ? DEFAULT_CHILD_RESTRICTIONS.canAcknowledgeAlerts
        : Boolean(input.canAcknowledgeAlerts),
  };
}

function sanitizeMasterPolicies(input = {}) {
  const maxChildUsers = Math.max(1, Math.min(Number(input.maxChildUsers ?? DEFAULT_MASTER_POLICIES.maxChildUsers), 200));
  const childDeviceLimit = Math.max(1, Math.min(Number(input.childDeviceLimit ?? DEFAULT_MASTER_POLICIES.childDeviceLimit), 500));
  const allowedUniverse = DEFAULT_MASTER_POLICIES.childAllowedViews;
  const allowedViews = Array.isArray(input.childAllowedViews)
    ? input.childAllowedViews.filter((view) => allowedUniverse.includes(view))
    : allowedUniverse;

  return {
    maxChildUsers,
    childDeviceLimit,
    childAllowedViews: allowedViews.length ? [...new Set(allowedViews)] : allowedUniverse,
    childCanExportReports: Boolean(input.childCanExportReports ?? DEFAULT_MASTER_POLICIES.childCanExportReports),
    childCanManageDrivers: Boolean(input.childCanManageDrivers ?? DEFAULT_MASTER_POLICIES.childCanManageDrivers),
  };
}

export function listUsersFor(actor) {
  const users = readUsers();
  if (!actor) return [];
  if (actor.role === Roles.ADMIN) {
    return users.map(sanitizeUser);
  }
  if (actor.role === Roles.MASTER) {
    return users
      .filter((user) => user.id === actor.id || user.parentId === actor.id)
      .map(sanitizeUser);
  }
  return users.filter((user) => user.id === actor.id).map(sanitizeUser);
}

export function createUser(actor, payload = {}) {
  if (!actor) {
    throw new Error("Usuário autenticado obrigatório");
  }

  const { name, email, password, role, restrictions = {}, parentId } = payload;

  if (!name?.trim()) throw new Error("Nome é obrigatório");
  if (!email?.trim()) throw new Error("E-mail é obrigatório");
  if (!password || password.length < 6) throw new Error("Senha deve ter ao menos 6 caracteres");
  if (!role || !Object.values(Roles).includes(role)) throw new Error("Perfil inválido");

  if (getUserByEmail(email)) {
    throw new Error("E-mail já cadastrado");
  }

  const allUsers = readUsers();

  if (role === Roles.ADMIN) {
    throw new Error("Não é permitido criar novos administradores");
  }

  const { hash, salt } = hashPassword(password);

  if (role === Roles.MASTER) {
    if (actor.role !== Roles.ADMIN) {
      throw new Error("Somente o administrador pode criar usuários mestre");
    }
    const masterPolicies = sanitizeMasterPolicies(restrictions.masterPolicies || restrictions);
    const user = {
      id: nextUserId("master"),
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role: Roles.MASTER,
      passwordHash: hash,
      passwordSalt: salt,
      restrictions: {
        masterPolicies,
      },
      createdAt: new Date().toISOString(),
      createdBy: actor.id,
    };
    const updated = [...allUsers, user];
    writeUsers(updated);
    ensureMasterDeviceAssignments(user.id);
    return sanitizeUser(user);
  }

  if (role === Roles.CHILD) {
    if (![Roles.ADMIN, Roles.MASTER].includes(actor.role)) {
      throw new Error("Permissão insuficiente para criar usuários filhos");
    }

    let owner = actor;
    if (actor.role === Roles.ADMIN) {
      if (!parentId) throw new Error("Informe o usuário mestre responsável");
      const master = getUserById(parentId);
      if (!master || master.role !== Roles.MASTER) {
        throw new Error("Usuário mestre inválido");
      }
      owner = master;
    }

    const policies = owner.restrictions?.masterPolicies || DEFAULT_MASTER_POLICIES;
    const currentChildren = countChildren(owner.id);
    if (currentChildren >= policies.maxChildUsers) {
      throw new Error("Limite de usuários filhos para este mestre foi atingido");
    }

    const childRestrictions = sanitizeChildRestrictions(restrictions, policies);

    const user = {
      id: nextUserId("child"),
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role: Roles.CHILD,
      passwordHash: hash,
      passwordSalt: salt,
      restrictions: childRestrictions,
      parentId: owner.id,
      createdAt: new Date().toISOString(),
      createdBy: actor.id,
    };
    const updated = [...allUsers, user];
    writeUsers(updated);
    return sanitizeUser(user);
  }

  throw new Error("Perfil inválido para criação");
}
