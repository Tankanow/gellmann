---
name: gellmann-help
description: "Quick reference for gellmann's modes, skills, and commands. One-shot display."
homepage: https://github.com/tankanow/gellmann
license: MIT
---

# Gellmann Help

Display this card when invoked. One-shot: do NOT change mode, write flag
files, or persist anything.

## Modes

| Mode | Trigger | Where the truth lives |
|------|---------|-----------------------|
| **work** | `/gellmann work` | With the team: CODEOWNERS, git blame, ADRs, wikis, Slack, Confluence, tickets. Ends with who to ask. |
| **solo** | `/gellmann solo` | In canonical primary sources: spec, RFC, official docs for the exact version, upstream source, paper. |
| **review** | `/gellmann-review` | Session-only. The lens is replaced by a pointer to the review skill until you run `/gellmann work` or `/gellmann solo`. |

Auto-detected at session start: work if the repo has a CODEOWNERS file or two or more commit authors, else solo. Mode sticks until changed or session end.

## Skills

| Skill | Trigger | What it does |
|-------|---------|--------------|
| **gellmann** | `/gellmann [work\|solo\|off]` | The lens itself. No argument reports the current mode. |
| **gellmann-work** | `/gellmann-work [topic]` | Find the owners and the internal record. Also switches to work mode. |
| **gellmann-solo** | `/gellmann-solo [topic]` | Find canonical primary sources. Also switches to solo mode. |
| **gellmann-review** | `/gellmann-review [target]` | Expert review of an output: `¶3: fact: <claim>. <what settles it>.` |
| **gellmann-help** | `/gellmann-help` | This card. |

Codex uses `@gellmann`, `@gellmann-review`, and so on; Claude Code, OpenCode, and Gemini use the slash forms.

## Deactivate

Say "stop gellmann" or run `/gellmann off`. Resume with `/gellmann`. "normal mode" is deliberately not a switch: it belongs to ponytail and caveman. After `/gellmann-review`, `/gellmann work` or `/gellmann solo` restores the lens.

## Configure the default

**Environment variable** (highest priority):
```bash
export GELLMANN_DEFAULT_MODE=work
```

**Config file** (`~/.config/gellmann/config.json`, Windows: `%APPDATA%\gellmann\config.json`):
```json
{ "defaultMode": "solo" }
```

`/gellmann default work|solo|off` writes that file for you. Set `"off"` to disable auto-activation. Resolution: env var, then config file, then auto-detect, then solo.

## Update

Enable auto-update once: `/plugin`, Marketplaces, gellmann, Enable auto-update. Manual: `/plugin marketplace update gellmann` then `/reload-plugins`.

## More

https://github.com/tankanow/gellmann
