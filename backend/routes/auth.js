const express = require('express');
const { users } = require('../database');
const { createSession, setSessionCookie, destroySession } = require('../middleware/auth');

const router = express.Router();

function publicUser(user) {
  if (!user) return null;
  const { password, ...safe } = user;
  return safe;
}

// POST /login { username, password }
router.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  const user = Object.values(users).find((u) => u.username === username);
  if (!user || user.password !== password) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }
  const token = createSession(user.id);
  setSessionCookie(res, token);
  res.json({ user: publicUser(user) });
});

// POST /logout
router.post('/logout', (req, res) => {
  destroySession(req, res);
  res.json({ success: true });
});

// GET /me -- current logged-in user (lets the SPA restore session state on reload)
router.get('/me', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Not logged in' });
  res.json({ user: publicUser(req.user) });
});

// GET /register -- stub for now (registration UI added later)
router.get('/register', (req, res) => {
  res.json({ message: 'Registration not implemented in Phase 0' });
});

module.exports = router;
