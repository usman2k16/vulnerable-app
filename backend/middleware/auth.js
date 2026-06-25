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
  // VULNERABLE (Commit 4 - CSRF): SameSite=None means this cookie is attached to *cross-site*
  // requests too -- including ones forged by an attacker page -- which is exactly what makes CSRF
  // possible. Note :4200 and :3000 are different ORIGINS but the SAME SITE (site ignores port),
  // so the real app would work fine with SameSite=Strict; Commit 5 switches to Strict (+ a CSRF
  // token) as the fix. (Secure is fine here: browsers treat http://localhost as a secure context.)
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
