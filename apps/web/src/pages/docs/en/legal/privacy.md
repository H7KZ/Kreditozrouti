---
title: Privacy Policy
section: Legal
order: 1
---

# Privacy policy

_Updated September 24, 2026_

Kreditožrouti is a student project. You can use it without an account. It reads VŠE's public InSIS catalog, including lecturer names associated with courses. Names are personal data even when publicly available. The app does not access your InSIS account, grades, or enrollment record.

## Information used by the service

| Purpose | Information | Storage and retention |
| --- | --- | --- |
| Course browsing | Public course, timetable, study plan, faculty, and lecturer data | Application database; refreshed from InSIS |
| Draft planning | Wizard choices, completed-course marks, schedules, and preferences | Your browser's local storage; clear browser data to remove them |
| Shared timetable and calendar links | Selected units and calendar settings when you create a link | Redis; links expire after 180 days without a view, and viewing renews that period |
| Usage analytics | Page views, referrers, and feature events | Self-hosted Umami; scheduled deletion after 13 months |
| Optional feedback | Your rating and any comment you submit | Umami event data; scheduled deletion after 12 months |
| Error diagnosis | JavaScript errors, page address, and Web Vitals | Self-hosted Grafana Faro and Loki; logs retained for up to 7 days |

Feedback comments are free text. Please do not include personal details. A comment may itself contain personal data even though the form asks you to avoid it. We send feedback only when you submit it. A share link lets anyone holding it view the selected timetable; share it accordingly.

Umami uses no analytics cookies. The app removes share-link IDs, query strings, and fragments from page addresses sent to Umami and Faro. Faro session tracking and console capture are disabled. Technical request information, including your IP address, is processed when you access the service. Cloudflare delivers and protects the site and may process data outside the EEA under its [data processing terms](https://www.cloudflare.com/cloudflare-customer-dpa/); application services run on Hetzner infrastructure in Germany.

We rely on legitimate interests to operate, secure, and improve the service and on your choice to submit optional feedback. Browser storage is used for the planning features you choose. You can stop using the service and clear local data at any time. For access, correction, or deletion requests about server-side information, [contact the project](https://github.com/H7KZ/Kreditozrouti/issues) with enough context to locate it. Some analytics events have no user identifier, which may limit our ability to identify an individual record.

This project is independent of VŠE. Check the [terms](terms.md) for service limitations.
