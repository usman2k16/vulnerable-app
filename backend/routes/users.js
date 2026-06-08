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

// POST /profile/update { bio, email } -- (No CSRF token yet -- that's Phase 4.)
router.post('/profile/update', requireAuth, (req, res) => {
  const user = users[req.userId];
  const { bio, email } = req.body || {};
  if (bio !== undefined) user.bio = htmlEscape(bio);
  if (email !== undefined) user.email = htmlEscape(email);
  res.json({ user: publicUser(user) });
});

module.exports = router;
