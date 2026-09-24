# Web internals

## API and shared code

`web/src/api.ts` creates the Axios client. Its base URL is `VITE_API_URL` or `/api`, and its response interceptor reports errors through `alerts.store.ts`. `web/src/services/` wraps course, study-plan, optimizer, and calendar requests. UI code should use these services through stores or composables.

The web app imports DTOs and domain types from `@kreditozrouti/types`. Browser-safe runtime functions come from `@kreditozrouti/core`. It must not import API runtime modules, core database or service modules, or the Node-only logger.

## Localization and routing

`web/src/i18n.ts` configures Czech and English translations from `web/src/locales/`. Component setup uses `useI18n()`; stores use `i18n.global`. `unplugin-vue-router` derives routes from `web/src/pages/`, including localized public docs and the shared-timetable route.

## Utilities and constants

- `web/src/utils/timetable.ts` re-exports shared conflict, completeness, and campus functions from core.
- `web/src/utils/markdown.ts` renders scraped Markdown through `marked` and DOMPurify. Use `renderMarkdown()` before passing untrusted content to `v-html`.
- `web/src/utils/localstorage.ts` centralizes guarded browser-storage access. `web/src/constants/storage.ts` names app keys.
- `web/src/utils/day.ts` and `web/src/utils/ical.ts` handle day conversion and calendar output.
- `web/src/constants/timetable.ts` defines weekday order, grid times, and drag measurements. All stored times are minutes after midnight.

## Telemetry

`web/src/analytics.ts` loads self-hosted Umami only when `VITE_UMAMI_WEBSITE_ID` is set. It removes query strings and redacts shared-timetable IDs from URLs. `web/src/faro.ts` initializes browser error and Web Vitals reporting only when `VITE_FARO_COLLECTOR_URL` is set. Faro also redacts share URLs; session tracking and console capture are disabled.

## Accessibility and metadata

The app uses `announcer.store.ts` and `ScreenReaderAnnouncer.vue` for dynamic result announcements. Pages set metadata through `@unhead/vue`. Check the relevant component when changing keyboard behavior, labels, or SEO text.
