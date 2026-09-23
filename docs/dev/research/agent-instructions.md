# Agent instruction files in this repository

Researched 2026-09-24 against official Claude Code and Codex documentation. The handoff that prompted this work describes another repository, so these findings use this repository's actual files.

## Loading rules

- Claude Code accepts project instructions at `CLAUDE.md` or `.claude/CLAUDE.md` in the repository root. It loads ancestor files at launch and subdirectory `CLAUDE.md` files when it reads files there. [Claude Code memory](https://code.claude.com/docs/en/memory#choose-where-to-put-claudemd-files), [loading order](https://code.claude.com/docs/en/memory#how-claudemd-files-load)
- A Claude Code file imports another file with `@path/to/file`. Relative paths resolve from the importing file, and imports enter context with that file. Thus root `.claude/CLAUDE.md` can contain `@../AGENTS.md`; a package's `CLAUDE.md` can contain `@AGENTS.md` for its sibling file. [Claude Code imports](https://code.claude.com/docs/en/memory#import-additional-files)
- Claude Code v2.1.277 or later can read `AGENTS.md` directly. By default, a project `CLAUDE.md` or `CLAUDE.local.md` in or above the working directory takes precedence over direct `AGENTS.md` loading. An explicit import still loads the referenced `AGENTS.md`. Older or differently configured Claude Code sessions may need that import. [Claude Code AGENTS.md behavior](https://code.claude.com/docs/en/memory#agentsmd)
- Codex reads `AGENTS.md` from the repository root down to its current working directory once per run. It takes one instruction file per directory and has a 32 KiB default combined size limit. A Codex run started at repository root should not assume package instructions loaded merely because it later reads package files. [Codex AGENTS.md guide](https://learn.chatgpt.com/docs/agent-configuration/agents-md#how-codex-discovers-guidance)

## Recommended mapping here

Before this cleanup, root `AGENTS.md` was untracked and package-specific guidance lived only in `api/CLAUDE.md`, `web/CLAUDE.md`, `scraper/CLAUDE.md`, `mcp/CLAUDE.md`, `scripts/CLAUDE.md`, and `deployment/CLAUDE.md`. The root claim that each package had an `AGENTS.md` was inaccurate at that point.

Keep `AGENTS.md` as the single editable source at each level. Place `@../AGENTS.md` in root `.claude/CLAUDE.md` and `@AGENTS.md` in each package `CLAUDE.md` after moving its shared instructions to a sibling `AGENTS.md`. This is a supported import pattern, keeps Claude's root and package loading intact, and avoids maintaining two copies. Anthropic recommends the import over a symlink for Windows clones. [Claude Code sharing guidance](https://code.claude.com/docs/en/memory#share-one-file-with-other-coding-tools), [monorepo layering](https://code.claude.com/docs/en/large-codebases#layer-claudemd-files)

Keep instruction files short: repository-wide rules at root, package-specific rules beside the package, and detailed explanations in linked docs. Anthropic targets under 200 lines per `CLAUDE.md` file and says imports still consume context, so a pointer does not make a long imported file cheap. [Claude Code effective instructions](https://code.claude.com/docs/en/memory#write-effective-instructions), [Claude Code best practices](https://code.claude.com/docs/en/best-practices#write-an-effective-claudemd)

Verify Claude's loaded files with `/context`. For Codex, start in the target package or explicitly read that package's `AGENTS.md` when working from root. [Claude Code memory](https://code.claude.com/docs/en/memory#set-up-a-project-claudemd), [Codex verification](https://learn.chatgpt.com/docs/agent-configuration/agents-md#verify-your-setup)
