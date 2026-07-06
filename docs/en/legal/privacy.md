---
title: Privacy Policy
description: How Kreditožrouti handles your data.
---

# Privacy Policy

_Last updated: January 31, 2026_

## What data Kreditožrouti collects

Kreditožrouti does not require registration or login. It does not collect, store, or process any personal data about students.

The application sources data exclusively from the publicly accessible InSIS course catalog — the same pages any student can browse without logging in. This data consists of:

- Course metadata (title, identifier, credits, syllabus)
- Timetable slots (day, time, room)
- Lecturer names (as course attributes, published by VŠE per SR 05/2018 Art. 19(2))
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

| Property | Detail |
|---|---|
| Cookies | Not used |
| IP addresses | Collected by Umami but hashed before storage — never stored in readable form |
| Personal identifiers | Not collected |
| Third-party sharing | None — data stays on our own server |
| Legal basis (GDPR) | Legitimate interest (Art. 6(1)(f)) — anonymised usage measurement |

Data collected by Umami: page views, session duration, referrer, and aggregate feature interactions (e.g. "a course was added to a timetable"). This data cannot identify any individual user.

## Your timetable data

Any timetable you build is stored exclusively in your browser's `localStorage`. It is never sent to our servers. Clearing your browser data removes it permanently.

## Lecturer names

Lecturer names are displayed solely as attributes of course records, within the scope explicitly permitted by VŠE Směrnice rektora 05/2018 Art. 19(2)(n) (teaching carried out at VŠE). No additional personal information about lecturers is collected or displayed.

## Security

- HTTPS is enforced on all connections (Traefik / Let's Encrypt)
- No user credentials are stored (there is no account system)
- The application does not write any data back to InSIS

## Contact

Kreditožrouti is a student-initiated project, not an official VŠE application. For questions about this policy, open an issue on the project repository or use the feedback form in the application.
