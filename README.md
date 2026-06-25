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

This commit **intentionally introduces 7 XSS vectors** (6 stored + 1 reflected). Do not treat
this state as safe.

A crucial detail specific to Angular: **removing the backend escaping is not enough** — Angular
escapes and sanitizes by default. Each vector therefore required **two changes**:

1. **Backend** stops escaping the field (stores raw user input), and
2. **Frontend** deliberately bypasses Angular's sanitizer via a new `SafePipe`
   (`frontend/src/app/services/safe.pipe.ts`) that calls `DomSanitizer.bypassSecurityTrust*` —
   the classic real-world Angular XSS footgun.

CSP is intentionally left **strong and unchanged** here — the XSS fires purely because the Angular
sanitizer is bypassed, not because of any CSP change. (In this split-origin setup the Express CSP
header doesn't govern the `ng serve` page anyway; CSP gets its own treatment in Commit 6.)

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
intentionally not included. Commit 3 reverses all of this.

## Commit 3 — XSS Fixed ✅

All 7 vectors from Commit 2 are closed by reversing both layers (backend escaping + safe frontend
bindings).

**Backend — context-specific escaping re-applied** (`backend/utils/escape.js`):

| Output context | Escaper | Used in |
|---|---|---|
| HTML body | `htmlEscape` | post title/content, comment, bio, email, search query echo |
| HTML attribute | `attributeEscape` | image alt |
| URL | `safeUrl` (allows only http/https/relative) | image URL, link URL |
| CSS color | `safeCssColor` (allowlist, else `black`) | post color |

**Frontend — safe Angular bindings restored** (the `SafePipe` bypass is deleted entirely):
interpolation `{{ }}` for content/comment/bio/search; `[src]`/`[alt]`/`[href]` property bindings
(Angular sanitizes these); `[style.color]` instead of a raw style string.

**CSP** is unchanged — it stays the strong static policy throughout the XSS commits and is
covered on its own in Commit 6.

**Verify the fix:** the in-app hints are reframed to green "✅ now escaped" notes — paste the same
payloads and they render as literal text with no popup. The reflected link
(`/search?q=<img …>`) likewise shows as text.

Defense-in-depth: both the backend escaping **and** the safe frontend bindings independently stop
the attack — either layer alone would suffice, but real apps should do both.

## Commit 4 — CSRF Vulnerabilities ⚠️

**CSRF (Cross-Site Request Forgery):** a malicious page makes the *victim's own browser* send a
state-changing request to our API. The browser auto-attaches the victim's `sessionId` cookie, so
the server sees an authenticated request the victim never intended. The attacker can't read the
response (CORS blocks that) — they just want the side effect.

The app is **already** CSRF-vulnerable: state-changing routes trust the session cookie alone, with
no anti-CSRF token, and the cookie is `SameSite=None` (sent on cross-site requests). This commit
adds the **attacker pages** plus `express.urlencoded()` so a forged form POST's body is parsed.

**Two demonstrated vectors** (`exploits/`, opened as `file://`):

| Exploit file | Endpoint | Effect |
|---|---|---|
| `7-csrf-like.html` | `POST /posts/:id/like` | forces the victim to like a post (no body needed) |
| `8-csrf-profile.html` | `POST /profile/update` | overwrites the victim's bio + email |

**Why delete is *not* exploitable here (and is skipped):** an HTML form can only send GET/POST,
and a cross-site `fetch('DELETE')` triggers a CORS **preflight** that our origin-locked CORS
rejects. Only "simple" requests (form GET/POST with `application/x-www-form-urlencoded`) sail
through without preflight — those are the CSRF channel. JSON POSTs are likewise preflighted, so
the only forgeable routes are the form-shaped ones above.

**Same-site vs cross-origin (important):** `localhost:4200` and `localhost:3000` are different
**origins** (port differs) but the **same site** (site ignores port). `SameSite` cookies care
about *site*, so the real app works even with `SameSite=Strict`; `SameSite=None` (current) is the
dangerous setting that also sends the cookie to a genuinely cross-site attacker page (a `file://`,
origin `null`). That's why the exploits must be opened as `file://`, and why `SameSite=Strict` is
a real fix in Commit 5.

**Run it:** log in as `alice` at `http://localhost:4200`, then open `7`/`8` via `file://` in the
**same browser** → the like count rises / the bio + email change, with no action from alice.

## Commit 5 — CSRF Fixed ✅

Two independent defenses (defense-in-depth):

1. **`SameSite=Strict` session cookie** ([backend/middleware/auth.js](backend/middleware/auth.js)) —
   the browser no longer attaches the cookie to **cross-site** requests, so an attacker page's
   forged request arrives unauthenticated (`401`). The real app keeps working because `:4200 → :3000`
   is **same-site** (site ignores port), so its calls are same-site.
2. **Synchronizer CSRF token** ([backend/middleware/csrf.js](backend/middleware/csrf.js)) — a random
   per-session token returned by `/login` and `/me`. The Angular app stores it and echoes it as an
   `X-CSRF-Token` header on every state-changing request (a functional `HttpInterceptor`). The server
   rejects any mismatch with `403`. The attacker can't read the token (SOP/CORS) or guess it
   (random), and the custom header also forces a CORS preflight.

`verifyCsrf` runs after `loadSession` and guards all non-safe methods (exempting `/login`, which has
no session yet; unauthenticated requests fall through to the existing `401`).

**Verify the fix:** re-running the `file://` exploits from Commit 4 now does nothing — the like
count and profile stay unchanged. In the app, normal actions still work because the interceptor
supplies the token.

## Commit 6 — Weak CSP ⚠️

A **Content-Security-Policy** is a browser-enforced allowlist for what a page may load/run — and a
key **backstop against XSS**: a strict `script-src 'self'` blocks inline handlers like
`<img onerror=…>` even if escaping fails.

**Where it lives:** a CSP only governs the **document it's attached to**, via a response *header* or
a `<meta>` in the page. The SPA is served by `ng serve` (not Express), so the policy is a **`<meta>`
in [frontend/src/index.html](frontend/src/index.html)** — that's the only way to attach it to the
real page. (The Express API header never reaches the page; it only rides on JSON responses.)

This commit ships the **weak / vulnerable** policy on purpose (the fix is the next commit):
```
default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval';
style-src 'self' 'unsafe-inline'; img-src 'self' data: https: http:;
font-src 'self'; connect-src 'self' http://localhost:3000
```
- `script-src … 'unsafe-inline' 'unsafe-eval'` — inline scripts and `eval` are allowed, so CSP
  provides **no XSS backstop** (an injected inline handler would run).
- `img-src … http:` — also allows insecure image origins.

**Playground:** the **`/csp`** route is an interactive component — buttons that attempt inline
`<script>` injection, a cross-origin script, a non-https image, and a cross-origin fetch, each
reporting allowed/blocked, plus a **live `securitypolicyviolation` log**. Under this weak policy the
inline script **executes** (red = dangerous); the next commit's strict policy will block it.

> Dev note: under `ng serve`, the Vite-based dev server may emit a couple of CSP console warnings
> (HMR); the app still loads.

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
exploits/       Standalone HTML attacker pages (CSRF)
docs/           Deep-dive write-ups for quick recap
```

**Reference docs:** [docs/xss-deep-dive.md](docs/xss-deep-dive.md) ·
[docs/csrf-deep-dive.md](docs/csrf-deep-dive.md)

## API reference

| Method | Path | Notes |
|--------|------|-------|
| POST   | `/login` | `{ username, password }` → sets session cookie |
| POST   | `/logout` | clears session |
| GET    | `/me` | current logged-in user |
| GET    | `/posts` | all posts with embedded comments |
| POST   | `/posts` | create post `{ title, content, imageUrl, imageAlt, linkUrl, color }` |
| DELETE | `/posts/:id` | owner only (no CSRF token until Commit 5) |
| GET    | `/search?q=` | search posts by title/content |
| POST   | `/posts/:id/comments` | `{ content }` |
| DELETE | `/posts/:id/comments/:commentId` | owner only |
| POST   | `/posts/:id/like` | like a post (no CSRF token until Commit 5) |
| POST   | `/posts/:id/unlike` | remove a like |
| GET    | `/api/users/:id` | user profile |
| POST   | `/profile/update` | `{ bio, email }` (no CSRF token until Commit 5) |

## The 6-commit learning plan

0. **Setup + secure baseline** — *(this commit)* full app, no vulnerabilities.
1. *(merged into Phase 0)*
2. **Add XSS vulnerabilities** — remove escaping + bypass Angular's sanitizer; 7 XSS vectors
   (6 stored + 1 reflected) become exploitable.
3. **Fix XSS** — re-apply context-specific escaping and restore safe Angular bindings.
4. **Demonstrate CSRF** — attacker pages for 2 form-POST vectors (like, profile); delete is not
   form-CSRF-able here and is skipped.
5. **Fix CSRF** — `SameSite=Strict` cookie + synchronizer CSRF token (validated server-side).
6. **CSP** — demonstrate a weak CSP, then harden it.
