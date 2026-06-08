const express = require('express');
const { posts, comments, users, nextPostId } = require('../database');
const { requireAuth } = require('../middleware/auth');
const { htmlEscape, attributeEscape, safeCssColor, safeUrl } = require('../utils/escape');

const router = express.Router();

// Attach author username + embedded (hydrated) comments for API responses.
function hydratePost(post) {
  const author = users[post.createdBy];
  return {
    ...post,
    authorUsername: author ? author.username : 'unknown',
    comments: post.comments
      .map((cid) => comments[cid])
      .filter(Boolean)
      .map((c) => ({
        ...c,
        authorUsername: users[c.createdBy] ? users[c.createdBy].username : 'unknown',
      })),
  };
}

// GET /posts -- all posts (newest first) with embedded comments
router.get('/posts', (req, res) => {
  const all = Object.values(posts)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .map(hydratePost);
  res.json({ posts: all });
});

// GET /search?q= -- search posts by title/content. Query is escaped before echo.
router.get('/search', (req, res) => {
  const q = (req.query.q || '').toString();
  const needle = q.toLowerCase();
  const results = Object.values(posts)
    .filter(
      (p) =>
        p.title.toLowerCase().includes(needle) ||
        p.content.toLowerCase().includes(needle)
    )
    .map(hydratePost);
  res.json({ query: htmlEscape(q), results });
});

// POST /posts -- create a post. Every field escaped for its output context.
router.post('/posts', requireAuth, (req, res) => {
  const { title, content, imageUrl, imageAlt, linkUrl, color } = req.body || {};
  const id = nextPostId();
  const post = {
    id,
    title: htmlEscape(title),
    content: htmlEscape(content),
    imageUrl: safeUrl(imageUrl),
    imageAlt: attributeEscape(imageAlt),
    linkUrl: safeUrl(linkUrl),
    color: safeCssColor(color),
    createdBy: req.userId,
    createdAt: new Date().toISOString(),
    likes: [],
    comments: [],
  };
  posts[id] = post;
  res.status(201).json({ post: hydratePost(post) });
});

// DELETE /posts/:id -- owner only. (No CSRF token yet -- that's Phase 4.)
router.delete('/posts/:id', requireAuth, (req, res) => {
  const post = posts[req.params.id];
  if (!post) return res.status(404).json({ error: 'Post not found' });
  if (post.createdBy !== req.userId) {
    return res.status(403).json({ error: 'Not your post' });
  }
  post.comments.forEach((cid) => delete comments[cid]);
  delete posts[req.params.id];
  res.json({ success: true });
});

module.exports = router;
