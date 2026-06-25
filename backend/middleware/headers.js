// Security headers.
// A single, STATIC strong Content-Security-Policy. CSP is intentionally NOT toggled during the
// XSS commits -- it's covered as its own subject in Commit 6.
// Note: in this split-origin setup the page is served by `ng serve`, so this header (on Express
// API responses) does not currently govern the SPA page; Commit 6 will make CSP govern the page
// (via a <meta> CSP in index.html or by serving the built app through Express).

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
