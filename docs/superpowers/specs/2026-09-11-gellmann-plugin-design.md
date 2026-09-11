# Gellmann: an antidote to the Gell-Mann Amnesia effect for AI output

Date: 2026-09-11
Status: approved shape, spec under review

## 1. Problem

Michael Crichton's 2002 speech "Why Speculate?" named the Gell-Mann Amnesia
effect: you read an article in your own field, see it is riddled with errors
("wet streets cause rain"), then turn the page and read the next article as if
it were accurate. You forget what you know.

AI output triggers the same effect with higher stakes. In a domain you know,
you catch the agent's mistakes instantly. In a domain you don't, the same
confident prose reads as true. Julian King's "AI and the Gell-Mann amnesia
effect" (Dec 2025) lays out the working evaluator's countermeasures: you first
then AI, triangulate sources, use an explicit quality checklist, interrogate
the draft with critical-reviewer prompts, involve stakeholders, own the output.

Gellmann puts the expert reader inside the agent. Before the agent presents
output in any domain, it reads that output the way a domain expert would, marks
what rests on unverified knowledge, and goes to find the truth: from the people
who own the domain (at work) or from canonical primary sources (solo).

## 2. Decisions already made

| Decision | Choice |
|---|---|
| Structure | Mirror `DietrichGebert/ponytail` one to one: same file layout, adapter set, hook set, test style, CI shape. |
| Host scope | Full parity: all 20 hosts including the code adapters (Node hooks, OpenCode plugin, pi extension, Hermes Python plugin, MCP server). |
| Distribution | GitHub only. No npm publish workflow. `package.json` is `private: true` and exists for pi and OpenCode checkout installs. |
| Default mode | Auto-detect at session start: `work` when the repo shows teammates, else `solo`. Override with env var, config file, or `/gellmann work|solo`. |
| Review scope | Any AI output: code, docs, analyses, answers, plans. |
| Skipped from ponytail | Benchmarks, promptfoo configs, marketing assets, translations, sponsors, ClawHub publish script, npm publish workflow. |

## 3. Behavior

### 3.1 The lens (always-on ruleset)

Injected every session. Canonical text lives in `AGENTS.md`; the full version
lives in `skills/gellmann/SKILL.md`. The ruleset says:

You are the expert reader of your own output. Before presenting anything, read
it as the person who owns this domain would, and ask what would make them
wince.

The reflex, run on every output:

1. **Name the domain(s)** the output touches and your actual footing in each.
   Fluency is not footing.
2. **Mark each load-bearing claim**: proven (you observed it this session),
   sourced (you can cite where it comes from), hypothesis (you can argue for
   it), assumption (taken as given), unknown.
3. **Hunt "wet streets cause rain"**: reversed causality, plausible-sounding
   defaults, version-specific facts stated as timeless, generalizations from one
   example, "common knowledge" with no owner.
4. **Separate mechanism from framing**: showing that code does X does not
   show X is a bug, a best practice, or the cause.
5. **Go find out**, using the active persona (work or solo), before presenting.
   What cannot be verified is presented as unverified, never smoothed into
   confident prose.
6. **Present with the ledger visible**: claims that still rest on assumption
   get a one-line flag naming who or what would settle them.

Rules:

- Confidence is not proof. Memory is not proof. A plausible inference is a
  hypothesis.
- Never invent a source. A citation you cannot open does not exist.
- A secondary source counts only when it is a published critique of a named
  primary source.
- Do not hedge everything. Mark what is unproven specifically and commit
  plainly to what is proven. Uniform hedging is as useless as uniform
  confidence.
- The lens governs what you claim and how you verify, not what you build or
  how you talk. It composes with ponytail (build less) and caveman (say less).

Output pattern, appended only when the ledger is non-empty:

```
Verify: <claim> — <who or what settles it>
```

Deactivation: "stop gellmann" or `/gellmann off`. Not "normal mode": that
phrase would also switch off ponytail and caveman when they are co-installed.

### 3.2 Modes

Modes are personas, not intensities. There is no lite/full/ultra.

| Mode | Meaning |
|---|---|
| `work` | You are on a team. Find the humans who own the domain and the internal record before trusting yourself. |
| `solo` | You are alone. Find canonical primary sources. No secondary sources unless they are published critics of a named primary. |
| `off` | Nothing injected. |
| `review` | Session-only. Set by `/gellmann-review`. Never a valid default. |

Auto-detect at session start (in `hooks/gellmann-activate.js`), evaluated
against the session `cwd`:

- `work` if any of `CODEOWNERS`, `.github/CODEOWNERS`, `docs/CODEOWNERS`
  exists, or `git shortlog -sn --all` reports two or more distinct authors.
- otherwise `solo`.
- Auto-detect runs only when no env var or config default is set.
  `GELLMANN_DEFAULT_MODE=work|solo|off` and
  `~/.config/gellmann/config.json` `{"defaultMode": ...}` override it.
- The git call has a two-second timeout and any failure resolves to `solo`.
  Auto-detect never blocks or fails a session start.

The ruleset body is filtered by mode the same way ponytail filters by
intensity: table rows labeled `**work**` / `**solo**` and worked-example
bullets `- work: "..."` / `- solo: "..."` keep only the active mode's row.

### 3.3 Skills

| Skill | Trigger | What it does |
|---|---|---|
| `gellmann` | `/gellmann [work\|solo\|off]` | The lens itself, at the given mode. No argument reports the current mode. |
| `gellmann-work` | `/gellmann-work [topic]` | Persona 1. Also switches the session mode to `work`. Locate the owners and the internal record for the domain the output touches. Sources, in order: `CODEOWNERS` and `git blame`/`git log` on the touched files; ADRs, `docs/`, READMEs, design docs in the repo; sibling repos; internal wikis, Slack, Confluence, Jira, and meeting notes when the host exposes tools for them. Ends with a named list: who to ask, what exactly to ask, and what internal artifact already answers it. Never DMs or posts on the user's behalf; it drafts the question. |
| `gellmann-solo` | `/gellmann-solo [topic]` | Persona 2. Also switches the session mode to `solo`. Locate canonical primary sources for the domain: the spec or RFC, the official reference docs for the exact version in use, the upstream source code, the paper, the standard, the vendor's own API reference. Secondary sources only when they are published critiques of a named primary. Every claim gets a citation the user can open, or a "could not verify" flag. Checks that every cited source actually exists before citing it. |
| `gellmann-review` | `/gellmann-review [target]` | One-shot review of a given output (the last response, a diff, a file, a pasted document) through King's checklist. One line per finding. Does not fix; lists. |
| `gellmann-help` | `/gellmann-help` | Quick-reference card. Changes nothing. |

`gellmann-review` format:

```
<loc>: <tag> <claim>. <what settles it>.
```

Tags (King's nine criteria compressed to seven):

- `fact:` a factual claim that is wrong, speculative, overstated, or unsourced
- `source:` a citation that is missing, secondary, or does not exist
- `logic:` non-sequitur, reversed causality, false dichotomy, unjustified leap
- `onesided:` a perspective, stakeholder, or counterargument that is missing
- `contested:` a claim reasonable experts would dispute (empirical or values)
- `hidden:` an implicit assumption, value judgment, or limitation left unstated
- `vague:` too abstract to act on

End with the verdict: `N claims need a source or a human.` or, when nothing is
flagged, `An expert would sign off.`

The skill body carries King's nine critical-reviewer prompts, lightly
compressed, as the interrogation set, with attribution.

### 3.4 Commands

`commands/*.toml` (Claude Code, Gemini, Copilot CLI) and
`.opencode/command/*.md` (OpenCode), one per skill:
`gellmann`, `gellmann-work`, `gellmann-solo`, `gellmann-review`, `gellmann-help`.

## 4. Repository layout

Same tree as ponytail with `ponytail` → `gellmann` throughout. Files marked
(port) are ponytail files renamed and re-pointed; (new) are written fresh;
(skip) are ponytail files not carried over.

```
AGENTS.md                              canonical compact ruleset (new text, port role)
LICENSE                                MIT, Adam Tankanow 2026
README.md                              (new text, ponytail section order)
package.json                           private: true, pi + opencode fields, test script
plugin.json                            Grok root manifest
plugin.yaml                            Hermes manifest
__init__.py                            Hermes plugin (port)
after-install.md                       Hermes post-install note (port)
gemini-extension.json
opencode.json
.gitignore
.claude-plugin/{plugin,marketplace}.json
.codex-plugin/plugin.json
.devin-plugin/plugin.json
.qoder-plugin/plugin.json
.grok-plugin/marketplace.json
.agents/plugins/marketplace.json
.agents/rules/gellmann.md              copy of AGENTS.md body
.cursor/rules/gellmann.mdc             copy + frontmatter
.windsurf/rules/gellmann.md            copy
.clinerules/gellmann.md                copy
.kiro/steering/gellmann.md             copy + frontmatter
.qoder/rules/gellmann.md               copy
.github/copilot-instructions.md        copy
.github/plugin/{plugin,marketplace}.json
.github/workflows/test.yml             (port, minus pandas)
.github/workflows/release.yml          (new) GitHub Release on v* tag, generated notes
.openclaw/skills/*/SKILL.md            generated by scripts/build-openclaw-skills.js
.opencode/command/*.md
.opencode/plugins/gellmann.mjs         (port)
.opencode/plugins/gellmann-frontmatter.cjs (port)
assets/logo.svg                        (new) simple wordmark
commands/*.toml
docs/agent-portability.md              (port, re-pointed)
docs/where-truth-lives.md              (new) domain → canonical primary sources table;
                                       the analogue of ponytail's platform-native.md
examples/README.md + 4 examples        (new) AI output that read fine, what an expert
                                       caught, the primary source that settles it
hooks/claude-codex-hooks.json
hooks/copilot-hooks.json
hooks/qoder-hooks.json
hooks/gellmann-config.js               (port) modes: off|work|solo (+review config-only)
hooks/gellmann-runtime.js              (port)
hooks/gellmann-instructions.js         (port) mode filter for work/solo
hooks/gellmann-activate.js             (port + auto-detect)
hooks/gellmann-detect.js               (new) CODEOWNERS / author-count detection
hooks/gellmann-subagent.js             (port)
hooks/gellmann-mode-tracker.js         (port)
hooks/gellmann-statusline.{sh,ps1}     (port) [GELLMANN] / [GELLMANN:SOLO]
gellmann-mcp/{index.js,instructions.js,package.json,README.md,test/}  (port)
pi-extension/{index.js,package.json,test/}                            (port)
scripts/check-rule-copies.js           (port) invariants re-pinned to gellmann rules
scripts/check-versions.js              (port) 8 version files
scripts/build-openclaw-skills.js       (port)
scripts/uninstall.js                   (port)
skills/gellmann/SKILL.md
skills/gellmann-work/SKILL.md
skills/gellmann-solo/SKILL.md
skills/gellmann-review/SKILL.md
skills/gellmann-help/SKILL.md
tests/*.test.js                        (port) one per adapter, plus detect.test.js (new)
```

Skipped: `benchmarks/`, `.env.example`, `README.es.md`, `README.ko.md`,
`assets/*` except the logo, `.github/FUNDING.yml`,
`scripts/publish-openclaw-skills.js`, `.github/workflows/publish.yml`,
`docs/platform-native.md` (replaced by `docs/where-truth-lives.md`).

## 5. Shared modules and data flow

Identical to ponytail:

- `gellmann-config.js` resolves the default mode: env → config file → auto-detect
  (via `gellmann-detect.js`) → `solo`. Exposes mode normalizers, config dir,
  Claude dir, shell-safety check, deactivation-phrase check
  (`stop gellmann` only).
- `gellmann-runtime.js` detects host (Codex, Copilot, Qoder, native Claude),
  picks the state dir, reads/writes the `.gellmann-active` flag, and shapes hook
  stdout per host.
- `gellmann-instructions.js` reads `skills/gellmann/SKILL.md`, strips
  frontmatter, filters mode-specific rows, prefixes
  `GELLMANN MODE ACTIVE — mode: <mode>`. Fallback text embedded for when the
  skill file is unreadable. `review` mode emits a one-line pointer to the
  review skill.
- Hooks: SessionStart → activate (detect, write flag, emit ruleset, statusline
  nudge once); SubagentStart → inject when flag present; UserPromptSubmit →
  track `/gellmann` switches and `stop gellmann`.
- OpenCode, pi, Hermes, and MCP adapters all call the shared instruction
  builder (Hermes reimplements the filter in Python, as ponytail does).

## 6. CI

`test.yml` on push to main, tags `v*`, and PRs: Node 22, Python 3.12,
`npm install --prefix gellmann-mcp`, `node scripts/check-rule-copies.js`,
`node scripts/check-versions.js`, `npm test`.

`release.yml` on tag `v*`: `check-versions` (tag must equal the shared
version), then `gh release create` with generated notes. No npm.

## 7. Testing

Plain `node --test`, no framework, as ponytail. Each adapter gets a smoke test
that spawns the real hook or imports the real module and asserts on stdout and
flag files. New coverage:

- `tests/detect.test.js`: CODEOWNERS present → work; two authors → work; one
  author, no CODEOWNERS → solo; not a git repo → solo; env var beats detect.
- `tests/hooks.test.js`: activate honors auto-detect against a temp repo;
  `stop gellmann` clears the flag; "normal mode" does not.
- `scripts/check-rule-copies.js` invariants pinned to the load-bearing phrases
  of the gellmann rules: `wet streets cause rain`, `Confidence is not proof`,
  `Never invent a source`, `published critique of a named primary`,
  `mechanism from framing`, `Uniform hedging`.

## 8. Documentation

README sections in ponytail order: hero, before/after, how it works (the six
steps), install per host, uninstall, commands, development, FAQ, license. The
before/after example is a real one from `examples/`. Numbers section is
omitted (no benchmark yet). FAQ answers: can I use it with ponytail and caveman
(yes, three different halves), what does work mode do with Slack and Confluence
(reads if tools exist, never posts), why not "normal mode" to turn it off.

`docs/where-truth-lives.md`: table per domain (Python, Node, Go, Rust, HTTP and
web standards, AWS, Kubernetes, Postgres, git, security, statistics, law and
regulation, medicine) naming the canonical primary sources and the common
secondary sources that do not count.

## 9. Out of scope

- Any benchmark or measured-impact claim. The README makes none.
- Posting, messaging, or opening tickets on the user's behalf in work mode.
- Web search in hosts that lack a fetch tool; the solo skill says what to
  look up and where when it cannot fetch.
- Intensity levels.

## 10. Open items for the user

- Create `github.com/tankanow/gellmann` and add it as `origin` before the first
  push. The repo is local-only today.
- The Hermes, Grok, Devin, Qoder, Swival, and Antigravity install commands are
  carried over from ponytail's README and were not exercised against those
  hosts in this session. They are marked as such in the README.
