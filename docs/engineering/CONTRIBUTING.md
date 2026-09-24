# Contributing

1. Create a branch from `develop` and follow [local setup](SETUP.md).
2. Make the change within the package boundaries in [monorepo architecture](../architecture/MONOREPO.md).
3. Run the relevant lint, type, and build checks. Apply `make format` where needed.
4. Update the affected docs and package `AGENTS.md` when their descriptions change.
5. Commit with a conventional prefix such as `feat:`, `fix:`, `docs:`, `refactor:`, or `chore:`. Open a PR against `develop`.

Use TypeScript strict types, Vue 3 Composition API with `<script setup>`, and plain namespace objects for API controllers. Browser code imports shared DTOs from `@kreditozrouti/types` and browser-safe logic from `@kreditozrouti/core`. Package `AGENTS.md` files give local invariants and source layout.

The published student guide lives in `web/src/pages/docs/en/` and `web/src/pages/docs/cs/`. Keep both languages aligned when changing a user-facing flow. The developer [docs index](../README.md) points to technical guides.
