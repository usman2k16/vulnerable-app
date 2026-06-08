const express = require('express');
const { posts } = require('../database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// POST /posts/:id/like -- (No CSRF token yet -- that's Phase 4.)
router.post('/posts/:id/like', requireAuth, (req, res) => {
  const post = posts[req.params.id];
  if (!post) return res.status(404).json({ error: 'Post not found' });
  if (!post.likes.includes(req.userId)) post.likes.push(req.userId);
  res.json({ success: true, likes: post.likes.length });
});

// POST /posts/:id/unlike
router.post('/posts/:id/unlike', requireAuth, (req, res) => {
  const post = posts[req.params.id];
  if (!post) return res.status(404).json({ error: 'Post not found' });
  post.likes = post.likes.filter((uid) => uid !== req.userId);
  res.json({ success: true, likes: post.likes.length });
});

module.exports = router;
