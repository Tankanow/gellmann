# Agent Portability

Gellmann is an agent-portable skill distribution. The skills in `skills/` hold
the core behavior; host-specific files are adapters that make that behavior easy
to load in a given agent.

## Supported Adapters

| Host | Files | Notes |
|------|-------|-------|
| Claude Code | `.claude-plugin/plugin.json`, `commands/`, `hooks/claude-codex-hooks.json`, `hooks/` | Full plugin install with session activation, mode tracking, commands, and statusline support. |
| Codex | `.codex-plugin/plugin.json`, `hooks/claude-codex-hooks.json`, `hooks/`, `skills/` | Plugin install with the same skills plus lifecycle hooks for activation and mode tracking. |
| Grok Build | root `plugin.json`, `.grok-plugin/marketplace.json`, `skills/`, `commands/` | `grok plugin install tankanow/gellmann --trust`, then enable. Grok can auto-invoke gellmann from its coding-task skill description; `/gellmann` makes activation explicit. Grok lifecycle hooks are not used because passive hook output cannot inject instructions. |
| OpenCode | `.opencode/plugins/gellmann.mjs`, `.opencode/command/`, `hooks/`, `skills/` | Checkout install only: `{ "plugin": ["./.opencode/plugins/gellmann.mjs"] }` in `opencode.json`. Server plugin injects the ruleset each turn via `experimental.chat.system.transform` and persists `/gellmann` switches; reuses the shared instruction builder. |
| OpenClaw | `.openclaw/skills/gellmann` | Copy `.openclaw/skills/gellmann` into `~/.openclaw/skills/` (no ClawHub). Generated from `skills/`; rerun `node scripts/build-openclaw-skills.js` after changing a skill. |
| pi | `pi-extension/`, `skills/`, `hooks/` | Package extension: injects the ruleset each turn through the shared instruction builder and registers the `/gellmann` commands. |
| Hermes Agent | `plugin.yaml`, `__init__.py`, `skills/` | Native Hermes plugin: injects active mode through `pre_llm_call`, rewrites gateway `/gellmann-*` skill commands into agent prompts, registers `/gellmann` mode switching, and exposes bundled skills as `gellmann:<skill>`. |
| Gemini CLI | `gemini-extension.json`, `AGENTS.md`, `commands/`, `skills/` | Extension manifest points `contextFileName` at `AGENTS.md` for always-on rules, and reuses the existing `commands/*.toml` and `skills/`, which Gemini CLI auto-discovers. The Claude/Codex hook map is not placed at Gemini's auto-discovered `hooks/hooks.json` path. |
| Cursor | `.cursor/rules/gellmann.mdc` | Always-on project rule. |
| Windsurf | `.windsurf/rules/gellmann.md` | Project rule. |
| Cline | `.clinerules/gellmann.md` | Project rule. |
| GitHub Copilot | `.github/copilot-instructions.md` | Repository instruction file. |
| GitHub Copilot CLI | `.github/plugin/`, `AGENTS.md`, `.github/copilot-instructions.md`, `~/.copilot/copilot-instructions.md` | Plugin-supported (`copilot plugin marketplace add tankanow/gellmann` + `copilot plugin install gellmann@gellmann`). Fallback instruction mode remains: per-project from `AGENTS.md` or `.github/copilot-instructions.md`, or globally from `~/.copilot/copilot-instructions.md` (instruction-tier, no `/gellmann` levels or hooks). |
| Antigravity | `AGENTS.md` | Reads `AGENTS.md` at the repo root as always-on rules (like `.cursorrules`/`CLAUDE.md`); `.agents/rules/` also works for workspace rules. Instruction-tier. |
| CodeWhale | `AGENTS.md` | Reads `AGENTS.md` from the repo root as project instructions; also reads `CLAUDE.md` and `.claude/instructions.md` as fallbacks. Instruction-tier. |
| Swival | `.swival/skills/`, `AGENTS.md` | `swival skills add https://github.com/tankanow/gellmann` installs the five skills straight into `.swival/skills/`. Add `--global` to stage them in the library (`~/.config/swival/library`) first, then `swival skills add gellmann` (or `--global gellmann`) to activate per-project or everywhere. Also reads `AGENTS.md` from the repo root and `~/.config/swival/AGENTS.md` globally as instruction-tier fallback. |
| VS Code + Codex extension | `AGENTS.md` | The Codex extension reads `AGENTS.md` (repo root, or `~/.codex/AGENTS.md` globally). Instruction-tier; the full Codex plugin row above adds `/gellmann` levels and hooks. |
| JetBrains Junie | `AGENTS.md` | Junie reads `AGENTS.md` once you point it there in Settings → Tools → Junie → Project Settings → Guidelines Path (not automatic yet); this repo ships `AGENTS.md`, and `.junie/guidelines.md` is Junie's legacy path. Instruction-tier. |
| Amp (Sourcegraph) | `AGENTS.md` | Amp reads `AGENTS.md` from the working directory and parent directories up to `$HOME` (plus global config like `~/.config/amp/AGENTS.md`); falls back to `AGENT.md`/`CLAUDE.md`. Instruction-tier. |
| Jules (Google) | `AGENTS.md` | Jules automatically reads `AGENTS.md` from the repository root. Instruction-tier. |
| Kiro | `.kiro/steering/gellmann.md` | Steering rule; copy globally or into a project. |
| Qoder | `.qoder/rules/gellmann.md`, `.qoder-plugin/plugin.json`, `hooks/qoder-hooks.json`, `skills/`, `AGENTS.md` | Qoder auto-loads `AGENTS.md` as always-on context; `.qoder/rules/gellmann.md` provides per-project rules; the plugin manifest points at `skills/` for the five gellmann skills (invoked as `/gellmann`, `/gellmann-review`, etc. via the Skill system). Full plugin-tier: `hooks/qoder-hooks.json` template registers `UserPromptSubmit` (mode activation + ruleset injection) and `PreToolUse` with `task|Task` matcher (subagent injection). Instruction-tier works from repo root with zero setup via `AGENTS.md`. |
| Zed | `AGENTS.md` | Auto-includes `AGENTS.md` from the worktree root as one of its default rule files for the Agent Panel. Instruction-tier. |
| Generic agents | `AGENTS.md` or `skills/*/SKILL.md` | Copy the compact rule file or load the skill files directly. |

## Adapter Rule

Keep adapters thin. When a host supports skills or hooks, point it at the
existing `skills/` and `hooks/` files. When a host only supports project
instructions, keep its copied rule text aligned with `AGENTS.md`.

## Portable Behavior

- `skills/gellmann/SKILL.md`: reads AI output as a domain expert would, marks every load-bearing claim, and verifies through the active persona
- `skills/gellmann-work/SKILL.md`: work persona — finds the teammates and internal record who own the domain, drafts the questions
- `skills/gellmann-solo/SKILL.md`: solo persona — finds canonical primary sources, cites or flags could-not-verify
- `skills/gellmann-review/SKILL.md`: one-shot expert review of an AI output, one line per finding
- `skills/gellmann-help/SKILL.md`: quick reference card
- `AGENTS.md`: compact always-on instruction set for agents without skill support

## Note

Gellmann is a structural port of [ponytail](https://github.com/dietrichgebert/ponytail); most of the host install paths above (plugin manifests, rule-file locations, hook wiring) were carried over from ponytail's adapters rather than independently designed for this project.
