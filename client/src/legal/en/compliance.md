# Kreditožrouti — Regulatory Compliance & Terms of Usage

*Verification of Compliance with VŠE Internal Regulations*

| Field | Value |
|---|---|
| Document Version | v0.0.1 — Beta Launch |
| Date | January 31, 2026 |
| Applicable To | Kreditožrouti Web Application |
| Regulations Reviewed | SR 05/2018, PR 04/2019, PR 02/2023, Study Rules |
| Audience | Students, Professors, University Staff |

## 1. Executive Summary

You might be wondering: is Kreditožrouti allowed? Does it break any university rules? Is my data safe? This document answers those questions by mapping every applicable VŠE regulation to the application's actual implementation. The short answer: yes, it's fully compliant. Here's the detailed breakdown.

**Compliance Summary**

- SR 05/2018 (Data Protection): **COMPLIANT** — No personal data processed
- PR 02/2023 (IS Usage Rules): **COMPLIANT** — Read-only public data access, scraping approved by InSIS řídicí výbor
- PR 04/2019 (Webhosting Rules): **NOT APPLICABLE** — Self-hosted infrastructure
- Study & Examination Rules: **COMPLIANT** — Supports student course discovery

## 2. Application Overview

Kreditožrouti is a web application that helps VŠE students discover courses, plan schedules, and detect timetable conflicts. It scrapes the publicly accessible InSIS course catalog (no authentication required), normalizes the data, and presents it through a modern search interface with advanced filtering capabilities.

### 2.1 Data Sources & Scope

| Data Category | Source | Personal Data? |
|---|---|---|
| Course metadata (title, ident, credits, syllabus) | InSIS public catalog | No |
| Timetable slots (day, time, room) | InSIS public catalog | No |
| Lecturer names (as course attribute) | InSIS public catalog | Limited — see §2.2 |
| Study plans (structure, categories) | InSIS public catalog | No |
| Faculty information | InSIS public catalog | No |
| Student personal data | NOT COLLECTED | N/A — Never accessed |
| Student grades / enrollment | NOT COLLECTED | N/A — Never accessed |
| Authentication credentials | NOT COLLECTED | N/A — No login system |

### 2.2 Lecturer Names — Classification

Lecturer names appear as attributes of course records in the publicly accessible InSIS catalog. Per SR 05/2018 Article 19(2), VŠE permits publication of employee names, titles, position, and teaching activities (subparagraphs a–c, e, n). Kreditožrouti displays lecturer names strictly in the context of course teaching assignments, which falls within this permitted scope. No additional personal information (contact details, photos, research output) is scraped or displayed.

## 3. SR 05/2018 — Data Protection

Směrnice rektora 05/2018 (Ochrana a zpracování osobních údajů) implements GDPR requirements within VŠE. This section maps each applicable article to Kreditožrouti's implementation.

| Article | Requirement | Status | Implementation |
|---|---|---|---|
| Art. 1(2) | Scope: processing by employees/students in course of duties | ✅ | Kreditožrouti processes only publicly available course catalog data. No student or employee personal data is collected, stored, or processed beyond what is already public in InSIS. |
| Art. 13 | Register processing activities with Representative (DPO) | N/A | No personal data processing activity exists that requires registration. The application processes publicly available institutional data (course metadata), not personal data per GDPR Art. 4(1). |
| Art. 14(1) | Lawful basis for processing required | ✅ | Primary data (courses, timetables, plans) is institutional, not personal. Lecturer names are published per Art. 19(2)(n). No additional lawful basis is required. |
| Art. 16 | Special categories (biometric, health) require explicit consent | N/A | No special category data is collected or processed. The application has no user accounts, no biometric data, no health data. |
| Art. 17 | Inform data subjects transparently | ✅ | Lecturers are displayed only within the context of their publicly listed teaching assignments. A disclaimer is shown on the application. |
| Art. 19(2) | Publishable data limited to: name, titles, position, teaching | ✅ | Only lecturer name as a course attribute is displayed, which is explicitly within the permitted scope (subparagraph n: teaching carried out at VŠE). |
| Art. 20 | Third-party data sharing requires DPO notification | N/A | Kreditožrouti does not share any data with third parties. No analytics, tracking, or external API integrations transmit data externally. |
| Art. 21 | Security measures: encryption, access controls, incident reporting | ✅ | HTTPS via Traefik/Let's Encrypt. Environment-based secrets. Parameterized queries. Bearer token authentication for admin endpoints. Sentry error tracking. |

## 4. PR 02/2023 — IS Usage Rules

Pravidla provozování a využívání informačních systémů (PR 02/2023) governs the creation, operation, and usage of information systems at VŠE.

### 4.1 Classification: Is Kreditožrouti a VŠE IS?

**Key Determination:** Kreditožrouti is **NOT** a VŠE Information System as defined in PR 02/2023 Art. 3. It is an independent, externally hosted, student-initiated tool that consumes publicly available data. It is not operated by any VŠE organizational unit, is not registered in the VŠE IS registry, and does not process data within VŠE's infrastructure. However, certain provisions remain relevant because the application interacts with InSIS data. These are analyzed below.

### 4.2 Relevant Provisions

| Article | Requirement | Status | Kreditožrouti Position |
|---|---|---|---|
| Art. 3(5) | VŠE maintains a registry of its IS, managed by Cyber Security Manager | N/A | Kreditožrouti is not a VŠE IS and therefore is not subject to registry. It is a student project hosted on external infrastructure. |
| Art. 8(2) | Users must handle IS data in accordance with its purpose and VŠE policies | ✅ | All data sourced from InSIS is used strictly for course discovery and schedule planning — the same purpose for which it is publicly available in InSIS. |
| Art. 9A.8(1) | Users must not arbitrarily modify, insert, or delete data in InSIS | ✅ | Kreditožrouti performs READ-ONLY operations on publicly accessible InSIS pages. No data is written back. No modifications are made. |
| Art. 9A.8(2) | Automated execution of InSIS functionality requires approval | ✅ Approved | The InSIS Řídicí výbor (Steering Committee) has reviewed and approved this use case. The scraper operates read-only with rate limiting, job deduplication, and scheduled off-peak runs (1–2 AM). |

### 4.3 InSIS Steering Committee Approval

The InSIS Řídicí výbor (Steering Committee) — the administrators responsible for the InSIS information system — has reviewed Kreditožrouti's scraping scope, frequency, rate limiting measures, and data usage, and has granted approval for this project use case.

This approval covers read-only scraping of the publicly accessible InSIS course catalog for the purpose of course discovery and schedule planning by VŠE students.

## 5. PR 04/2019 — Webhosting Rules

Pravidla používání serveru webhosting.vse.cz (PR 04/2019) governs websites hosted on VŠE's webhosting.vse.cz server.

**Applicability Assessment: NOT APPLICABLE.** Kreditožrouti is NOT hosted on webhosting.vse.cz. It is deployed on independent infrastructure using Docker containers with Traefik reverse proxy and its own domain. However, if the project were to migrate to VŠE infrastructure in the future, the following provisions would apply:

### 5.1 Future-Proofing: Webhosting Compliance Readiness

| Article | Requirement | Ready? | Current State |
|---|---|---|---|
| Art. 3 | Domain names must not violate good morals or impersonate other units | ✅ | "Kreditožrouti" is a playful student-facing name. It does not impersonate any VŠE unit and is not commercial. |
| Art. 4 | Domains require electronic approval from rector/dean | ✅ Ready | If migrating to VSE.cz subdomain, formal approval process is understood and will be followed. |
| Art. 8 | Official pages must use unified VŠE visual identity | ✅ Ready | Kreditožrouti already mirrors InSIS visual language. Adaptation to official branding would be straightforward. |
| Art. 11 | Non-official pages must display disclaimer | ✅ | Application displays a visible disclaimer stating it is not an official VŠE application. |
| Art. 16 | HTTPS is mandatory | ✅ | HTTPS enforced via Traefik with automatic Let's Encrypt certificates. HTTP redirected to HTTPS. |

## 6. Study & Examination Rules Context

The Studijní a zkušební řád VŠE establishes the framework within which course registration, study plans, and academic scheduling operate. Kreditožrouti supports (but does not replace) the official processes defined in these rules.

| Article | Study Rule | Kreditožrouti Support |
|---|---|---|
| Art. 9 | Course registration is done via InSIS in defined periods | Kreditožrouti is a PLANNING tool. Students build draft schedules here, then register officially in InSIS. This distinction is clearly communicated. |
| Art. 14 | Study plans prescribe required courses per semester | The Study Plan Wizard categorizes courses as compulsory, optional, or elective per the selected plan, helping students understand their obligations. |
| Art. 13 | Credit system: students must maintain credit thresholds | Course credit values are displayed prominently. Completeness checking verifies course unit selection. |
| Art. 10 | Grading/classification recorded in InSIS | Kreditožrouti does NOT access, display, or process any grade or classification data. It is strictly a course discovery tool. |
| Art. 8 | Course accreditation changes must be published before registration | Kreditožrouti scrapes during registration preparation periods to ensure data reflects current semester offerings. |
