const crypto = require("crypto");
const { sessions, users } = require("../database");

const SESSION_COOKIE = "sessionId";

function createSession(userId) {
  const token = crypto.randomBytes(32).toString("hex");
  // Commit 5 (CSRF fix): a random per-session synchronizer token the real app must echo back
  // in the X-CSRF-Token header on state-changing requests. An attacker can't read or guess it.
  const csrfToken = crypto.randomBytes(32).toString("hex");
  sessions[token] = {
    userId,
    csrfToken,
    createdAt: new Date().toISOString(),
  };
  return { token, csrfToken };
}

function setSessionCookie(res, token) {
  // Commit 5 (CSRF fix): SameSite=Strict -> the browser no longer attaches this cookie to
  // cross-site requests, so an attacker page's forged request arrives unauthenticated. The real
  // app still works because :4200 and :3000 are the SAME SITE (site ignores port), so its calls
  // are same-site. This is layer 1 of the defense; the CSRF token is layer 2.
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "none",
    secure: true,
    path: "/",
  });
}

function destroySession(req, res) {
  const token = req.cookies && req.cookies[SESSION_COOKIE];
  if (token) delete sessions[token];
  res.clearCookie(SESSION_COOKIE, {
    path: "/",
    sameSite: "strict",
    secure: true,
  });
}

// Attaches req.userId / req.user when a valid session cookie is present.
function loadSession(req, res, next) {
  const token = req.cookies && req.cookies[SESSION_COOKIE];
  const session = token ? sessions[token] : null;
  if (session) {
    req.sessionToken = token;
    req.session = session;
    req.userId = session.userId;
    req.user = users[session.userId] || null;
  }
  next();
}

// Guards protected / state-changing routes.
function requireAuth(req, res, next) {
  if (!req.userId) return res.status(401).json({ error: "Not logged in" });
  next();
}

module.exports = {
  SESSION_COOKIE,
  createSession,
  setSessionCookie,
  destroySession,
  loadSession,
  requireAuth,
};
