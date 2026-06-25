const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const { securityHeaders } = require("./middleware/headers");
const { loadSession } = require("./middleware/auth");
const { verifyCsrf } = require("./middleware/csrf");

const authRoutes = require("./routes/auth");
const postRoutes = require("./routes/posts");
const commentRoutes = require("./routes/comments");
const likeRoutes = require("./routes/likes");
const userRoutes = require("./routes/users");

const app = express();
const PORT = process.env.PORT || 3000;

// CORS: allow the Angular dev server origin and send/receive cookies (credentials).
app.use(
  cors({
    origin: "http://localhost:4200",
    credentials: true,
  }),
);

app.use(express.json());
// Commit 4 (CSRF demo): parse HTML-form bodies too. This is also what lets a cross-site CSRF
// <form> (which sends application/x-www-form-urlencoded) populate req.body on the profile route.
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(securityHeaders);
app.use(loadSession);
app.use(verifyCsrf);

// API routes
app.use(authRoutes);
app.use(postRoutes);
app.use(commentRoutes);
app.use(likeRoutes);
app.use(userRoutes);

app.get("/", (req, res) => {
  res.json({ name: "vulnerable-social-media API", phase: 0, status: "ok" });
});

app.listen(PORT, () => {
  console.log(`Backend API listening on http://localhost:${PORT}`);
});
