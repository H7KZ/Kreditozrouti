---
title: Privacy Policy
section: Legal
order: 1
---

# Privacy Policy

_Last updated: September 14, 2026_

## What data Kreditožrouti collects

Kreditožrouti does not require registration or login. It does not collect, store, or process any personal data about
students.

The application sources data exclusively from the publicly accessible InSIS course catalog - the same pages any student
can browse without logging in. This data consists of:

- Course metadata (title, identifier, credits, syllabus)
- Timetable slots (day, time, room)
- Lecturer names (as course attributes, published by VŠE per SR 05/2018 Art. 19 (2))
- Study plans (structure and course categories)
- Faculty information

None of this constitutes personal data under GDPR in the context of this application.

## What Kreditožrouti does NOT collect

- Student names, email addresses, or ID numbers
- Grades, enrollment status, or academic records
- Authentication credentials (there is no login)
- Cookies

## Analytics

Kreditožrouti uses **Umami Analytics**, a self-hosted open-source analytics tool. It is privacy-preserving by design:

| Property             | Detail                                                                                                                             |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Cookies              | Not used                                                                                                                           |
| Where it runs        | On our own server, loaded from this site's own address (`/stats`) - no third-party analytics host is contacted                     |
| IP addresses         | Used to derive an approximate country and region and a visitor hash that changes every month; the IP address itself is not stored  |
| Shared links         | A shared timetable link is recorded as `/s/[id]` - the link id, its page title and any query parameters are removed before sending |
| Personal identifiers | Not collected                                                                                                                      |
| Third-party sharing  | None - data stays on our own server                                                                                                |
| Retention            | 13 months, then deleted automatically                                                                                              |
| Legal basis (GDPR)   | Legitimate interest (Art. 6(1)(f)) - anonymised usage measurement                                                                  |

Data collected by Umami: page views, session duration, referrer, and aggregate feature interactions (e.g. "a course was
added to a timetable"). This data cannot identify any individual user.

If you choose to answer the optional in-app feedback prompt, the thumbs-up/down, the optional cookie rating, and any
optional comment text you write are sent to the same self-hosted Umami instance as a single feedback event. The comment
field is optional and free-text - please do not include personal information in it.

| Property           | Detail                                                                                                                                                                                                                            |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Legal basis (GDPR) | Consent (Art. 6(1)(a)) - the event is sent only when you actively submit the prompt                                                                                                                                               |
| Retention          | Free-text comments are retained for a maximum of 12 months, then deleted                                                                                                                                                          |
| Erasure            | Because no identifier is stored with the event, to request erasure of a specific comment (GDPR Art. 17) contact us via the project repository with enough context to locate it; we can also purge the feedback dataset on request |

## Error reporting

Kreditožrouti uses **Grafana Faro** to report application crashes so we can fix them. It is configured to capture only:

| Property             | Detail                                                                                                                                            |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| What is captured     | JavaScript errors (message + stack trace), Web Vitals performance metrics and the page address, with shared link ids and query parameters removed |
| Session tracking     | Disabled - no persistent or pseudonymous identifier is stored in your browser                                                                     |
| Console capture      | Disabled - your console output is never sent                                                                                                      |
| Behavioural tracking | None - no page views, clicks, or navigation are tracked by Faro (that is Umami's scope)                                                           |
| Cookies              | Not used                                                                                                                                          |
| Third-party sharing  | None - reports are sent to our own self-hosted collector, not to Grafana Cloud                                                                    |
| Retention            | 7 days, then deleted automatically                                                                                                                |
| Legal basis (GDPR)   | Legitimate interest (Art. 6(1)(f)) - application stability and security                                                                           |

Because Faro stores no identifier and tracks no behaviour, it does not require consent. If you never hit an error, no
data is sent at all.

## Server logs and infrastructure

Our servers keep technical logs of requests and errors for at most 7 days (access logs 3 days) to fix problems and
handle security incidents. Client IP addresses, query parameters and shared link ids are removed before logs are stored.

The application runs on servers of Hetzner Online GmbH in Germany (European Union). Requests to the site pass through
**Cloudflare, Inc.**, which protects the site against attacks and delivers it; Cloudflare processes each request,
including your IP address, as our processor and may do so outside the European Economic Area. That transfer relies on
the EU-US Data Privacy Framework, under which Cloudflare is certified, and on the standard contractual clauses in its
data processing agreement.

## Data stored in your browser

Everything Kreditožrouti keeps between visits is stored exclusively in your browser's `localStorage`. It is never sent
to our servers, and clearing your browser data removes it permanently. This includes:

- Any timetable you build, plus your saved schedules and wizard selections
- UI preferences (view mode, sidebar, legend)
- Feedback-prompt state, which includes a list of the distinct calendar days on which you have visited. This day-list
  never leaves your browser; it is used only locally to decide whether to show the optional feedback prompt to returning
  users, and it is removed when you clear your browser data.

## Lecturer names

Lecturer names are displayed solely as attributes of course records, within the scope explicitly permitted by VŠE
Směrnice rektora 05/2018 Art. 19 (2)(n) (teaching carried out at VŠE). No additional personal information about
lecturers is collected or displayed.

## Security

- HTTPS is enforced on all connections (Traefik / Let's Encrypt)
- No user credentials are stored (there is no account system)
- The application does not write any data back to InSIS

## Contact

Kreditožrouti is a student-initiated project, not an official VŠE application. For questions about this policy, open an
issue on the project repository or use the feedback form in the application.
