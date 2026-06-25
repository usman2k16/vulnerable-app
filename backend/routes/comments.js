const express = require('express');
const { posts, comments, users, nextCommentId } = require('../database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// POST /posts/:id/comments { content }
// VULNERABLE (Commit 2): comment content stored RAW -> stored XSS (vector 2).
router.post('/posts/:id/comments', requireAuth, (req, res) => {
  const post = posts[req.params.id];
  if (!post) return res.status(404).json({ error: 'Post not found' });
  const id = nextCommentId();
  const comment = {
    id,
    content: req.body && req.body.content,
    createdBy: req.userId,
    postId: post.id,
    createdAt: new Date().toISOString(),
  };
  comments[id] = comment;
  post.comments.push(id);
  res.status(201).json({
    comment: {
      ...comment,
      authorUsername: users[req.userId] ? users[req.userId].username : 'unknown',
    },
  });
});

// DELETE /posts/:id/comments/:commentId -- owner only
router.delete('/posts/:id/comments/:commentId', requireAuth, (req, res) => {
  const post = posts[req.params.id];
  const comment = comments[req.params.commentId];
  if (!post || !comment) return res.status(404).json({ error: 'Not found' });
  if (comment.createdBy !== req.userId) {
    return res.status(403).json({ error: 'Not your comment' });
  }
  delete comments[req.params.commentId];
  post.comments = post.comments.filter((cid) => cid !== req.params.commentId);
  res.json({ success: true });
});

module.exports = router;
