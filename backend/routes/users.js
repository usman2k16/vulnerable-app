const express = require('express');
const { users } = require('../database');
const { requireAuth } = require('../middleware/auth');
const { htmlEscape } = require('../utils/escape');

const router = express.Router();

function publicUser(user) {
  if (!user) return null;
  const { password, ...safe } = user;
  return safe;
}

// GET /api/users/:id
router.get('/api/users/:id', (req, res) => {
  const user = users[req.params.id];
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user: publicUser(user) });
});

// POST /profile/update { bio, email }
// Commit 3 (XSS fixed): bio/email are HTML-escaped before storage (fixes vector 6).
// VULNERABLE (Commit 4 - CSRF): session-cookie-only auth, no CSRF token -- a cross-site form POST
// can overwrite the victim's bio/email. Fixed in Commit 5.
router.post('/profile/update', requireAuth, (req, res) => {
  const user = users[req.userId];
  const { bio, email } = req.body || {};
  if (bio !== undefined) user.bio = htmlEscape(bio);
  if (email !== undefined) user.email = htmlEscape(email);
  res.json({ user: publicUser(user) });
});

module.exports = router;
