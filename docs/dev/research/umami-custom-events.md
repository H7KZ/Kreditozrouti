# Umami Custom Events — Research Findings

> Custom-event API, payload limits, direct `/api/send` calls, and privacy notes for a self-hosted Umami tracker,
> gathered against Umami's official docs and source. Researched 2026-08-22.

Scope: this repo self-hosts Umami and already loads the tracker via `client/src/analytics.ts`
(`window.umami.track(event, data)`). This document verifies the tracker API, the data-value limits,
the tracker-less `POST /api/send` path, dashboard storage, and privacy posture — each claim cites a
primary source.

Applicable version: Umami v2 (and forward-compatible v3). The current docs at `docs.umami.is` describe
the `umami.track()` function and the `/api/send` collection endpoint. Umami v1 used the older
`/api/collect` endpoint with a different (2-argument event) tracker call; this repo is on the v2-era
tracker, so all limits below are the v2 numbers.

---

## 1. `umami.track()` — signature and accepted forms

The tracker exposes a single overloaded `track()` function. All five forms:

- Pageview, no args: `umami.track();`
- Custom payload (object): `umami.track(payload: object);`
- Custom event (string name): `umami.track(event_name: string);`
- Custom event with data (string + object): `umami.track(event_name: string, data: object);`
- Function form (callback that receives/returns the payload):
  `umami.track(props => ({ ...props, url: '/home', title: 'Home page' }));`

Canonical example: `umami.track('signup-button', { plan: 'newsletter', id: 123 });`

The repo wrapper `analytics.track(event, data)` maps to the fourth form (`event_name: string, data: object`).

Source: https://docs.umami.is/docs/tracker-functions — "Tracker functions" lists all five call signatures and the
`signup-button` example verbatim.

---

## 2. Event data — allowed value types and size limits

Value types and their caps when using the JavaScript `track()` method:

| Type     | Limit                                                                            |
|----------|----------------------------------------------------------------------------------|
| Numbers  | max precision 4 decimal places (stored as `parseFloat(value).toFixed(4)`)        |
| Strings  | **max length 500 characters**                                                    |
| Booleans | supported                                                                        |
| Dates    | supported (converted to ISO string)                                              |
| Arrays   | converted to a string; same 500-character cap                                    |
| Objects  | max 50 properties (a nested array counts as 1); flattened with dot-notation keys |

- Event **name** is limited to **50 characters**. Event data cannot be sent without an event name.
- HTML `data-*` attribute tracking stores **every value as a string**; only the JavaScript `track()`
  method preserves numeric/boolean/date types. This matters for us — we call the JS method, so a numeric
  rating is stored numeric.

Sources:

- https://docs.umami.is/docs/tracker-functions — the "Event Data" table: Numbers (4-decimal precision),
  Strings (500 chars), Arrays (converted to string, 500 chars), Objects (max 50 properties).
- https://docs.umami.is/docs/track-events — "Event names are limited to 50 characters. Event data
  cannot be sent without an event name." and the note that `data-*` attributes save "as a string,"
  whereas the JS method supports numeric/date/boolean.
- https://docs.umami.is/docs/event-data — the JS/tracker function "Supports strings, numbers, booleans,
  arrays, and objects."

### Source-code enforcement of the 500-char cap (truncation, not rejection)

The 500-char string limit is enforced at write time by truncation, not by rejecting the request:

- `src/lib/data.ts`: `getStringValue` formats numbers as `parseFloat(value).toFixed(4)` and dates
  `toISOString()`; `getDataType` classifies string/number/boolean/date/array; `flattenJSON` recursively
  flattens nested objects into dot-notation keys. `getStoredStringValue` calls
  `truncateString(stringValue, FIELD_LENGTH.stringValue)` — i.e. over-length strings are **silently
  truncated** to the field length, not dropped.
  Source: https://raw.githubusercontent.com/umami-software/umami/master/src/lib/data.ts
- The database column backing this is `event_string_value VARCHAR(500)` (the `event_data` table also has
  `event_key VARCHAR(500)`), which is the physical origin of the 500-char cap.
  Source: https://github.com/umami-software/umami (schema; corroborated by the string-value/500 discussion
  in search results).

Practical answer for free-text feedback: **yes, you can attach an arbitrary user-typed string.** Anything
beyond 500 characters is truncated (not an error, but the tail is lost). Property/key names are also
capped at 500 chars (`event_key`).

---

## 3. Sending events WITHOUT the tracker — `POST /api/send`

Endpoint: `POST /api/send` (v2+). Umami v1 used `POST /api/collect`; the payload concept is the same but
the path and some field names differ. Self-hosted v2 uses `/api/send` at your own host
(`https://<your-umami-host>/api/send`).

JSON body shape:

```json
{
  "type": "event",
  "payload": {
    "website": "your-website-id",
    "name": "event-name",
    "hostname": "your-hostname",
    "url": "/",
    "referrer": "",
    "title": "page-title",
    "language": "en-US",
    "screen": "1920x1080",
    "data": { }
  }
}
```

- `type` accepts `"event"`, `"identify"`, or `"performance"`.
- Required: `type`, `payload`, and within the payload `website` (the website UUID) and `name` for events.
  All other payload fields (`data`, `referrer`, `url`, `hostname`, `title`, `language`, `screen`) are
  optional. Source validation additionally refines that exactly one of `website` / `link` / `pixel` is
  present.
- The custom-event properties go in `payload.data` as an object, subject to the same type/length limits
  as section 2.

Required headers:

- `Content-Type: application/json`
- **`User-Agent` is required** — "you need to send a proper `User-Agent` HTTP header or your request
  won't be registered." The server runs bot detection (`isbot(userAgent)` unless `DISABLE_BOT_CHECK`)
  and will ignore requests that look like bots or lack a UA.

Auth: **none.** "for `/api/send` requests you do not need to send an authentication token."

Can a browser `fetch` call it directly? Yes — no token is needed and CORS is open for collection, so a
`fetch('https://<host>/api/send', { method:'POST', headers:{'Content-Type':'application/json'}, body })`
works from the browser. Caveat: the browser sets `User-Agent` automatically (you cannot and need not set
it), so a normal browser request satisfies the UA requirement; a server-side/`curl` caller must set it
explicitly. This means the widget could POST directly instead of going through `window.umami.track`, but
using the already-loaded tracker is simpler and identical in effect.

Sources:

- https://docs.umami.is/docs/api/sending-stats — payload shape, required `website`/`name`, `type` enum,
  the User-Agent requirement quote, and the "no authentication token" quote.
- https://raw.githubusercontent.com/umami-software/umami/master/src/app/api/send/route.ts —
  `type: z.enum(['event','identify','performance'])`, the "exactly one of website/link/pixel" refine,
  `isbot(userAgent)` bot check, timestamp→Date conversion, and a CSV-formula-injection guard rejecting
  string values beginning with `= + - @ \t \r`.

> Note: the CSV-injection guard in `route.ts` rejects/sanitizes string values whose first character is a
> spreadsheet formula trigger (`=`, `+`, `-`, `@`, tab, CR). Free-text feedback beginning with one of
> those characters (e.g. a message that starts with "-" or "+") may be altered — worth trimming or
> prefixing on our side if we want the raw text preserved.

---

## 4. How event data is stored and viewed in the dashboard

- Custom properties are stored in the `event_data` table (`event_key`, `event_string_value`,
  `event_numeric_value`, `event_date_value`, plus a data-type discriminator), keyed to the event.
- In the dashboard, open the website view and click **Event data** (Events → Properties). It shows "a
  breakdown of each property name and its values, along with the total count for each value." You can
  filter by a specific property name and value.
- Type caveat for aggregation: values collected via HTML `data-*` attributes are always strings, while
  values sent via the JS `track()` method keep their numeric/boolean/date type. So a rating sent as a
  number is stored numerically and can aggregate as a number; the same rating sent as a `data-*`
  attribute would be a string. The dashboard's Event-data view is primarily a distributional
  breakdown (value → count) rather than numeric roll-ups (no built-in average of a numeric property in
  the basic view).

Sources:

- https://docs.umami.is/docs/event-data — "Event data lets you attach custom properties…", the
  Event-data button, and "a breakdown of each property name and its values, along with the total count
  for each value"; and the string-vs-multi-type distinction between data attributes and the tracker
  function.
- https://docs.umami.is/docs/track-events — Properties tab and filtering by property name/value.

---

## 5. Privacy — cookieless / GDPR, and free-text PII risk

- Umami is cookieless and privacy-first: "no cookies, no tracking across sites, and no personal data
  collection," GDPR and PECR compliant out of the box, all collected data anonymized, users not
  identifiable and not tracked across sites.
  Sources: https://umami.is/ , https://umami.is/features , https://github.com/umami-software/umami ,
  https://umami.is/blog/gdpr-compliant-website-analytics
- Important nuance for free-text feedback: Umami's default cookieless posture does **not** cover whatever
  we choose to put into custom event `data`. If a user types PII (name, email, student ID) into a
  free-text feedback field and we send it as event data, we are storing personal data in Umami — the
  "no personal data" guarantee only holds for Umami's automatic collection, not our custom payload.
  "Analytics solutions claiming to be GDPR compliant and operating without cookies does not automatically
  mean you can skip consent… the need for consent depends on what data is collected and how it is
  processed."
  Source: https://umami.is/blog/gdpr-compliant-website-analytics (and the GDPR discussion threads under
  https://github.com/umami-software/umami/discussions/2929 ).
- Mitigation for a feedback widget: keep the free-text field explicitly non-PII ("don't include personal
  info"), do not attach any user identifier alongside it, and consider light client-side scrubbing.

---

## 6. Version note

- Behavior above is Umami **v2** (current line; forward-compatible with v3 docs). The `umami.track()`
  overloads, the 50-char event-name limit, the 500-char string / 4-decimal-number / 50-property limits,
  and the `POST /api/send` endpoint are all v2 semantics.
- Umami **v1** used `POST /api/collect` and an older event model; if the self-hosted instance were v1
  these paths/limits would differ. This repo loads the v2-era tracker (`data-website-id` script injection
  in `client/src/analytics.ts`), so v2 applies.
- The exact tracker script version is whatever the self-hosted server serves at `VITE_UMAMI_SRC`
  (`/script.js` on the Umami host); it is pinned to that server's Umami release, not hard-coded in this
  repo.
  Sources: https://docs.umami.is/docs/tracker-functions , https://docs.umami.is/docs/api/sending-stats

---

## Implications for a rating + feedback widget

Yes — a single event can carry all three fields in one `data` object, and the tracker is already loaded,
so `analytics.track()` is enough (no direct `/api/send` needed):

```ts
analytics.track('feedback', {
  rating: 4,            // number — kept numeric (max 4 decimal places; we only need integers 1–5)
  thumbs: 'up',         // string 'up'/'down' — or a boolean; both are supported and stored typed
  message: '<free text>' // string — truncated at 500 chars
})
```

- **Rating (1–5):** send as a `number`. Stored numerically (`event_numeric_value`); no precision concern
  for integers.
- **Thumbs:** send as a `string` (`'up'`/`'down'`) or a `boolean`. Both are first-class via the JS method.
  A string enum reads more clearly in the Event-data breakdown.
- **Free-text feedback:** send as a `string`. **Safe max length = 500 characters** — this is a hard cap;
  anything longer is silently truncated (not rejected). Enforce a `maxlength=500` on the textarea so the
  user sees exactly what will be stored, and trim to be safe.
- Keep the whole `data` object well under 50 properties (we use ~3) and each property name under 500
  chars (trivially satisfied).
- Watch two edge cases from the source: (a) a message beginning with `= + - @` or a tab/CR may be altered
  by the CSV-injection guard — prefix/trim if raw preservation matters; (b) do not let users put PII in
  the free-text field, since custom event data is outside Umami's automatic anonymization.
- Event name `'feedback'` is 8 chars, well within the 50-char event-name limit.
