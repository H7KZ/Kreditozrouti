---
status: accepted
date: 2026-10-05
---

# The public API is partner-only and launches behind hard gates

> Browser access was added afterwards: see [ADR 0005](0005-browser-origins-are-bound-per-api-key.md).

The public API has Consumers (named partner organisations, first Studolog) holding API Keys issued by hand. There
is no self-serve signup, and the API stays that way until the gates below pass. Self-serve would be a signup form
on the same Consumer, API Key and Plan model, not a redesign, so the door stays open.

The reason is data redistribution. The API serves scraped InSIS data to a third party. `insis.vse.cz/robots.txt`
is `Disallow: /`, we found no InSIS terms of use, and Directive 96/9/EC Art. 7 covers re-utilising a substantial
part of a database online. The scraper feeding our own web app is quiet. A partner API makes redistribution
explicit, and an open one would make it unbounded. One named partner is easy to defend, easy to rate limit and
easy to cut off. Lecturer names are also personal data under GDPR Art. 4(1), which needs a notice and a takedown
path.

## Launch gates

All must pass before the first key is issued. No timed fallback was agreed.

1. Studolog written terms, drafted by Studolog.
2. Privacy notice updated for lecturer names, with a takedown contact.
3. Public visibility defaults to hidden for faculties not yet confirmed by a scrape, and the API honours
   `insis_faculties.is_schedule_publicly_visible`.
4. Quotas, the key script and `GET /v1/usage` work, and a fail-open drill passes ([ADR 0003](0003-partner-api-rate-limit-fails-open.md)).
5. VŠE or InSIS permission to redistribute scraped data.

## Considered options

- Open self-serve API from day one. Rejected: no second consumer exists, and it multiplies the redistribution
  exposure and the abuse handling.
- Launch to Studolog without gate 5 and record the accepted risk. Rejected for now: the legal risk is real and the
  fix is one email. Reopen only with a new decision.

## Consequences

Studolog's open questions (ID matching, attribution wording, expected volume) do not block the design. They shape
Plan sizing and the contract later and can be answered after the gates. Gate 5 is outside our control and is the
likely schedule risk. Opening the API to more partners needs a Consumer-level review of gates 1 and 2 each time.
