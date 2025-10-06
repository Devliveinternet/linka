import { getSession, revokeSession } from "./sessionStore.js";
import { getUserById, sanitizeUser } from "./userStore.js";

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const [scheme, credentials] = header.split(" ");

  let token = null;
  if (scheme?.toLowerCase() === "bearer" && credentials) {
    token = credentials.trim();
  }

  if (!token) {
    const queryToken = req.query?.token ?? req.query?.access_token ?? req.query?.authToken;
    if (Array.isArray(queryToken)) {
      token = queryToken[0];
    } else if (typeof queryToken === "string" && queryToken.trim()) {
      token = queryToken.trim();
    }
  }

  if (!token) {
    return res.status(401).json({ error: "Token de autenticação ausente" });
  }

  const session = getSession(token);
  if (!session) {
    return res.status(401).json({ error: "Sessão inválida ou expirada" });
  }
  const user = getUserById(session.userId);
  if (!user) {
    revokeSession(token);
    return res.status(401).json({ error: "Usuário não encontrado" });
  }
  req.authToken = token;
  req.user = sanitizeUser(user);
  next();
}
