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

## Gate status (2026-11-13)

Gate 1 is amended: the terms may be drafted by us, as long as Studolog accepts them in writing before a key is
issued. Studolog had not sent a draft after the October call, and waiting on them blocked nothing else.

| Gate                | Status                                                                                                                                                                                                                                 |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Partner terms    | Drafted by us in [PARTNER_TERMS.md](../api/PARTNER_TERMS.md). Passes when Studolog replies in writing that it accepts them.                                                                                                            |
| 2. Privacy notice   | Passed. The privacy page names lecturers as personal data, lists the partner API as a recipient and gives a takedown contact.                                                                                                          |
| 3. Visibility       | Passed. Verified locally: hidden and unconfirmed faculties return nothing on every endpoint, including lecturer course lists and course detail by id.                                                                                  |
| 4. Quotas and drill | Passed. Per-minute and daily limits, the key CLI, revocation (under 15 seconds) and `GET /v1/usage` verified locally. Fail-open drill with Redis paused and stopped: `/v1` kept answering and `partner.quota_store_failed` was logged. |
| 5. VŠE permission   | Passed on a verbal, informal OK from the InSIS administrator, recorded by the maintainer on 2026-11-13. Follow-up: get it in writing, and revisit this ADR if the permission is withdrawn.                                             |

## Considered options

- Open self-serve API from day one. Rejected: no second consumer exists, and it multiplies the redistribution
  exposure and the abuse handling.
- Launch to Studolog without gate 5 and record the accepted risk. Rejected for now: the legal risk is real and the
  fix is one email. Reopen only with a new decision.

## Consequences

Studolog's open questions (ID matching, attribution wording, expected volume) do not block the design. They shape
Plan sizing and the contract later and can be answered after the gates. Gate 5 is outside our control and is the
likely schedule risk. Opening the API to more partners needs a Consumer-level review of gates 1 and 2 each time.
