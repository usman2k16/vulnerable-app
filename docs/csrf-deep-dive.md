# CSRF Deep Dive

A self-contained recap of Cross-Site Request Forgery, grounded in this project (Commit 4, fixed in
Commit 5).

## TL;DR
The browser **automatically attaches your cookies based on the request's destination, not on who
initiated it**. So a malicious page can make *your* browser fire an authenticated request to a site
you're logged into. The attacker can't read the response or your cookie — they just want the
**side effect**. This automatic-cookie behaviour is called **ambient authority**, and it's the
root cause.

---

## 1. Prerequisites

### 1.1 Sessions & cookies
HTTP is stateless; login issues a random session id ([backend/middleware/auth.js](../backend/middleware/auth.js)
`createSession`) returned in a cookie. Browsers **re-send cookies automatically** on every matching
request — convenient, and the seed of CSRF.

### 1.2 Cookie attributes that matter

| Attribute | Meaning | CSRF relevance |
|---|---|---|
| `HttpOnly` | JS can't read it | Stops cookie *theft* (XSS); **does NOT stop CSRF** (browser still sends it) |
| `Secure` | HTTPS only (localhost exempt) | Required for `SameSite=None` |
| **`SameSite`** | Whether sent on **cross-site** requests | **The key attribute** |

Crucial: `HttpOnly` protects *reading* the cookie; CSRF only needs it *used*.

### 1.3 Origin vs Site (the distinction that trips everyone)
- **Origin** = `scheme + host + port` (exact). `localhost:4200` ≠ `localhost:3000` → **cross-origin**.
- **Site** = `scheme + registrable domain`, **port-ignored**. `localhost:4200` and `localhost:3000`
  → **same site**.

CORS uses *origin*; `SameSite` uses *site*. So our app and API are **cross-origin but same-site** —
which is why we need CORS *and* why `SameSite=Strict` will still let the real app work. A real
attacker (`file://` = origin `null`, or `evil.com`, or `127.0.0.1`) is a different **site**.

### 1.4 Same-Origin Policy (SOP)
A page from origin A can't **read** responses/DOM/cookies of origin B. SOP is about *reading* — it
does **not** stop A from *sending* a request to B.

### 1.5 CORS — and the big myth
CORS lets a server opt in to letting another origin **read** its responses. Two key points:
- **CORS does not stop the request being sent** (for "simple" requests) or the side effect. It only
  governs whether the attacker's JS may *read* the response. So **"CORS is configured" ≠ CSRF
  protection.**
- The *only* way CORS incidentally blocks CSRF: **preflighted** requests it rejects (next).

### 1.6 Simple vs preflighted requests
"Simple" (no preflight) requires all of: method `GET/HEAD/POST`; safelisted headers only;
`Content-Type` ∈ {`application/x-www-form-urlencoded`, `multipart/form-data`, `text/plain`}.
Anything else (`DELETE`/`PUT`, `application/json`, custom header like `X-CSRF-Token`) →
**preflight** `OPTIONS`. **An HTML `<form>` can only make simple requests** — the attacker's
universal tool.

### 1.7 The SameSite decision table

| `SameSite` | Same-site request | Cross-site top-level **GET** nav | Cross-site **POST / fetch / subresource** |
|---|---|---|---|
| `Strict` | ✅ | ❌ | ❌ |
| `Lax` (default) | ✅ | ✅ | ❌ |
| `None` (needs `Secure`) | ✅ | ✅ | ✅ |

Only **`None`** sends the cookie on a cross-site **POST** — exactly what form-CSRF needs, and
exactly our current setting.

---

## 2. How our app sets the cookie
[backend/middleware/auth.js](../backend/middleware/auth.js):
```js
res.cookie('sessionId', token, { httpOnly: true, sameSite: 'none', secure: true, path: '/' });
// Set-Cookie: sessionId=…; Path=/; HttpOnly; Secure; SameSite=None
```
Every protected route trusts that cookie alone (`requireAuth`), with **no anti-CSRF token** — the
hole. (`Secure` works over `http://localhost` because browsers treat localhost as a secure context.)

## 3. Root cause + the 3 conditions (all true here)
1. The action is a single forgeable request (one POST). ✅
2. Auth rides on an **auto-sent** credential (the cookie), not an actively-supplied token. ✅
3. **No unguessable token** ties the request to the real app (the `csrfToken` field is unused). ✅

## 4. The same-site (legit) request
App page `http://localhost:4200` → `fetch` to API `http://localhost:3000` with
`withCredentials:true`.
- **Cross-origin** → CORS applies; allowed via `cors({ origin: 'http://localhost:4200',
  credentials: true })` in [backend/server.js](../backend/server.js).
- **Same-site** → the cookie is attached regardless of `SameSite` value.
- **Consequence:** we can switch to `SameSite=Strict` and the app *still works* — only genuine
  cross-site callers lose the cookie.

## 5. The cross-site attack, step by step
Victim is logged in; opens `exploits/7-csrf-like.html` as `file://`:
```html
<form id="f" action="http://localhost:3000/posts/post1/like" method="POST"></form>
<script>document.getElementById('f').submit();</script>
```
1. `file://` page loads — initiator site is `null` (cross-site to `localhost`).
2. Form auto-submits: POST, `application/x-www-form-urlencoded` → **simple request, no preflight**.
3. Cookie decision: cross-site POST → attached only if `SameSite=None`. It is → **cookie sent**.
4. Server sees a valid `sessionId`, `requireAuth` passes, **no token checked** → like recorded as
   the victim.
5. CORS stops the `file://` page from *reading* the response — but the side effect already
   happened.

`exploits/8-csrf-profile.html` is the same with a body (`bio`, `email`); `express.urlencoded()`
(added in [backend/server.js](../backend/server.js)) parses it so the profile — including **email**
(an account-takeover foothold) — is overwritten.

## 6. Why like & profile work but delete/JSON don't

| Endpoint | Method / body | Simple? | Forgeable by a page? |
|---|---|---|---|
| `POST /posts/:id/like` | POST, no body | ✅ | **Yes** |
| `POST /profile/update` | POST, form body | ✅ | **Yes** |
| `DELETE /posts/:id` | DELETE | ❌ → preflight rejected | No |
| any JSON POST | POST + `application/json` | ❌ → preflight rejected | No |

Forms can't issue `DELETE` or send JSON, so those are *incidentally* CSRF-resistant here. **Treat
that as a side effect, not a defense.**

## 7. What we observed (real Chromium test)
```
LOGIN  → sessionId present (sameSite=None, secure=true)
BEFORE → likes:1, bio:"Just a regular user…", email:"alice@example.com"
exploit 7 (file://) → {"success":true,"likes":2}
exploit 8 (file://) → bio:"Hacked by CSRF 😈", email:"attacker@evil.example"
VERDICT: both CSRF fired
```
`file://` initiator (cross-site) + `SameSite=None` (cookie sent on cross-site POST) + no token
(server trusts the cookie) = forged actions as the victim.

> Browser note: works in **Chrome** (treats `http://localhost` as secure, sends the `Secure`
> cookie). **Safari/Firefox** may block third-party cookies by default — demo in Chrome.

## 8. The fix (Commit 5) — defense in depth
1. **`SameSite=Strict` cookie.** Cross-site POST → no cookie → server sees no session → `401`. The
   legit app is same-site, so it keeps working. Kills the `file://`/`evil.com` attack outright.
2. **Synchronizer CSRF token.** Server generates a random per-session token (the `csrfToken` stub),
   exposes it to the *real* app, and the Angular client returns it as an `X-CSRF-Token` header on
   state-changing requests; the server rejects missing/wrong tokens.
   - Works because the token is **not auto-sent** — the caller must include it. The attacker can't
     **read** it (SOP/CORS) and can't **guess** it (random). Bonus: a custom header makes the
     request non-simple → preflight → blocked anyway.

## 9. Myths / takeaways
- **CSRF ≠ XSS.** XSS runs the attacker's script *in your site*; CSRF fires a normal request *from
  another site* and never needs to read anything.
- **`HttpOnly`, CORS, and HTTPS do not stop CSRF.** They solve theft, cross-origin reads, and
  eavesdropping respectively.
- **`SameSite` = site (port-insensitive); CORS = origin (port-sensitive).** Same host, different
  ports → same site, different origin.
- The fix is **proof of intent the attacker can't forge**: a token they can't read, and/or a cookie
  the browser won't send cross-site.

## 10. Quick exploit recipe
1. `cd backend && npm start`; in Chrome log in as `alice` / `password123` at `http://localhost:4200`.
2. In the **same Chrome**, open `exploits/7-csrf-like.html` / `8-csrf-profile.html` via `file://`
   (`open -a "Google Chrome" <path>` or double-click).
3. The page auto-submits; refresh the app → like count rose / bio + email changed.

---
*Related: [xss-deep-dive.md](xss-deep-dive.md).*
