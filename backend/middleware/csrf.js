// Commit 5 (CSRF fix), layer 2: synchronizer-token validation.
//
// State-changing requests must carry an X-CSRF-Token header matching the token stored in the
// caller's session. The real app reads its token from /login and /me and echoes it back (via an
// HTTP interceptor); an attacker page can neither read it (SOP/CORS) nor guess it (random), and
// the custom header also forces a CORS preflight.

const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];

function verifyCsrf(req, res, next) {
  if (SAFE_METHODS.includes(req.method)) return next(); // reads don't change state
  if (req.path === '/login') return next();             // no session exists yet
  if (!req.session) return next();                       // unauthenticated -> requireAuth will 401

  const header = req.get('X-CSRF-Token');
  if (!header || header !== req.session.csrfToken) {
    return res.status(403).json({ error: 'Invalid or missing CSRF token' });
  }
  next();
}

module.exports = { verifyCsrf };
