const crypto = require('crypto');
const { sessions, users } = require('../database');

const SESSION_COOKIE = 'sessionId';

function createSession(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  sessions[token] = {
    userId,
    csrfToken: '', // populated in Phase 4 (CSRF lessons)
    createdAt: new Date().toISOString(),
  };
  return token;
}

function setSessionCookie(res, token) {
  // SameSite=None + Secure so the cookie is sent on cross-origin XHR from the
  // Angular dev server (http://localhost:4200). Chrome exempts localhost from
  // the "Secure requires HTTPS" rule. Cookie attributes are revisited in Phase 4/5.
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'none',
    secure: true,
    path: '/',
  });
}

function destroySession(req, res) {
  const token = req.cookies && req.cookies[SESSION_COOKIE];
  if (token) delete sessions[token];
  res.clearCookie(SESSION_COOKIE, { path: '/', sameSite: 'none', secure: true });
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
  if (!req.userId) return res.status(401).json({ error: 'Not logged in' });
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
