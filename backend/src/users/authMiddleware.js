import { getSession, revokeSession } from "./sessionStore.js";
import { getUserById, sanitizeUser } from "./userStore.js";

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) {
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
