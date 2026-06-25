# Vulnerable Social Media App

A deliberately-vulnerable social media app for **security education**. It is built up over a
series of commits that introduce, exploit, and then fix real web vulnerabilities — **XSS**,
**CSRF**, and **CSP** — so you can see exactly how each attack works and how each defense stops it.

> ⚠️ **For learning only.** This app intentionally contains (in later commits) insecure code.
> Never deploy it, and never reuse its vulnerable patterns in real software.

## Phase 0 — Secure baseline

A fully functional app with **no vulnerabilities yet**:

- Session-based authentication (custom cookie sessions, no JWT)
- Create / view / delete posts, comment, like / unlike, search, edit profile
- **All user input is escaped** for its output context (HTML, attribute, URL, CSS color)
- **Strong Content-Security-Policy** on every API response
- CORS configured for the Angular dev origin with credentials

Later commits will (intentionally) weaken this baseline and then re-harden it. See the
6-commit plan below.

## Commit 2 — XSS Vulnerabilities Added ⚠️

This commit **intentionally introduces 6 XSS vectors**. Do not treat this state as safe.

A crucial detail specific to Angular: **removing the backend escaping is not enough** — Angular
escapes and sanitizes by default. Each vector therefore required **two changes**:

1. **Backend** stops escaping the field (stores raw user input), and
2. **Frontend** deliberately bypasses Angular's sanitizer via a new `SafePipe`
   (`frontend/src/app/services/safe.pipe.ts`) that calls `DomSanitizer.bypassSecurityTrust*` —
   the classic real-world Angular XSS footgun.

The CSP in `backend/middleware/headers.js` was also weakened to `'unsafe-inline'`. (In this
split-origin setup the page is served by `ng serve`, not Express, so this header doesn't govern
the SPA page yet — the working CSP demo comes in Commit 6. The XSS here fires because of the
sanitizer bypass.)

| # | Vector | Field | Example payload |
|---|--------|-------|-----------------|
| 1 | Stored XSS — post | post content | `<img src=x onerror="alert('XSS in post')">` |
| 2 | Stored XSS — comment | comment content | `<img src=x onerror="alert('XSS in comment')">` |
| 3 | Attribute XSS | image alt (set Image URL to `x`) | `" onerror="alert('XSS in attribute')` |
| 4 | URL XSS | link URL | `javascript:alert('XSS in URL')` |
| 5 | CSS injection | title color | `red; background: url("https://picsum.photos/seed/xss/600/80")` |
| 6 | Stored XSS — bio | profile bio | `<img src=x onerror="alert('XSS in bio')">` |
| 7 | **Reflected** XSS | search query (via `/search?q=`) | `<img src=x onerror="alert('Reflected XSS')">` |

Each payload is shown **in-app as a hint directly under the relevant input** (New Post fields,
the comment box, and the profile Bio field) so you can paste it where it's used. Payloads use
`onerror`, not `<script>`, because **browsers never execute `<script>` inserted via
`innerHTML`** — the script node is parsed but flagged non-executable, so an event handler like
`onerror`/`onload` is what actually fires.

(The CSRF exploits added in Commit 4 live in `exploits/` as `.html` files — those are real
attacker pages you open in a browser, not just instructions.)

**XSS types covered:** Stored (vectors 1–6, across HTML / attribute / URL / CSS contexts) and
**Reflected** (vector 7, via the search query — deliver it with a crafted link like
`http://localhost:4200/search?q=<img src=x onerror="alert('Reflected XSS')">`). DOM-based XSS is
intentionally not included. Commit 3 will reverse all of this.

## Architecture

| Component | Technology | Notes |
|-----------|------------|-------|
| Backend   | Node.js + Express | REST API on `http://localhost:3000` |
| Frontend  | Angular 17 (standalone) | Dev server on `http://localhost:4200` |
| Data      | In-memory JS objects | No external database; resets on restart |
| Sessions  | Custom cookie sessions | `sessionId` cookie, `SameSite=None` (cross-origin dev) |

The frontend (`:4200`) and backend (`:3000`) are **separate origins**. The backend enables
CORS with credentials, and the Angular services send `withCredentials: true` so the session
cookie travels with every request.

## Running locally

Two terminals:

```bash
# Terminal 1 — backend API
cd backend
npm install
npm start          # http://localhost:3000

# Terminal 2 — Angular frontend
cd frontend
npm install
npm start          # ng serve -> http://localhost:4200
```

Open http://localhost:4200 and log in with the demo account:

- **Username:** `alice`
- **Password:** `password123`

(A second demo user, `bob` / `hunter2`, also exists.)

## Project layout

```
backend/        Express API (routes, middleware, in-memory database, escaping utils)
frontend/       Angular app (components, services, routing)
exploits/       Standalone HTML attack files (payloads added in later commits)
```

## API reference

| Method | Path | Notes |
|--------|------|-------|
| POST   | `/login` | `{ username, password }` → sets session cookie |
| POST   | `/logout` | clears session |
| GET    | `/me` | current logged-in user |
| GET    | `/posts` | all posts with embedded comments |
| POST   | `/posts` | create post `{ title, content, imageUrl, imageAlt, linkUrl, color }` |
| DELETE | `/posts/:id` | owner only (no CSRF token until Phase 4) |
| GET    | `/search?q=` | search posts by title/content |
| POST   | `/posts/:id/comments` | `{ content }` |
| DELETE | `/posts/:id/comments/:commentId` | owner only |
| POST   | `/posts/:id/like` | like a post (no CSRF token until Phase 4) |
| POST   | `/posts/:id/unlike` | remove a like |
| GET    | `/api/users/:id` | user profile |
| POST   | `/profile/update` | `{ bio, email }` (no CSRF token until Phase 4) |

## The 6-commit learning plan

0. **Setup + secure baseline** — *(this commit)* full app, no vulnerabilities.
1. *(merged into Phase 0)*
2. **Add XSS vulnerabilities** — remove escaping, weaken CSP; 6 XSS vectors become exploitable.
3. **Fix XSS** — re-apply context-specific escaping, restore strong CSP.
4. **Add CSRF vulnerabilities** — remove token checks and `SameSite`; 3 CSRF vectors.
5. **Fix CSRF** — token generation + validation, `SameSite` cookies.
6. **CSP** — demonstrate a weak CSP, then harden it.
