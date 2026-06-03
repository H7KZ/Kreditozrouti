# Scraper — HTML Extraction

All InSIS pages are server-rendered HTML. The scraper uses **Cheerio** (a jQuery-like HTML parser) to extract structured
data. This document describes how each extraction service works, which CSS selectors and patterns it relies on, and the
edge cases it handles.

---

## ExtractInSISCatalogService

**File:** `scraper/src/Services/ExtractInSISCatalogService.ts`

Handles two distinct InSIS pages.

### `extractSearchOptions(html)` → `CatalogSearchOptions`

Parses the **Extended Search** form at `https://insis.vse.cz/katalog/index.pl?jak=rozsirene`.

**Faculty extraction:**

```
selector: td#fakulty input[name="fakulta"]
  value attr → faculty numeric ID
  id attr    → faculty identifier (e.g. "FIS")
  nextSibling text → faculty display name
```

**Period extraction:**

```
selector: input[name="obdobi_fak"]
  value attr → faculty-period ID (used in search form POST)
  closest div id → identifier string
  parent siblings input[name="obdobi"] → year-level period ID
  nextSibling text → period label (e.g. "ZS 2024/2025")
  → extractSemester() + extractYear() parse label into typed values
```

### `extractCourses(html)` → `CatalogCourse[]`

Parses a **catalog results** page after submitting the search form. Returns `{ url: string; ident: string }[]`.

```
selector: a[href*="syllabus.pl?predmet="]
  href attr → course syllabus URL
    → relative URLs prefixed with catalogUrl
    → strips query-string fragments after ";" (session tokens)
    → deduplicated via Set (on URL)
  anchor text → first whitespace-delimited token → course ident (e.g. "4IZ210")
    → entries with empty ident are skipped
```

---

## ExtractInSISCourseService

**File:** `scraper/src/Services/ExtractInSISCourseService.ts`

The most complex extractor. Parses a full course **syllabus page** into a `ScraperInSISCourse` object. All private
methods are called from `extract(html, url)`.

### Pre-processing

```typescript
sanitizeBodyHtml($)
// Replaces all &nbsp; entities in body innerHTML with regular spaces
// before Cheerio parses text, preventing spurious nbsp in extracted strings
```

### ID Resolution (`resolveId`)

Priority order:

1. `<input name="predmet" value="...">` (always present in InSIS forms)
2. URL regex `/[?&;]predmet=(\d+)/`
3. Throws if neither found

### Basic Info (`extractBasicInfo`)

Uses `getRowValueCaseInsensitive($, label)` to find the sibling `<td>` after a label cell:

| Field                | Czech label                       |
|----------------------|-----------------------------------|
| `ident`              | `Kód předmětu:`                   |
| `title_cs`           | `Název česky:`                    |
| `title_en`           | `Název anglicky:`                 |
| `title`              | `Název v jazyce výuky:`           |
| `ects`               | `Počet přidělených ECTS kreditů:` |
| `mode_of_delivery`   | `Forma výuky kurzu:`              |
| `mode_of_completion` | `Forma ukončení kurzu:`           |
| `languages`          | `Jazyk výuky:`                    |

Languages are comma-split and lowercased. ECTS is extracted as the first integer token.

### Semester & Year (`extractSemesterAndYear`)

From the `Semestr:` row value (e.g. `"ZS 2024/2025 - FIS"`):

- `extractSemester()` scans for `ZS` or `LS` word-boundary match
- `extractYear()` matches `/(\d{4}\/\d{4})/` and returns the first year component

### Faculty (`extractFaculty`)

```
selector: #titulek h1
  text: "Course Title (FIS - Faculty Name)"
  regex: /\(([^)]+)\)\s*$/ → last parentheses group
  split on " - " → first token is faculty ident
```

**Schedule visibility** is determined by faculty ident + year thresholds (hardcoded). Faculties CTVS, OZS, IOM, CESP
hide timetables after certain years when they stopped publishing them publicly.

### Level & Year of Study (`extractLevelAndYear`)

From `Doporučený typ a ročník studia:`:

- Splits on `;` and then `:` to get level type and year digit
- Strips parenthetical annotations: `bakalářský (prezenční):2` → `level="bakalářský"`, `year_of_study=2`
- Fallback: scans `#titulek h1` for MBA/kurz suffix pattern

### People (`extractPeople`)

Two strategies, tried in order:

1. **Anchor-tag strategy:** finds all `<a>` tags inside the lecturers cell. Inspects the raw `nextSibling` text node for
   `"(garant)"` to classify into `guarantors` vs `lecturers`.
2. **Fallback:** `parseMultiLineCell` splits the cell on `<br>` and returns all non-empty lines.

### Syllabus Content (`extractSyllabusContent`)

Eight text fields extracted from table rows:

| Field                      | Strategy                          | Czech label                 |
|----------------------------|-----------------------------------|-----------------------------|
| `prerequisites`            | `getRowValueCaseInsensitive`      | `Omezení pro zápis:`        |
| `recommended_programmes`   | `getRowValueCaseInsensitive`      | `Doporučené doplňky kurzu:` |
| `required_work_experience` | `getRowValueCaseInsensitive`      | `Vyžadovaná praxe:`         |
| `aims_of_the_course`       | `getSectionContent` → Markdown    | `Zaměření předmětu:`        |
| `learning_outcomes`        | `getSectionContent` → Markdown    | `Výsledky učení:`           |
| `course_contents`          | `getSectionContent` → Markdown    | `Obsah předmětu:`           |
| `special_requirements`     | `getSectionContent` then fallback | `Zvláštní podmínky:`        |
| `literature_required`      | HTML split → Markdown             | `Literatura:` section       |
| `literature_recommended`   | HTML split → Markdown             | `Literatura:` section       |

**Literature splitting:** The literature cell HTML is split at the first occurrence of `/Doporu[cč]en[aá]:/i`.
Everything before is required; everything after is recommended. Each half is converted to Markdown via
`MarkdownService`. If no split marker exists, the whole cell becomes `literature_required`.

### Assessment Methods (`extractAssessmentMethods`)

Finds the row containing `Způsoby a kritéria hodnocení`, then navigates to the next `<tr>` which contains a nested
`<table>`. Each `<tbody tr>` yields one assessment method:

- Column 0 or 1: method name (whichever is non-empty)
- Last column: weight (first integer match)
- Rows containing `"celkem"` are skipped (they are totals)

### Timetable (`extractTimetable`)

Only called when `faculty.is_schedule_publicly_visible === true`.

Finds the row/element containing `Periodické rozvrhové akce`, then the next `<tr>` with a nested `<table>`. Each data
row becomes a `ScraperInSISCourseTimetableUnit` with one or more `ScraperInSISCourseTimetableSlot`s.

**Multi-line cells:** InSIS timetable cells can contain multiple values separated by `<br>` (e.g., a single unit that
runs on multiple days). `parseMultiLineCell` splits on `<br>` and zips the resulting arrays. Arrays of different lengths
use the first element as a fallback.

**Slot type detection:**

- If the day string matches `DD.MM.YYYY` → `date` slot (one-time event), `frequency='single'`
- If frequency text includes `každý` → `frequency='weekly'`
- If frequency text includes `jednoráz` OR it's a date → `frequency='single'`

**Time parsing:** Time strings like `"9:15-10:45"` are split on `-` into `time_from` and `time_to` (stored as raw
strings, not minutes — conversion to minutes happens in the API layer when persisting to MySQL).

### Study Plans on Course Page (`extractStudyPlans`)

InSIS course pages include a table of all study plans that include this course. Each row contains:

- Faculty column (present only in 5-column tables)
- Plan ident (e.g., `B-AIN1`)
- Mode of study
- Group code (e.g., `oP`, `cVM`)
- Period (HTML with `<br>` separating multiple semesters)

Group codes are parsed via `parseGroupCode()` from `InSISUtils` (see [Internals](INTERNALS.md)). Each semester from the
`<br>`-split period cell produces a separate `ScraperInSISCourseStudyPlan` entry.

### Study Load (`extractStudyLoad`)

Finds a table header containing `Způsob studia`, `studijní zátěž`, or `Studijní zátěž`, then reads each `<tr>` in the
following table. Skips rows with `"celkem"`. Returns `[{ activity, hours }]`.

### Audit Info (`extractAuditInfo`)

Scans the entire `body` text for the pattern:

```
/Poslední změnu provedl (.*?)(?: dne | )(\d{1,2}\. \d{1,2}\. \d{4})/
```

Returns `last_modified_by` (name string) and `last_modified_date` (ISO format `YYYY-MM-DD`).

---

## ExtractInSISStudyPlanService

**File:** `scraper/src/Services/ExtractInSISStudyPlanService.ts`

### `extractFaculties(html)` → `{title, url}[]`

```
selector: .vyber-fakult a.fakulta
  href → normalizeUrl() → full InSIS URL
  text → faculty title
```

### `extractNavigationUrls(html)` → `{texts, url}[]`

```
selector: span[data-sysid="prohlizeni-info"]
  closest anchor href → navigation URL (excludes "stud_plan=" links = these are leaves)
  closest tr → all td texts for period/semester filtering
```

### `extractPlanUrls(html)` → `string[]`

```
selector: span[data-sysid="prohlizeni-info"]
  closest anchor href → only if href contains "stud_plan="
  → deduplicated via Set
```

Navigation and plan URLs are distinguished solely by the presence of `stud_plan=` in the URL. This is the single
reliable signal InSIS provides.

### `extractIdentAndTitle($)` → `{ident, title}`

Reads from `Program:` or `Specializace:` row, or falls back to the breadcrumb trail.

**Ident detection regex:** `/^[A-Z0-9][A-Z0-9-]{0,19}$/`

Matches: `B-AIN1`, `N-EO1`, `DAB`, `4DS`. Does not match all-lowercase words or words starting with `-`.

If multiple candidates match, the one with the most dashes wins (longer compound codes like `B-AIN1` are preferred over
short ones like `N`).

### `extractFaculty($)` → `ScraperInSISFaculty | null`

Faculty title from `Fakulta:` row (split before the first ` (`).

Faculty ident is extracted from the `Počáteční období:` value: `"ZS 2023/2024 - FIS"` → split on `-`, last segment
validated as `[A-Z0-9]+`.

`is_schedule_publicly_visible` is always `false` from study plan pages — the catalog scraper is the authoritative source
for this flag.

### `extractCourses($)` → `ScraperInSISStudyPlanCourse[]`

Iterates every `<tr>`. Two patterns:

- **Group header row:** matches `/^([a-zA-Z][a-zA-Z0-9]*)\s+-\s+/` — sets `currentGroupCode`
- **Course row:** has class `uis-hl-table` and a `currentGroupCode` is set — extracts ident from first `<td>`, href from
  nested `<a>`

Group code → `{group, category}` via `parseGroupCode()`.

---

## MarkdownService

**File:** `scraper/src/Services/MarkdownService.ts`

Thin wrapper around the `turndown` library. Converts the inner HTML of any Cheerio element to Markdown. Used for
rich-text syllabus fields (aims, outcomes, contents, literature).

```typescript
MarkdownService.formatCheerioElementToMarkdown(element)
// element.html() → Turndown.turndown(html) → string
```

---

## HTMLUtils — Shared Helpers

**File:** `scraper/src/Utils/HTMLUtils.ts`

| Function                               | Description                                                                                  |
|----------------------------------------|----------------------------------------------------------------------------------------------|
| `cleanText(text)`                      | Normalizes whitespace, replaces ` `/`&nbsp;` with spaces, trims                              |
| `serializeValue(value)`                | Removes `\n\r\t`, collapses whitespace, trims; returns `null` for empty/null                 |
| `normalizeUrl(href)`                   | Prefixes relative URLs with `baseDomain` or `catalogUrl` as appropriate                      |
| `getRowValueCaseInsensitive($, label)` | Finds a `<td>` containing the label (case-insensitive), returns its next sibling `<td>` text |
| `getSectionContent($, headerText)`     | Finds a header row by text, reads the following `<tr>` content as Markdown                   |
| `parseMultiLineCell($, el)`            | Splits element HTML on `<br>`, returns non-empty text strings                                |
| `sanitizeBodyHtml($)`                  | Replaces all `&nbsp;` in `body.innerHTML` before Cheerio text extraction                     |

`getRowValueCaseInsensitive` is the primary workhorse for metadata extraction. InSIS label casing varies between course
pages (e.g., `"Kód předmětu:"` vs `"kód předmětu:"`), so case-insensitive matching is essential.
