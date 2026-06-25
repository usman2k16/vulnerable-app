# XSS Deep Dive

A self-contained recap of Cross-Site Scripting, grounded in this project (Commits 2–3).

## TL;DR
XSS = the attacker gets **their JavaScript to run inside your page**, in the victim's session.
The root cause is **untrusted data reaching an HTML/JS sink without the right escaping for that
context**. In an Angular app there's a twist: Angular escapes/sanitizes by default, so XSS only
happens when a developer **bypasses** that protection — the classic `DomSanitizer` footgun.

---

## 1. What XSS is
The browser can't tell *your* markup from markup that arrived as data. If user input is dropped
into a page where the browser will parse it as HTML/JS, the attacker's code runs with the same
privileges as your site: read the DOM, read non-`HttpOnly` cookies, make same-origin requests,
keylog, deface, etc.

## 2. The three types

| Type | Where the payload lives | Who's responsible | In this app |
|---|---|---|---|
| **Stored** | Saved on the server, served to everyone later | Backend persists it | ✅ vectors 1–6 |
| **Reflected** | In the request (query/body), echoed back in *that* response | Backend reflects it | ✅ vector 7 (search) |
| **DOM-based** | In a client-only source (`location.hash`/`search`) → JS sink; server never sees it | Frontend only | ❌ intentionally not built |

> DOM-based note (so the recap is complete): source = `location.hash` etc., sink = `innerHTML`/
> `document.write`/`eval`. Because URL fragments are never sent to the server, it can't be fixed
> server-side — only by treating the client source as untrusted.

## 3. Prerequisite: "output context" is everything
The *same* input is dangerous differently depending on where it lands. Each context needs its own
escaping:

| Context | Example sink | Correct defense | Our util ([backend/utils/escape.js](../backend/utils/escape.js)) |
|---|---|---|---|
| HTML body | `<p>HERE</p>` | HTML-entity-encode `& < > " '` | `htmlEscape` |
| HTML attribute | `<img alt="HERE">` | attribute-encode (esp. quotes) | `attributeEscape` |
| URL | `<a href="HERE">` | allow only `http/https`/relative; block `javascript:` | `safeUrl` |
| CSS | `style="color:HERE"` | allowlist values | `safeCssColor` |
| JS | `<script>var x="HERE"</script>` | avoid entirely; if unavoidable, JS-string-encode | (not used — we never inject into JS) |

Escaping for the *wrong* context (e.g. HTML-escaping a value that lands in a URL) does **not**
protect you — `javascript:alert(1)` contains no HTML metacharacters.

## 4. The Angular twist (why removing server escaping wasn't enough)
Angular **auto-escapes** interpolation `{{ }}` and **sanitizes** property bindings (`[innerHTML]`,
`[href]`, `[style]`). So even with raw data from the server, the Phase-0 bindings were safe. To
create working XSS in Commit 2 we had to **defeat Angular on purpose** with a `SafePipe` calling
`DomSanitizer.bypassSecurityTrust*` — the real-world footgun:

```ts
// the deleted Commit-2 footgun
bypassSecurityTrustHtml(value)   // [innerHTML] now runs attacker markup
bypassSecurityTrustUrl(value)    // [href] now allows javascript:
bypassSecurityTrustStyle(value)  // [style] now applies attacker CSS
```

**So every vector was two layers: (a) backend stored raw, AND (b) frontend bypassed the sanitizer.**
The fix reverses both.

## 5. Why `<script>` doesn't fire via `innerHTML`
Per the HTML spec, a `<script>` inserted via `innerHTML` is parsed but flagged **non-executable**.
So `<script>alert(1)</script>` injected into `[innerHTML]` does nothing. The reliable payload uses
an **event handler** instead, which *does* fire:

```html
<img src=x onerror="alert(1)">   <!-- broken src → error event → handler runs -->
```
(`<script>` *does* run in other sinks — `document.write`, server-rendered HTML, programmatic
`appendChild` — just not `innerHTML`.)

## 6. The 7 vectors we built (Commit 2)

| # | Type | Field | Output context | Example payload |
|---|---|---|---|---|
| 1 | Stored | post content | HTML body | `<img src=x onerror="alert('XSS in post')">` |
| 2 | Stored | comment | HTML body | `<img src=x onerror="alert('XSS in comment')">` |
| 3 | Stored | image alt (set Image URL=`x`) | HTML attribute | `" onerror="alert('XSS in attribute')` |
| 4 | Stored | link URL | URL | `javascript:alert('XSS in URL')` |
| 5 | Stored | title color | CSS | `red; background: url("https://…")` |
| 6 | Stored | profile bio | HTML body | `<img src=x onerror="alert('XSS in bio')">` |
| 7 | **Reflected** | search query | HTML body | open `/search?q=<img src=x onerror="alert('Reflected XSS')">` |

**Vector 3 (attribute) detail:** with Angular's `[alt]` binding you can't break out of an
attribute. We had to build the `<img>` as a raw string and inject it via `[innerHTML]` to recreate
the classic "value concatenated into an attribute" bug.

**Vector 7 (reflected) detail:** delivered by a crafted link. The `q` travels to the server,
which echoed it raw, and the page rendered it via `[innerHTML]` — input reflected in *that*
response, nothing stored.

## 7. A nuance worth remembering: modern Angular doesn't sanitize CSS
Angular dropped style sanitization in v10+ (CSS can't execute JS in current browsers). So vector 5
demonstrates **CSS injection** — controlling appearance / loading external resources for
tracking/exfil — not script execution. It's the one vector that never pops an `alert`.

## 8. The fix (Commit 3) — defense in depth
1. **Backend re-escapes per context** (the table in §3), via [backend/utils/escape.js](../backend/utils/escape.js).
2. **Frontend uses safe bindings again** — interpolation `{{ }}`; `[src]`/`[alt]`/`[href]`
   property bindings (Angular sanitizes); `[style.color]` instead of a raw style string. The
   `SafePipe` bypass was deleted entirely.

Either layer alone stops the attack; doing both is the point of defense-in-depth. Verify by pasting
the same payloads — they render as literal text, no popup.

## 9. CSP and XSS (why it isn't the defense *here*)
A strong `Content-Security-Policy` (e.g. `script-src 'self'`) is a valuable *second line* against
XSS — it blocks inline handlers even if escaping fails. But in our split-origin setup the Express
CSP header rides on **API responses**, not the `ng serve` **page**, so it doesn't govern the SPA.
CSP is therefore handled as its own topic in Commit 6 (where it's made to govern the page).

## 10. Myths / takeaways
- **`HttpOnly` cookies don't stop XSS damage** — the script still runs and can act as you; it just
  can't read that specific cookie.
- **Escaping must match the context** — HTML-escaping a URL/CSS value doesn't help.
- **Framework auto-escaping is your friend** — most Angular XSS comes from deliberately bypassing
  it (`bypassSecurityTrust*`, `[innerHTML]` with untrusted data, `eval`/`Function`).
- **Prefer interpolation/property bindings; avoid `[innerHTML]` with user data.**
- `<script>` via `innerHTML` is inert — real payloads use event handlers (`onerror`/`onload`).

## 11. Quick exploit/verify recipe
1. `cd backend && npm start`, `cd frontend && npm start`, log in as `alice` / `password123`.
2. In the vulnerable state (Commit 2): paste a payload from the table into the matching field →
   popup fires. The in-app hints under each input carry the exact payloads.
3. In the fixed state (Commit 3): same payloads render as text; the hints are reframed to green
   "✅ now escaped" notes.

---
*Related: [csrf-deep-dive.md](csrf-deep-dive.md).*
