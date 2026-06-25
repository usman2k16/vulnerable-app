// Security headers.
// VULNERABLE (Commit 2): the CSP is WEAKENED to allow inline scripts/styles
// ('unsafe-inline'), which would let inline event handlers and injected styles run.
// NOTE: in this split-origin setup the page is served by `ng serve`, not Express, so this
// header does not actually govern the SPA page -- the XSS in Commit 2 fires because the
// Angular DomSanitizer is bypassed on the frontend. A real, page-governing CSP demo comes
// in Commit 6. Commit 3 restores the strong policy below.

function securityHeaders(req, res, next) {
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self'",
      "connect-src 'self'",
    ].join('; ')
  );
  next();
}

module.exports = { securityHeaders };
