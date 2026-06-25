// Security headers.
// A single, STATIC strong Content-Security-Policy on API responses.
// Commit 6: the CSP that actually governs the SPA page lives in frontend/src/index.html as a
// <meta> tag (a header on these JSON API responses can't govern the ng-serve page). This header
// is kept as defense-in-depth on the API surface; the page policy + /csp playground are the lesson.

function securityHeaders(req, res, next) {
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'none'",
      "script-src 'self'",
      "style-src 'self'",
      "img-src 'self' data: https:",
      "font-src 'self'",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ')
  );
  next();
}

module.exports = { securityHeaders };
