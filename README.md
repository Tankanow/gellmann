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

The cure is not a second opinion from another fluent stranger. The cure is you knowing the subject.

So gellmann does not review the output for you. It briefs you on the domain in a few plain sentences, then puts you in front of someone who actually knows it: your colleagues and the record they left (**work**), or the people who wrote the field down (**solo**).

## Before / after

You ask for an API migration note. Your agent writes "return 301; clients will retry the POST at the new URL." It reads fine.

With gellmann:

```
HTTP redirect method semantics. A redirect status does two things: it moves the
client, and it decides what method the client uses when it arrives. 301 and 302
permit the client to change POST to GET. 307 and 308 forbid it. That distinction
is the entire reason 307 and 308 exist.

Read RFC 9110 §15.4.2 (301) against §15.4.9 (308) — two paragraphs, five minutes.
Who knows this: Roy Fielding, Mark Nottingham, and Julian Reschke edited it.

Say "findings" for my read of it.
```

You now know enough to judge the migration note yourself. That is the point.

More in [examples/](examples/).

## How it works

Before presenting any output that makes a claim, the agent runs the reflex:

```
1. Name the domain, specifically.   "Snowflake warehouse billing", not "databases".
2. Go find out.                     Before forming a view. With the tools it actually has.
3. Write the briefing.              3-5 plain sentences: the mechanism, and the distinction that decides it.
4. Name the humans.                 Real people, found this session. Never invented.
5. Hand it over and stop.           Its read of the output is available on request. It is not the deliverable.
```

The output is a briefing, the humans to ask, the sources to open, and one line
offering the verdict you did not ask for. Not a wall of analysis you have to
finish reading before you reach the name.

**You are not the evidence** is the rule that holds it together: if the only
thing standing behind a sentence is the agent's own reasoning, it does not go
in. That is what stops gellmann from becoming the confident stranger it exists
to protect you from.

### Modes

| Mode | Where the expertise lives |
|---|---|
| **work** | With your colleagues. Searches the work ecosystem for the humans — Slack, GitHub, Jira, Confluence, CODEOWNERS, git log, ADRs — and names who to ask, why them, and the one question to send. Drafts it; never sends it. Nobody internal knows it? Says so, then falls through to outside experts. |
| **solo** | With the people who wrote it down. The standards editor, the maintainer, the researcher, the author — and the primary source itself: the spec, the RFC, the official docs for the exact version, the upstream source, the paper. Secondary sources only as published critics of a named primary. |

Auto-detected at session start: `work` if the repo has a `CODEOWNERS` file or two or more commit authors, else `solo`. See [docs/where-truth-lives.md](docs/where-truth-lives.md) for what counts as a primary source, by domain.

### The verdict, on request

Gellmann's read of the output is real work and it still exists — it is just
opt-in. Say `findings` (or run `/gellmann-review`) and you get one line per
finding: location, tag, the claim, and what settles it. Every finding ends
with a source you can open or a person you can ask, because the agent is not
allowed to be its own evidence there either.

### Evals

The behavior above is pinned by an eval suite in [evals/](evals/), run with
`claude plugin eval`. Each case scores the plugin against a no-plugin
baseline, so a case only counts if the skill actually changes the answer. The
two cases that matter most reproduce the failure that motivated the briefing
contract: an agent confidently judging a domain it had no way to reach.

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
npm install --prefix gellmann-mcp
npm test            # 118 tests across the repo, pi-extension, and the MCP server
npm run check       # rule copies match AGENTS.md; all ten manifests share one version
npm run build       # regenerate .openclaw/skills/ from skills/
```

`.openclaw/skills/` is generated from `skills/`; rerun `npm run build` after
changing a skill. Behavioral evals live in [evals/](evals/) and cost money to
run — see that README.

### Versioning

Two forms, one base:

| Form | Example | What it is |
|---|---|---|
| release | `0.2.0` | what a `vX.Y.Z` tag ships |
| dev | `0.2.0-20260917T131133Z` | every install-worthy change on a branch |

```bash
npm run bump                    # dev stamp on the current base
npm run bump -- --release       # drop the stamp, ready to tag
npm run bump -- 0.3.0           # set a new base, release form
npm run bump -- 0.3.0 --dev     # set a new base, fresh dev stamp
npm run bump -- --print         # show the current version
```

The version is declared in **ten** files across six host ecosystems;
`scripts/bump-version.js` stamps all of them at once and
`scripts/check-versions.js` fails the build if they disagree. A test asserts
that no version-bearing file in the repo sits outside that list, so adding a
host manifest can't silently drift.

**Why the dev stamp exists.** Claude Code keys its plugin install cache on the
version *string*. With the version unchanged, `claude plugin update` prints
`already at the latest version` and keeps serving the old files — so a
directory-sourced plugin under active development looks updated and isn't. The
only symptom is the agent behaving like the previous build. Moving the string
forces a fresh copy. (Verified 2026-09-14: the CLI compares version strings for
inequality, not semver precedence — it will even "update" from `0.2.0` to
`0.2.0-<stamp>`, which real semver ranks as a downgrade.)

The stamp is ISO 8601 **basic** format, UTC, second precision — deliberately no
colons. Colons are legal in a semver prerelease and the CLI accepts them, but it
silently sanitizes them to hyphens in the cache path, so two versions differing
only in `:` vs `-` collide on one directory; they are also illegal in Windows
filenames, and gellmann ships a PowerShell statusline.

Local install loop:

```bash
npm run bump                                      # new stamp
claude plugin marketplace update gellmann
claude plugin update gellmann@gellmann            # now actually picks it up
```

Each install is a full copy of the repo (~24MB, mostly `gellmann-mcp/node_modules`)
and old versions are **not** pruned, so `~/.claude/plugins/cache/gellmann/` grows
one directory per stamp. Delete stale ones when it gets noisy.

### Releases

```bash
npm run bump -- --release     # or -- 0.3.0 for a new base
npm run check                 # confirms the release form
git tag v0.2.0 && git push --tags
```

CI re-runs the guard with the tag in the environment, which additionally
requires the bare `X.Y.Z` form and an exact match to the tag — a dev stamp
cannot be released by accident — then creates the GitHub Release.

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
