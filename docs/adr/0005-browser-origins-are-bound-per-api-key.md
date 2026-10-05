---
status: accepted
date: 2026-10-05
---

# Browser access to the partner API is bound to origins registered on each API key

[ADR 0004](0004-public-api-is-partner-only-behind-hard-gates.md) shipped the partner API as server-to-server only.
That is reversed here: a partner may call `/v1` from its backend or straight from its frontend, with the same key
type, because the first partner (Studolog) offers browser origins on its own keys and expects the same. An API key
carries an optional list of exact origins, set by the operator with `partnerKeys set-origins`, never by the partner.

- A request without an `Origin` header (a server, curl) works with any key.
- A browser request must come from one of the key's origins, otherwise 403. A key with no origins is refused from a
  browser, so a secret key pasted into frontend code fails at once instead of working quietly.
- CORS headers are sent for any origin registered on at least one usable key, on every response including 401, 403
  and 429, so a frontend developer can read the error. No cookies are involved, so credentials are never allowed.

## Why the preflight answers for every registered origin

A browser's CORS preflight carries no `Authorization` header, so the server cannot know which key will follow. The
alternatives were to answer every preflight (any website could probe the API) or to require a separate publishable
key type with its own endpoints. Answering preflights for exactly the set of origins registered on active keys lets a
real frontend through and gives every other origin nothing, and the per-key check on the real request is what binds
key X to its own origins. The set is cached for 15 seconds, the same window as key revocation.

## Considered options

- Keep it server-only and make Studolog proxy. Rejected: their own product offers browser origins and their frontend
  would need a backend hop for a read-only catalogue.
- A separate publishable key type. Deferred: it doubles the key model for no extra protection, because a key with
  origins is already a different thing from a key without. Separate keys for backend and frontend are still
  recommended, and the CLI makes that cheap.
- Wildcard origins such as `https://*.example.cz`. Rejected for now: exact origins only, so a forgotten subdomain
  cannot use a key.

## Consequences

An origin check does not stop a non-browser client, which can send any `Origin`. A key with origins must be treated
as public: its protection is the origin check against other websites, the per-consumer quota, per-key scopes (give a
browser key only what the frontend needs, for example no `lecturers:read`) and revocation. Browser traffic spends the
same per-consumer quota as backend traffic, so a leaked browser key can exhaust the quota of the server key; if that
becomes a problem, add a quota per key. `Cross-Origin-Resource-Policy` is set to `cross-origin` on `/v1` and the web
app's own CORS allowlist skips `/v1`, so neither interferes with the other.
