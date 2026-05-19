# Contributing

## Workflow

1. **Fork** the repository on GitHub
2. **Create a feature branch** from `develop`:
   ```bash
   git checkout -b feat/your-feature-name
   ```
3. **Set up** your dev environment: [SETUP.md](SETUP.md)
4. **Make your changes** — follow the conventions below
5. **Lint and format:**
   ```bash
   make lint
   make format
   ```
6. **Commit** using conventional commits (see below)
7. **Open a PR** against `develop` — not `main`

---

## Commit Conventions

We follow [Conventional Commits](https://www.conventionalcommits.org/):

| Prefix | When to use |
|--------|-------------|
| `feat:` | New feature |
| `fix:` | Bug fix |
| `docs:` | Documentation only |
| `refactor:` | Code restructuring, no behavior change |
| `chore:` | Maintenance (deps, config, tooling) |
| `style:` | Formatting, whitespace (no logic change) |

Example: `feat: add campus conflict detection to timetable store`

---

## Code Style

- **TypeScript strict mode** — no `any`. If you need to escape the type system, use `unknown` + a type guard.
- **Vue 3 Composition API** with `<script setup>` — no Options API.
- **API controllers** are plain namespace objects, not classes: `export const FooController = { async handleRequest(...) {} }`
- **Zod schemas** co-located with their controller file, not in a central `Validations/` folder.
- **Imports** in the client: use `@api/contracts` for API types, never `@api/Database/types`.
- **Store deps**: `timetable.store` must never import `courses.store` — see [docs/architecture/MONOREPO.md](../architecture/MONOREPO.md) and `client/CLAUDE.md` for the reason.

---

## Documentation

When your change affects documented behavior:
- Find the relevant doc in `docs/` (see the table in `CLAUDE.md` or `GEMINI.md`)
- Update it in the same PR as your code change
- If it's new behavior with no existing doc entry, add a section or create a new file

---

## Branch Strategy

| Branch | Purpose |
|--------|---------|
| `main` | Production — tagged releases only |
| `develop` | Integration branch — all feature PRs target this |
| `feat/*` | Feature development |
| `fix/*` | Bug fixes |
| `chore/*` | Maintenance |

---

## PR Checklist

- [ ] `make lint` passes
- [ ] `make format` applied
- [ ] Docs updated for any changed behavior
- [ ] PR targets `develop`, not `main`
- [ ] PR description explains what changed and why
