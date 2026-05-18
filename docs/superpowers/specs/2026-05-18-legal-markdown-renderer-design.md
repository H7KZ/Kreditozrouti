# Legal Markdown Renderer — Design Spec

**Date:** 2026-05-18  
**Status:** Approved

---

## Goal

Replace the current PDF-based compliance documents with locale-aware Markdown files rendered as in-app pages. Provide a sticky sidebar TOC auto-generated from document headings. Extensible: adding future legal docs requires only a new `.md` file, no new page component.

---

## Routing

Single dynamic route handles all legal documents:

```
/legal/[slug]   →   client/src/pages/legal/[slug].vue
```

Examples:
- `/legal/compliance` → loads `compliance.md`

The footer compliance link changes from a PDF `<a target="_blank">` to `<RouterLink to="/legal/compliance">`.

---

## File Layout

```
client/src/
  pages/
    legal/
      [slug].vue                  ← dynamic page (one component for all docs)
  components/
    legal/
      LegalSidebar.vue            ← sticky TOC sidebar
  legal/
    cs/
      compliance.md               ← Czech compliance doc
    en/
      compliance.md               ← English compliance doc
```

PDFs in `client/public/compliance/` can be removed once Markdown sources are verified.

---

## Data Flow

1. `[slug].vue` reads `route.params.slug` and `locale` from `useI18n()`
2. `import.meta.glob('../../legal/**/*.md', { query: '?raw', import: 'default' })` pre-bundles all `.md` files at build time; each is lazy-loaded on demand
3. Key construction: `` `../../legal/${locale}/${slug}.md` ``
4. Fallback: if the locale-specific file is missing, load `../../legal/en/${slug}.md`
5. If neither exists, show a "document not found" state
6. `marked` renders the raw Markdown string → HTML
7. A custom `marked` renderer adds `id` attributes to `h2`/`h3` headings (slugified from heading text)
8. Rendered HTML is passed as a prop to `LegalSidebar.vue` and injected via `v-html` in `<article>`
9. Locale change triggers a `watch` reload — same pattern as Wuilb

---

## LegalSidebar Component

**Input:** rendered HTML string (passed as prop)

**Behaviour:**
- Parses `h2` and `h3` elements from the HTML string using `DOMParser`
- Builds a flat list of `{ id: string, text: string, level: 2 | 3 }` entries
- Renders as a sticky `<nav>` on the left side of the layout
- Active section highlighted via `IntersectionObserver` watching each heading in the article
- Hidden on mobile (shown only `lg:` and above), collapsible or scrollable if the TOC is long

**No config file needed** — TOC is derived entirely from the Markdown headings.

---

## Styling

- `@tailwindcss/typography` added to `client/package.json` devDependencies
- Article rendered with `prose` class (Tailwind Typography)
- Sidebar uses existing InSIS design tokens (`insis-blue`, `insis-gray-*`) for consistency
- Page layout: `max-w-6xl` container, sidebar left (`w-64 shrink-0`), article right (`flex-1 min-w-0`)
- Sidebar is `sticky top-8` and scrolls independently
- Mobile: sidebar hidden, full-width article

---

## New Dependencies

| Package | Type | Reason |
|---|---|---|
| `marked` | devDependency (runtime) | Markdown → HTML rendering |
| `@tailwindcss/typography` | devDependency (CSS only) | Prose styling for rendered HTML |

Both are already used in the Wuilb project with the same Vite + Vue stack.

---

## Footer Change

`AppFooter.vue` — `getComplianceLink()` function and `<a>` tag replaced with:

```vue
<RouterLink to="/legal/compliance" class="...existing classes...">
  <IconFileText ... />
  {{ t('footer.links.compliance') }}
</RouterLink>
```

No new i18n keys needed — existing `footer.links.compliance` key is reused.

---

## Error & Loading States

- **Loading:** skeleton pulse (same pattern as Wuilb — `h-8 w-1/2` + `h-4 w-full/5/6/4/6` divs)
- **Not found:** centred message with link back to home; no 404 redirect
- **Locale fallback:** silently loads English if Czech file is missing

---

## Out of Scope

- No PDF download button on the new page (PDFs removed)
- No search within the document
- No print stylesheet
- No versioning / "last updated" metadata display
- No server-side rendering considerations (SPA only)
