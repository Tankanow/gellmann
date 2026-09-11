<p align="center"><img src="assets/logo.svg" width="360" alt="Gellmann, the expert reader"></p>

<h1 align="center">Gellmann</h1>

<p align="center"><em>You turn the page and forget what you know. Not here.</em></p>

<p align="center">
  <img src="https://img.shields.io/github/v/release/tankanow/gellmann?style=flat-square&color=1f3a5f&label=release" alt="Release">
  <img src="https://img.shields.io/badge/works%20with-20%20agents-1f3a5f?style=flat-square" alt="Works with 20 agents">
  <img src="https://img.shields.io/badge/license-MIT-1f3a5f?style=flat-square" alt="MIT license">
</p>

---

Michael Crichton, 2002:

> You open the newspaper to an article on some subject you know well. [...] You read the article and see the journalist has absolutely no understanding of either the facts or the issues. Often, the article is so wrong it actually presents the story backward—reversing cause and effect. I call these the "wet streets cause rain" stories. [...] You turn the page, and forget what you know.

He called it the Gell-Mann Amnesia effect. AI output does it to you with higher stakes: in your own field you catch the agent instantly; one field over, the same confident prose reads as true.

Gellmann puts the expert reader inside the agent. Before it presents anything, it reads its own output the way the person who owns that domain would, marks what rests on nothing, and goes to find out: from your teammates and internal record (**work**), or from canonical primary sources (**solo**).

## Before / after

You ask for an API migration note. Your agent writes "return 301; clients will retry the POST at the new URL." It reads fine.

With gellmann:

```
Verify: clients retry POST after a 301 — RFC 9110 §15.4.2 lets the client change POST to GET; §15.4.9 (308) forbids it. Use 308.
```

More in [examples/](examples/).

## How it works

Before presenting any output that makes a claim, the agent runs the reflex:

```
1. Name the domain, and your footing in it.   Fluency is not footing.
2. Mark every load-bearing claim.             proven / sourced / hypothesis / assumption / unknown
3. Hunt "wet streets cause rain".             reversed causality, version facts stated as timeless, plausible defaults
4. Separate mechanism from framing.           code does X ≠ X is a bug, the cause, or best practice
5. Go find out.                               work: who owns this?   solo: where is it written down?
6. Present with the ledger visible.           Verify: <claim> — <who or what settles it>
```

Nothing is hedged that was directly observed. Nothing is verified that the agent could verify itself with a tool it has. The work ships either way; the ledger rides along.

### Modes

| Mode | Where the truth lives |
|---|---|
| **work** | With the people and the record. CODEOWNERS, git blame, ADRs, sibling repos, wikis, Slack, Confluence, tickets (read-only, via the host's tools). Ends with who to ask and what to ask. Never posts on your behalf. |
| **solo** | In canonical primary sources. The spec, the RFC, the official docs for the exact version, the upstream source, the paper. Secondary sources only as published critics of a named primary. Every claim gets a citation you can open or a "could not verify". |

Auto-detected at session start: `work` if the repo has a `CODEOWNERS` file or two or more commit authors, else `solo`. See [docs/where-truth-lives.md](docs/where-truth-lives.md) for what counts as a primary source, by domain.

## Install

Hermes, Grok Build, Devin, Qoder, Swival, and Antigravity install paths are carried over from ponytail's adapters and have not yet been exercised against those hosts by this project; the Claude Code, Codex, OpenCode, and pi adapters run their real code in tests; the Copilot CLI and Gemini CLI manifests are asserted but their hosts were not exercised.

The Claude Code and Codex plugins run two tiny Node.js lifecycle hooks, so `node` needs to be on your PATH (note for Nix/nvm users: it must be on the non-interactive shell's PATH). If it isn't, the skills still work, the always-on activation just stays quiet instead of erroring on every prompt.

### Claude Code

```
/plugin marketplace add tankanow/gellmann
```
```
/plugin install gellmann@gellmann
```
(You have to send two separate prompts for the install to work)

Same steps in the Claude Code Desktop app's Code tab: type the two `/plugin` commands above into the prompt box, or click the **+** button next to it, choose **Plugins** → **Add plugin** to browse your configured marketplaces, and manage marketplaces from **Customize** in the sidebar.

### Codex

```bash
codex plugin marketplace add tankanow/gellmann
codex plugin add gellmann@gellmann
```

Run `codex` and open `/hooks`, review and trust its two lifecycle hooks, and start a new thread.

This same install also covers the Codex desktop app: restart the app after installing and it picks up the plugin.

### GitHub Copilot CLI

```bash
copilot plugin marketplace add tankanow/gellmann
copilot plugin install gellmann@gellmann
```

In an interactive Copilot CLI session, use the slash equivalents:

```
/plugin marketplace add tankanow/gellmann
/plugin install gellmann@gellmann
```

Copilot CLI namespaces plugin commands by plugin name. For example:

```text
/gellmann:gellmann work
/gellmann:gellmann-review
```

### Pi agent harness

```
pi install git:github.com/tankanow/gellmann
```

### OpenCode

Add to `opencode.json`, pointing at a checkout (the plugin reuses `hooks/` and `skills/`):

```json
{ "plugin": ["./.opencode/plugins/gellmann.mjs"] }
```

Injects the ruleset every turn at the active mode; adds the `/gellmann` commands (see [Commands](#commands)). OpenCode also auto-loads this repo's `AGENTS.md`, so the rules hold even without the plugin. The plugin adds the `work`/`solo`/`off` modes.

The `./` path resolves against your project's `opencode.json`; to share one checkout across projects, point it at the absolute path of the `.mjs` instead (it finds its `hooks/` and `skills/` relative to its own file).

### Gemini CLI

```bash
gemini extensions install https://github.com/tankanow/gellmann
```

Loads the ruleset as always-on context every session and registers the `/gellmann` commands; the `skills/` ship too, activated when a task needs them.
The Gemini adapter intentionally does not ship a root `hooks/hooks.json`: Gemini auto-loads that path, while Gellmann's lifecycle hooks use Claude/Codex event names.

### Qoder

Qoder auto-loads `AGENTS.md` from the repo root as always-on context, so running gellmann from a checkout works with zero setup. For per-project rules, copy [`.qoder/rules/gellmann.md`](.qoder/rules/gellmann.md) into your project's `.qoder/rules/`. The five gellmann skills (`/gellmann`, `/gellmann-work`, `/gellmann-solo`, `/gellmann-review`, `/gellmann-help`) are available via Qoder's Skill system; the plugin manifest at [`.qoder-plugin/plugin.json`](.qoder-plugin/plugin.json) points at the `skills/` directory.

For full plugin-tier support (automatic mode activation + ruleset injection on every prompt), add the hooks from [`hooks/qoder-hooks.json`](hooks/qoder-hooks.json) to your `.qoder/settings.json`. Replace `GELLMANN_DIR` with the path to your gellmann checkout. Qoder's `UserPromptSubmit` hook activates the default mode on first prompt and injects the ruleset every turn; `PreToolUse` with `task|Task` matcher injects the ruleset into subagents. Mode switches (`/gellmann work|solo|off`) work automatically.

### Antigravity CLI

Google has announced Antigravity CLI (the `agy` binary) as the successor to Gemini CLI; both `gemini extensions install` and `agy plugin install` are reported to work with this extension manifest. Neither path has been exercised by this project.

```bash
agy plugin install https://github.com/tankanow/gellmann
```

It reuses this repo's `gemini-extension.json`. One difference: Antigravity converts the `/gellmann` commands into skills, so you type them into the chat (e.g. `/gellmann-review` as a message) instead of picking them from a slash menu. To run it as an always-on rule instead, drop the ruleset into `.agents/rules/`.

### Hermes Agent

```bash
hermes plugins install tankanow/gellmann --enable
```

Restart Hermes after installing. The plugin injects the active Gellmann mode before each LLM turn, registers the bundled skills as `gellmann:<skill>`, and adds `/gellmann`, `/gellmann-work`, `/gellmann-solo`, `/gellmann-review`, and `/gellmann-help`. In shared gateways, restrict `/gellmann` to trusted users with Hermes slash-command access controls; runtime mode is process-local.

### CodeWhale

Reads `AGENTS.md` from the project root, zero setup. Copy [`AGENTS.md`](AGENTS.md) to your project, or run `codewhale` from a checkout of this repo. That's it.

### Swival

Stage the collection in your library first, then add the skills you want:

```bash
swival skills add --global https://github.com/tankanow/gellmann  # stage into ~/.config/swival/library
swival skills add gellmann                                       # install the collection into this project
swival skills add --global gellmann                               # or activate it in every project
```

Swival also reads `AGENTS.md` from the project root and `~/.config/swival/AGENTS.md` globally, the instruction-only fallback.

On the command line, use a `$` prefix to explicitly activate a skill. For example: `$gellmann-review`.

### Devin CLI

```bash
devin plugins install tankanow/gellmann
```

Installs gellmann as a Devin plugin; skills are available as `/gellmann:gellmann`, `/gellmann:gellmann-review`, and so on.

### OpenClaw

Copy [`.openclaw/skills/gellmann`](.openclaw/skills/) into `~/.openclaw/skills/`. OpenClaw applies it on coding tasks and also exposes it as a `/gellmann` command.

### Grok Build

```bash
grok plugin install tankanow/gellmann --trust
```

Enable the plugin (off by default): `/plugins` → Plugins → Space on `gellmann`, or in `~/.grok/config.toml`:

```toml
[plugins]
enabled = ["gellmann"]
```

Start a new session (or reload plugins). Skills show as `/gellmann`, `/gellmann-work`, `/gellmann-solo`, `/gellmann-review`, `/gellmann-help`. Verify with `grok inspect`. Grok can auto-invoke gellmann for coding tasks from its skill description; use `/gellmann` (or `/gellmann work`, `/gellmann solo`) when activation needs to be explicit. Grok lifecycle hooks are not used because their SessionStart output cannot inject instructions.

`AGENTS.md` still works instruction-only from a checkout without the plugin.

Active every session, with a handful of commands (see [Commands](#commands)). Startup and mode-change text shows the current mode.

Set the mode for every new session with the `GELLMANN_DEFAULT_MODE` env var (`work`/`solo`/`off`), or a `defaultMode` field in `~/.config/gellmann/config.json` (`%APPDATA%\gellmann\config.json` on Windows). Unset, it auto-detects: `work` if the repo has a `CODEOWNERS` file or two or more commit authors, else `solo`.

While active, the ruleset is also injected into every subagent spawned via the Agent tool. To scope that to specific agent types (say, keep it off read-only search agents), set the `GELLMANN_SUBAGENT_MATCHER` env var to a regex tested against the subagent's `agent_type`. It is unanchored and case-insensitive: `explore|general` matches either, `^general$` is exact, and plugin agent types look like `plugin:name`. Unset means inject into every subagent (the default); an invalid regex, or a subagent whose type the platform doesn't report, also falls back to injecting.

Cursor, Windsurf, Cline, GitHub Copilot Chat (the VS Code, JetBrains, and Visual Studio editor extension, not the standalone Copilot CLI covered under [Install](#install)), Aider, Kiro, Zed, CodeWhale, Swival, Qoder: copy the matching rules file from this repo ([`.cursor/rules/`](.cursor/rules/), [`.windsurf/rules/`](.windsurf/rules/), [`.clinerules/`](.clinerules/), [`.github/copilot-instructions.md`](.github/copilot-instructions.md), [`AGENTS.md`](AGENTS.md), [`.kiro/steering/`](.kiro/steering/), [`.qoder/rules/`](.qoder/rules/)).

Kiro: copy `.kiro/steering/gellmann.md` to `~/.kiro/steering/` (global) or `.kiro/steering/` in your project.

GitHub Copilot CLI fallback (instruction-only mode): it reads `AGENTS.md` and `.github/copilot-instructions.md` in a project, or copy the rules into `~/.copilot/copilot-instructions.md` to run gellmann in every project. This path keeps always-on guidance, but does not add plugin mode switches or hooks.

VS Code with the Codex extension reads `AGENTS.md`, which this repo ships, so it works from the repo root with no setup (`~/.codex/AGENTS.md` makes Codex global).

JetBrains Junie can read `AGENTS.md` once you point it there in Settings → Tools → Junie → Project Settings → Guidelines Path (it is not automatic yet). This repo ships `AGENTS.md`; `.junie/guidelines.md` is Junie's legacy path.

Amp (Sourcegraph) reads `AGENTS.md` from the working directory and parent directories up to `$HOME`, which this repo ships, so it works with no setup (`~/.config/amp/AGENTS.md` works globally).

Jules (Google) reads `AGENTS.md` from the repository root, which this repo ships, so it picks up the ruleset with no setup.

Which files map to which agent: [Agent portability](docs/agent-portability.md).

### MCP hosts

Any MCP-capable host can run gellmann as a stdio server instead of a plugin: see [`gellmann-mcp/README.md`](gellmann-mcp/README.md) for setup, the `gellmann` prompt, and the read-only `gellmann_instructions` tool.

### Uninstall

| Host | Command |
|------|---------|
| Claude Code | `/plugin remove gellmann` |
| Codex | `codex plugin remove gellmann` |
| Devin CLI | `devin plugins remove gellmann` |
| Grok Build | `grok plugin uninstall gellmann` |
| Pi agent | `pi uninstall gellmann` |
| Cursor / Windsurf / Cline / Qoder / etc. | Delete the copied rule file |

These remove the plugin's own files. They leave behind a small amount of state gellmann writes outside the plugin folder: the mode flag, `~/.config/gellmann/config.json`, and (if you accepted the setup nudge) a `statusLine` entry in `~/.claude/settings.json`. Run `node scripts/uninstall.js` to clean those up too. **Run it before the host remove command above** — the script is itself a plugin file, so removing the plugin first deletes it (or run it from a separate clone of this repo). It only removes the statusLine entry if it points at gellmann's own script, so a statusline you set up yourself is left untouched.

## Commands

| Command | What it does |
|---|---|
| `/gellmann [work \| solo \| off]` | Set the mode, or turn it off. No argument reports the current mode. `/gellmann default <mode>` persists it. |
| `/gellmann-work [topic]` | Find the teammates and internal record that own this domain; draft the questions. Switches to work. |
| `/gellmann-solo [topic]` | Find canonical primary sources; cite or say could-not-verify. Switches to solo. |
| `/gellmann-review [target]` | Expert review of an output, one line per finding, ending in `N claims need a source or a human.` Switches the session to review mode; `/gellmann work\|solo` returns. |
| `/gellmann-help` | Quick reference. |

Commands need a skill-capable host. Instruction-only adapters (Cursor, Windsurf, Cline, Copilot Chat, Kiro, Antigravity) load the always-on ruleset without the commands.

## Development

```bash
node scripts/check-rule-copies.js   # instruction-tier copies match AGENTS.md; invariants present
node scripts/check-versions.js      # all eight manifests share one version
npm install --prefix gellmann-mcp
npm test
```

`.openclaw/skills/` is generated from `skills/`; rerun `node scripts/build-openclaw-skills.js` after changing a skill. Releases: bump the version in all eight files, tag `vX.Y.Z`, push the tag; CI creates the GitHub Release.

## FAQ

**Can I use it with ponytail and caveman?**
Yes. Three different halves: ponytail shrinks what the agent builds, caveman shrinks what it says, gellmann checks what it claims. None of them touch the others' territory. That is also why "normal mode" does not turn gellmann off; only "stop gellmann" does.

**Does work mode post in Slack or comment on tickets?**
No. It reads through whatever tools the host exposes and drafts the question for you to send. It never sends, posts, DMs, or opens anything.

**Does it make the agent hedge everything?**
The opposite. Uniform hedging is as useless as uniform confidence. It commits plainly to what it observed or can cite, and flags exactly what it cannot, with the thing that would settle it.

**Why "gellmann"?**
Crichton named the effect after Murray Gell-Mann, and admitted he did it to drop a famous name. We kept the joke.

## Sources

- Michael Crichton, "Why Speculate?", International Leadership Forum, La Jolla, April 26, 2002 (quoted via [Wikipedia](https://en.wikipedia.org/wiki/Michael_Crichton#%22Gell-Mann_amnesia_effect%22)).
- Julian King, ["AI and the Gell-Mann amnesia effect"](https://juliankingnz.substack.com/p/ai-and-the-gell-mann-amnesia-effect), December 2025. The review skill's checklist and interrogation prompts are adapted from it.

## License

[MIT](LICENSE).
