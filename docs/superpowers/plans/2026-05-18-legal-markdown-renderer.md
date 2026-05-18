# Legal Markdown Renderer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace PDF compliance documents with locale-aware Markdown files rendered as in-app pages at `/legal/[slug]`, with a sticky auto-generated TOC sidebar.

**Architecture:** A single dynamic page component loads the correct `.md` file based on the URL slug and current locale using `import.meta.glob`. A `LegalSidebar` component parses headings from the rendered HTML via `DOMParser` and highlights the active section via `IntersectionObserver`. The footer link becomes a `RouterLink`.

**Tech Stack:** Vue 3 + `unplugin-vue-router` (file-based routing), `marked` v17 (Markdown → HTML), `@tailwindcss/typography` (prose styles), Tailwind CSS v4 (`@plugin` directive in CSS).

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `client/src/legal/cs/compliance.md` | Czech compliance document content |
| Create | `client/src/legal/en/compliance.md` | English compliance document content |
| Create | `client/src/pages/legal/[slug].vue` | Dynamic legal doc page |
| Create | `client/src/components/legal/LegalSidebar.vue` | Sticky TOC sidebar |
| Modify | `client/src/index.css` | Add `@plugin "@tailwindcss/typography"` |
| Modify | `client/package.json` | Add `marked` + `@tailwindcss/typography` deps |
| Modify | `client/src/components/common/AppFooter.vue` | Replace PDF `<a>` with `<RouterLink>` |
| Delete | `client/public/compliance/kreditozrouti-compliance-cs.pdf` | Replaced by markdown |
| Delete | `client/public/compliance/kreditozrouti-compliance-en.pdf` | Replaced by markdown |

---

## Task 1: Install dependencies

**Files:**
- Modify: `client/package.json`
- Modify: `client/src/index.css`

- [ ] **Step 1: Add packages**

Run from `client/`:
```bash
pnpm add -D marked @tailwindcss/typography
```

Expected output: packages added, `pnpm-lock.yaml` updated.

- [ ] **Step 2: Enable typography plugin in CSS**

In `client/src/index.css`, add after the existing `@import` lines:
```css
@import 'tailwindcss';
@import 'tw-animate-css';
@import './styles/insis.css';
@plugin "@tailwindcss/typography";
```

(Add `@plugin "@tailwindcss/typography";` as the 4th line — Tailwind v4 loads plugins via CSS, not `vite.config.ts`.)

- [ ] **Step 3: Commit**

```bash
cd client
git add package.json pnpm-lock.yaml src/index.css
git commit -m "chore(client): add marked and tailwindcss/typography"
```

---

## Task 2: Create markdown content files

**Files:**
- Create: `client/src/legal/cs/compliance.md`
- Create: `client/src/legal/en/compliance.md`

These files replace the PDFs. Convert the PDF content to Markdown — the headings structure drives the sidebar TOC, so use `##` for top-level sections and `###` for subsections.

- [ ] **Step 1: Create Czech compliance markdown**

Create `client/src/legal/cs/compliance.md` with the Czech PDF content converted to Markdown. Minimum required structure (replace body with real content from the PDF):

```markdown
# Podmínky užívání — Kreditožrouti

## 1. Úvodní ustanovení

Obsah první sekce...

## 2. Zpracování osobních údajů

### 2.1 Správce údajů

Obsah podsekce...

### 2.2 Účel zpracování

Obsah podsekce...

## 3. Cookies

Obsah sekce...

## 4. Závěrečná ustanovení

Obsah sekce...
```

- [ ] **Step 2: Create English compliance markdown**

Create `client/src/legal/en/compliance.md` with the English PDF content converted to Markdown, same heading structure as the Czech version.

```markdown
# Terms of Use — Kreditožrouti

## 1. Introductory Provisions

Content of first section...

## 2. Processing of Personal Data

### 2.1 Data Controller

Content of subsection...

### 2.2 Purpose of Processing

Content of subsection...

## 3. Cookies

Content of section...

## 4. Final Provisions

Content of section...
```

- [ ] **Step 3: Commit**

```bash
git add client/src/legal/
git commit -m "docs(legal): add compliance markdown source files (cs + en)"
```

---

## Task 3: Create LegalSidebar component

**Files:**
- Create: `client/src/components/legal/LegalSidebar.vue`

- [ ] **Step 1: Create the component**

Create `client/src/components/legal/LegalSidebar.vue`:

```vue
<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'

const props = defineProps<{
  html: string
}>()

interface TocEntry {
  id: string
  text: string
  level: 2 | 3
}

const activeId = ref('')

const entries = computed<TocEntry[]>(() => {
  if (!props.html) return []
  const parser = new DOMParser()
  const doc = parser.parseFromString(props.html, 'text/html')
  const headings = doc.querySelectorAll('h2, h3')
  return Array.from(headings).map((el) => ({
    id: el.id,
    text: el.textContent ?? '',
    level: parseInt(el.tagName[1]) as 2 | 3,
  }))
})

let observer: IntersectionObserver | null = null

function setupObserver() {
  observer?.disconnect()
  observer = new IntersectionObserver(
    (observerEntries) => {
      for (const entry of observerEntries) {
        if (entry.isIntersecting) {
          activeId.value = entry.target.id
          break
        }
      }
    },
    { rootMargin: '0px 0px -80% 0px', threshold: 0 },
  )
  for (const { id } of entries.value) {
    const el = document.getElementById(id)
    if (el) observer.observe(el)
  }
}

watch(
  () => props.html,
  () => {
    // Wait one tick for v-html to flush to DOM
    setTimeout(setupObserver, 50)
  },
  { immediate: true },
)

onUnmounted(() => observer?.disconnect())
</script>

<template>
  <nav class="w-56 shrink-0">
    <div class="sticky top-8 max-h-[calc(100vh-4rem)] overflow-y-auto">
      <p class="mb-3 text-xs font-semibold uppercase tracking-wider text-insis-gray-500">
        On this page
      </p>
      <ul class="space-y-1">
        <li v-for="entry in entries" :key="entry.id">
          <a
            :href="`#${entry.id}`"
            :class="[
              'block truncate py-0.5 text-sm transition-colors hover:text-insis-blue',
              entry.level === 3 ? 'pl-3' : '',
              activeId === entry.id
                ? 'font-medium text-insis-blue'
                : 'text-insis-gray-600',
            ]"
          >
            {{ entry.text }}
          </a>
        </li>
      </ul>
    </div>
  </nav>
</template>
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/legal/LegalSidebar.vue
git commit -m "feat(client): add LegalSidebar component with IntersectionObserver TOC"
```

---

## Task 4: Create the dynamic legal page

**Files:**
- Create: `client/src/pages/legal/[slug].vue`

`unplugin-vue-router` auto-generates the route `/legal/:slug` from this file path — no manual route config needed.

- [ ] **Step 1: Create the page**

Create `client/src/pages/legal/[slug].vue`:

```vue
<script setup lang="ts">
import LegalSidebar from '@client/components/legal/LegalSidebar.vue'
import { marked } from 'marked'
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink, useRoute } from 'vue-router'

const route = useRoute()
const { locale } = useI18n()

// import.meta.glob bundles all .md files at build time; each loads lazily on demand
const allDocs = import.meta.glob('../../legal/**/*.md', {
  query: '?raw',
  import: 'default',
}) as Record<string, () => Promise<string>>

// Custom renderer: add id attributes to h2/h3 for sidebar anchor links
marked.use({
  renderer: {
    heading(token) {
      const id = token.text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
      return `<h${token.depth} id="${id}">${token.text}</h${token.depth}>\n`
    },
  },
})

const renderedHtml = ref('')
const loading = ref(true)
const notFound = ref(false)

async function loadDoc() {
  loading.value = true
  notFound.value = false
  renderedHtml.value = ''

  const slug = route.params.slug as string
  const localeKey = `../../legal/${locale.value}/${slug}.md`
  const fallbackKey = `../../legal/en/${slug}.md`
  const loader = allDocs[localeKey] ?? allDocs[fallbackKey]

  if (!loader) {
    notFound.value = true
    loading.value = false
    return
  }

  try {
    const raw = await loader()
    renderedHtml.value = await marked(raw)
  } catch {
    notFound.value = true
  } finally {
    loading.value = false
  }
}

watch([() => route.params.slug, locale], loadDoc, { immediate: true })
</script>

<template>
  <div class="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
    <!-- Loading skeleton -->
    <div v-if="loading" class="animate-pulse space-y-4 pt-2">
      <div class="h-8 w-1/2 rounded-lg bg-insis-gray-200" />
      <div class="h-4 w-full rounded bg-insis-gray-200" />
      <div class="h-4 w-5/6 rounded bg-insis-gray-200" />
      <div class="h-4 w-4/6 rounded bg-insis-gray-200" />
      <div class="mt-6 h-5 w-1/3 rounded-lg bg-insis-gray-200" />
      <div class="h-4 w-full rounded bg-insis-gray-200" />
      <div class="h-4 w-3/4 rounded bg-insis-gray-200" />
    </div>

    <!-- Not found -->
    <div v-else-if="notFound" class="py-20 text-center">
      <h1 class="text-2xl font-bold text-insis-gray-800">Document not found</h1>
      <p class="mt-2 text-insis-gray-600">
        The requested document does not exist.
      </p>
      <RouterLink
        to="/"
        class="mt-6 inline-block text-sm text-insis-blue hover:underline"
      >
        ← Back to home
      </RouterLink>
    </div>

    <!-- Content -->
    <div v-else class="flex gap-10">
      <LegalSidebar :html="renderedHtml" class="hidden lg:block" />
      <article class="prose prose-slate min-w-0 max-w-none flex-1" v-html="renderedHtml" />
    </div>
  </div>
</template>
```

- [ ] **Step 2: Verify route is generated**

Run the dev server and open `http://localhost:45173/legal/compliance`. The page should load (with placeholder content if Task 2 used placeholder markdown).

```bash
cd client && pnpm run dev
```

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/legal/
git commit -m "feat(client): add dynamic /legal/[slug] page with markdown rendering"
```

---

## Task 5: Update AppFooter

**Files:**
- Modify: `client/src/components/common/AppFooter.vue`

- [ ] **Step 1: Replace the compliance link**

In `client/src/components/common/AppFooter.vue`:

Remove the `getComplianceLink` function and the `<a>` tag that uses it. Replace with a `RouterLink`:

```vue
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import IconExternalLink from '~icons/lucide/external-link'
import IconFileText from '~icons/lucide/file-text'
import IconFingerPrintPattern from '~icons/lucide/fingerprint-pattern'
import IconGithub from '~icons/lucide/github'
import IconMail from '~icons/lucide/mail'
import { RouterLink } from 'vue-router'

const { t } = useI18n()

const currentYear = new Date().getFullYear()
const appVersion = APP_VERSION
</script>
```

Replace the compliance `<li>` in the template:

```vue
<li>
  <RouterLink
    to="/legal/compliance"
    class="flex items-center text-left gap-2 text-insis-gray-700 transition-colors hover:text-insis-blue"
  >
    <IconFileText class="h-4 w-4 shrink-0" aria-hidden="true" />
    {{ t('footer.links.compliance') }}
  </RouterLink>
</li>
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/common/AppFooter.vue
git commit -m "feat(client): replace compliance PDF link with in-app RouterLink"
```

---

## Task 6: Remove PDF files

**Files:**
- Delete: `client/public/compliance/kreditozrouti-compliance-cs.pdf`
- Delete: `client/public/compliance/kreditozrouti-compliance-en.pdf`

- [ ] **Step 1: Delete PDFs**

```bash
rm client/public/compliance/kreditozrouti-compliance-cs.pdf
rm client/public/compliance/kreditozrouti-compliance-en.pdf
rmdir client/public/compliance
```

- [ ] **Step 2: Verify nothing else references the PDF paths**

```bash
grep -r "compliance.*\.pdf" client/src/
```

Expected: no output (zero matches).

- [ ] **Step 3: Commit**

```bash
git add -u client/public/compliance/
git commit -m "chore(client): remove compliance PDFs replaced by markdown"
```

---

## Task 7: Smoke test

- [ ] **Step 1: Start dev server**

```bash
cd client && pnpm run dev
```

- [ ] **Step 2: Verify compliance page loads**

Open `http://localhost:45173/legal/compliance`. Confirm:
- Content renders (no blank page, no "not found")
- Sidebar appears on wide viewport with section links
- Clicking a sidebar link scrolls to the correct heading
- Active link highlights as you scroll

- [ ] **Step 3: Verify locale switching**

Switch language (CS ↔ EN) using the language switcher in the app. Confirm the page reloads with the correct language document.

- [ ] **Step 4: Verify footer link**

Open the homepage or courses page, scroll to footer. Confirm the compliance link navigates in-app (no new tab, no PDF download).

- [ ] **Step 5: Verify unknown slug shows not-found state**

Open `http://localhost:45173/legal/nonexistent`. Confirm the "Document not found" state renders with a back-to-home link.

- [ ] **Step 6: Run type check and linter**

```bash
cd client && pnpm run type-check && pnpm run lint
```

Expected: no errors.

- [ ] **Step 7: Final commit if any lint fixes were auto-applied**

```bash
git add -A && git commit -m "style(client): lint fixes after legal markdown feature"
```
