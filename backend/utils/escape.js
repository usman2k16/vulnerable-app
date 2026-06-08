// Context-specific output escaping.
//
// These are USED throughout Phase 0 so the baseline app has NO XSS.
// In Commit 2 the routes will (intentionally) stop calling these to introduce
// the XSS vulnerabilities; Commit 3 re-applies them.

function htmlEscape(text) {
  if (text == null) return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
  };
  return String(text).replace(/[&<>"']/g, (char) => map[char]);
}

function attributeEscape(text) {
  if (text == null) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function safeCssColor(value) {
  if (value == null) return 'black';
  const v = String(value).trim();
  // Allow hex colors, rgb()/rgba()/hsl()/hsla(), and bare named colors only.
  if (/^(#[0-9a-fA-F]{3,8}|rgb\([^)]*\)|rgba\([^)]*\)|hsl\([^)]*\)|hsla\([^)]*\)|[a-zA-Z]+)$/.test(v)) {
    return v;
  }
  return 'black';
}

function safeUrl(url) {
  if (url == null) return '/';
  const u = String(url).trim();
  try {
    const parsed = new URL(u);
    if (['http:', 'https:'].includes(parsed.protocol)) return u;
    return '/'; // blocks javascript:, data:, etc.
  } catch {
    // Not an absolute URL -- allow same-site relative/anchor links only.
    if (u.startsWith('/') || u.startsWith('#')) return u;
    return '/';
  }
}

module.exports = { htmlEscape, attributeEscape, safeCssColor, safeUrl };
