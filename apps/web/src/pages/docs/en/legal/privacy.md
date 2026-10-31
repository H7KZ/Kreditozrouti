---
title: Privacy Policy
section: Legal
order: 1
---

# Privacy policy

_Updated October 31, 2026_

Kreditožrouti is an independent student project. You can use it without an account. It reads VŠE's public InSIS catalog, including lecturer names associated with courses. Names are personal data even when publicly available. The app does not access your InSIS account, grades, or enrollment record.

## Who is responsible

The project maintainers operate the service and decide how data is processed (the controller under the GDPR). There is no company behind it. To reach us, [open an issue](https://github.com/H7KZ/Kreditozrouti/issues); please do not post personal details publicly, and say so in the issue so we can arrange another way to answer.

## Information used by the service

| Purpose                             | Information                                                         | Storage and retention                                                                                        |
| ----------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Course browsing                     | Public course, timetable, study plan, faculty, and lecturer data    | Application database; refreshed from InSIS                                                                   |
| Draft planning                      | Wizard choices, completed-course marks, schedules, and preferences  | Your browser's local storage; clear browser data to remove them                                              |
| Shared timetable and calendar links | Selected units (including lecturer names) and calendar settings     | Redis; links expire after 180 days without a view, and viewing renews that period                            |
| Usage analytics                     | Page views, referrers, and feature events                           | Self-hosted Umami; scheduled deletion after 13 months                                                        |
| Optional feedback                   | Your rating and any comment you submit                              | Umami event data; scheduled deletion after 12 months                                                         |
| Error diagnosis                     | JavaScript errors, page address, and Web Vitals                     | Self-hosted Grafana Faro and Loki; logs retained for up to 7 days                                            |
| Security and abuse protection       | IP address, request path, and status of requests to the API and MCP | Rate-limit counters and recent error entries in Redis (up to 24 hours); server logs in Loki for up to 7 days |

Feedback comments are free text. Please do not include personal details. A comment may itself contain personal data even though the form asks you to avoid it. We send feedback only when you submit it. A share link lets anyone holding it view the selected timetable; share it accordingly.

## Cookies and tracking

Umami uses no analytics cookies, and the app sets no cookies of its own. Its other browser storage (local storage) only holds the planning data and settings you choose to create. Faro session tracking and console capture are disabled, so no persistent identifier is stored for diagnostics. The app removes share-link IDs, query strings, and fragments from page addresses sent to Umami and Faro. The app does not record clicks, scrolling, mouse movement, or session replays.

## Lecturer names

Lecturer names come from the public InSIS catalog and are shown for course browsing, filtering, and timetable details. They also appear in share links and calendar exports you create, and are available to approved partner integrations of the project's catalog API. The MCP server for AI assistants does not return lecturer names. If you are named in the catalog and want a name removed from the service, [contact us](https://github.com/H7KZ/Kreditozrouti/issues); the name's source remains InSIS and is refreshed from there.

## AI assistants and the MCP server

The project offers an MCP server that lets AI assistants you choose search courses and check timetables. It returns course, timetable, and study plan data, not lecturer names. What your assistant sends to its provider (your prompts and the results it receives) is handled by that provider under its own terms; we do not control it. We do not receive your conversation.

## Recipients and transfers

Cloudflare delivers and protects the site and may process data outside the EEA under its [data processing terms](https://www.cloudflare.com/cloudflare-customer-dpa/). Application services run on Contabo infrastructure in France. Analytics, error diagnosis, and logs are self-hosted; we do not sell data or use it for advertising or profiling.

## Legal basis

We rely on legitimate interests (Art. 6(1)(f) GDPR) to operate, secure, and improve the service, to provide public course information, and to protect it from abuse. Optional feedback is submitted by your own choice. Technical request information, including your IP address, is processed when you access the service.

## Your rights

You can ask for access, correction, deletion, or restriction of your personal data, and you can object to processing based on legitimate interests. Local data can be cleared in your browser at any time. For server-side information, [contact us](https://github.com/H7KZ/Kreditozrouti/issues) with enough context to locate it, such as a share link. Some analytics events and logs carry no user identifier, which may limit our ability to find an individual record. You may also complain to the Czech data protection authority, [Úřad pro ochranu osobních údajů](https://uoou.gov.cz), or to the authority in your own country.

## Children

The service is intended for university students and is not directed at children.

## Changes

We may update this policy as the service changes; the date at the top shows the latest revision.

This project is independent of VŠE. Check the [terms](terms.md) for service limitations.
