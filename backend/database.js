// In-memory data store. NO external database -- just plain JS objects.
// Everything resets when the server restarts.

const users = {
  user1: {
    id: 'user1',
    username: 'alice',
    password: 'password123', // PLAINTEXT -- demo only, never store passwords like this
    email: 'alice@example.com',
    bio: 'Just a regular user who loves sharing photos.',
    createdAt: new Date().toISOString(),
  },
  user2: {
    id: 'user2',
    username: 'bob',
    password: 'hunter2',
    email: 'bob@example.com',
    bio: 'Photographer and coffee enthusiast.',
    createdAt: new Date().toISOString(),
  },
};

const posts = {
  post1: {
    id: 'post1',
    title: 'Hello world',
    content: 'My very first post on this platform!',
    imageUrl: 'https://picsum.photos/400/300',
    imageAlt: 'A random photo',
    linkUrl: 'https://example.com',
    color: 'blue',
    createdBy: 'user1',
    createdAt: new Date().toISOString(),
    likes: ['user2'],
    comments: ['comment1'],
  },
};

const comments = {
  comment1: {
    id: 'comment1',
    content: 'Welcome aboard!',
    createdBy: 'user2',
    postId: 'post1',
    createdAt: new Date().toISOString(),
  },
};

// Active sessions, keyed by random session token.
// csrfToken stays empty until Phase 4 (CSRF lessons).
const sessions = {};

// --- simple incrementing id helpers ---
let postCounter = 1;
let commentCounter = 1;

function nextPostId() {
  postCounter += 1;
  return `post${postCounter}`;
}

function nextCommentId() {
  commentCounter += 1;
  return `comment${commentCounter}`;
}

module.exports = { users, posts, comments, sessions, nextPostId, nextCommentId };
