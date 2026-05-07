# Kreditožrouti Client Guidelines

## Architecture & Conventions
- **Vue 3 (Composition API)** with Script Setup.
- **Tailwind CSS** for layout and styling (integrated with custom `insis.css` variables).
- **Pinia** for state management.
- **Vue I18n** for translations (mandatory for all user-facing strings).
- **Lucide Icons** (via `unplugin-icons`).

## Production Readiness Checklist

### Performance Optimization (Pending)
The following assets are currently unoptimized and should be resized/minified:
- `client/public/logo/kreditozrouti.png` (5.6MB) - **CRITICAL**: Used as OG image. Should be < 300KB, 1200x630px.
- `client/public/favicon/favicon.svg` (1.5MB) - Should be minified.
- `client/public/logo/kreditozrouti-transparent-cropped.png` (900KB) - Should be optimized.

### Accessibility (A11y) Standards
- Always use `aria-label` for icon-only buttons.
- Decorative icons must have `aria-hidden="true"`.
- Interactive elements (rows, headers) must have `role="button"`, `tabindex="0"`, and keyboard event handlers (`keydown.enter`, `keydown.space`).
- Use `aria-expanded` for togglable content.
- Ensure proper focus styles (using `focus-visible`).

### SEO
- Meta tags are managed in `client/index.html`.
- JSON-LD structured data (WebApplication, Organization, BreadcrumbList) is present in `client/index.html`.
- Sitemap and robots.txt are in `client/public/`.

## Common Recipes
See `.claude/COMMANDS.md` for step-by-step feature implementation guides.
