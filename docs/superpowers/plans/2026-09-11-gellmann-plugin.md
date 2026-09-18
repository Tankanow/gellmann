# Gellmann Plugin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `gellmann`, an agent-portable plugin that makes an AI agent read its own output the way a domain expert would, with `work` and `solo` verification personas, mirroring the file structure, adapters, hooks, tests, and CI of `DietrichGebert/ponytail`.

**Architecture:** One canonical ruleset (`AGENTS.md` compact, `skills/gellmann/SKILL.md` full) is injected by thin host adapters. Three Node lifecycle hooks share config, runtime, and instruction-builder modules; OpenCode, pi, Hermes (Python), and an MCP server call the same builder. Instruction-tier hosts get byte-identical copies of `AGENTS.md`, guarded by a drift check. Everything is tested with plain `node --test`.

**Tech Stack:** Node 22+ (no runtime deps outside `gellmann-mcp/`), Python 3.12 (Hermes plugin only), GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-09-11-gellmann-plugin-design.md`

**Reference implementation:** `/Users/adam/Documents/code/github/dietrichgebert/ponytail` (read-only; referred to below as `$PONY`). When a step says "port", copy the named file from `$PONY`, apply the rename table, then apply the listed edits. Do not copy anything not named in a task.

## Global Constraints

- Plugin name everywhere: `gellmann`. GitHub: `tankanow/gellmann`. Author: `Adam Tankanow`, `https://github.com/tankanow`. License: MIT.
- Version `0.1.0` in all eight version files: `.claude-plugin/plugin.json`, `.codex-plugin/plugin.json`, `.devin-plugin/plugin.json`, `.github/plugin/plugin.json`, `.qoder-plugin/plugin.json`, `gemini-extension.json`, `package.json`, `gellmann-mcp/package.json`.
- Modes: `off`, `work`, `solo` (runtime); `review` (session-only, never a default). No lite/full/ultra anywhere. `DEFAULT_MODE = 'solo'` is the last-resort fallback; the real default is env → config → auto-detect → `solo`.
- Injected header: `GELLMANN MODE ACTIVE — mode: <mode>` (em dash U+2014, "mode:" not "level:").
- Deactivation phrase: exactly `stop gellmann`. Never `normal mode`.
- Flag file: `.gellmann-active`. Config dir: `gellmann`. Env vars: `GELLMANN_DEFAULT_MODE`, `GELLMANN_SUBAGENT_MATCHER`, `GELLMANN_QUIET_STARTUP`, `GELLMANN_HIDE_STATUS`.
- Hook files never block a session: silent fail, 1s stdin fallback, 2s git timeout.
- No npm publish. `package.json` has `"private": true`.
- Commit after every task with the trailer `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- After each task's tests pass, run `/simplify` on the changed files, re-run tests if it changed anything.

**Rename table** (apply to every ported file, in this order, with `sed`):

```bash
port() { # usage: port <src-rel-path-in-$PONY> <dest-rel-path>
  mkdir -p "$(dirname "$2")"
  sed -e 's/DietrichGebert\/ponytail/tankanow\/gellmann/g' \
      -e 's/Dietrich Gebert/Adam Tankanow/g' \
      -e 's/DietrichGebert/tankanow/g' \
      -e 's/dietrichgebert/tankanow/g' \
      -e 's/PONYTAIL/GELLMANN/g' \
      -e 's/Ponytail/Gellmann/g' \
      -e 's/ponytail/gellmann/g' \
      "$PONY/$1" > "$2"
}
```

**Mode mapping for ported tests:** `ultra` → `work`, `lite` → `solo`, `full` → `solo`. Any assertion that becomes a tautology after mapping (same mode before and after a switch) is rewritten to switch `work` ↔ `solo`. Any test of `default full` or of a three-level table is deleted. `level:` in expected strings becomes `mode:`.

---

### Task 1: Repository skeleton and canonical ruleset

**Files:**
- Create: `LICENSE`, `.gitignore`, `package.json`, `AGENTS.md`

**Interfaces:**
- Produces: `AGENTS.md` body (everything above the final parenthetical) is the canonical compact ruleset copied verbatim by Task 6.

- [ ] **Step 1: LICENSE and .gitignore**

`LICENSE`: MIT text, `Copyright (c) 2026 Adam Tankanow`.

`.gitignore`:
```
node_modules/
__pycache__/
.claude/settings.local.json
```

- [ ] **Step 2: package.json**

```json
{
  "name": "gellmann",
  "version": "0.1.0",
  "private": true,
  "description": "The expert reader for AI agents. Counters the Gell-Mann Amnesia effect: reads every output as a domain expert would, then verifies with the team (work) or with primary sources (solo).",
  "keywords": ["opencode-plugin", "opencode", "gellmann", "pi-package", "pi", "skills", "qoder", "verification", "gell-mann-amnesia"],
  "license": "MIT",
  "author": { "name": "Adam Tankanow", "url": "https://github.com/tankanow" },
  "homepage": "https://github.com/tankanow/gellmann",
  "repository": { "type": "git", "url": "git+https://github.com/tankanow/gellmann.git" },
  "bugs": { "url": "https://github.com/tankanow/gellmann/issues" },
  "main": "./.opencode/plugins/gellmann.mjs",
  "exports": { ".": "./.opencode/plugins/gellmann.mjs", "./plugin": "./.opencode/plugins/gellmann.mjs" },
  "files": ["AGENTS.md", "hooks/", "skills/", ".opencode/", ".qoder/", ".qoder-plugin/", "pi-extension/", "scripts/uninstall.js", "assets/", "LICENSE"],
  "scripts": { "test": "node --test tests/*.test.js && npm test --prefix pi-extension && npm test --prefix gellmann-mcp" },
  "pi": { "extensions": ["./pi-extension/index.js"], "skills": ["./skills"] }
}
```

- [ ] **Step 3: AGENTS.md**

```markdown
# Gellmann, the expert reader

You are the expert reader of your own output. The Gell-Mann Amnesia effect: an expert opens an article in their own field, finds it backward ("wet streets cause rain"), then turns the page and believes the next one. Do not turn the page.

Before presenting any output that makes a claim:

1. Name the domain it touches and your actual footing in it. Fluency is not footing.
2. Mark every load-bearing claim: proven (observed this session), sourced (a citation that opens), hypothesis (you can argue for it), assumption (taken as given), or unknown. A conclusion drawn from an observation is not itself observed.
3. Hunt "wet streets cause rain": reversed causality, version-specific facts stated as timeless, a default that sounds right, a generalization from one example, common knowledge with no owner.
4. Separate mechanism from framing: showing the code does X proves X, not that X is a bug, the cause, or a best practice.
5. Go find out through the active mode. work: find who owns the domain (CODEOWNERS, git blame, ADRs, wikis, Slack, Confluence, tickets) and what the internal record already says; end with who to ask and what to ask, and never post on the user's behalf. solo: find the canonical primary source (spec, RFC, official reference for the exact version, upstream source, paper, standard); secondary sources count only as published critics of a named primary.
6. Present with the ledger visible. Append one line per unresolved claim: `Verify: <claim> — <who or what settles it>`. Append nothing when everything is proven or sourced.

Rules:

- Confidence is not proof. Memory is not proof. A plausible inference is a hypothesis.
- Never invent a source. A citation you cannot open does not exist.
- A secondary source counts only when it is a published critique of a named primary source.
- Mark specifically, not uniformly. Uniform hedging is as useless as uniform confidence.
- Load-bearing negatives ("X doesn't support", "there is no way") get the hardest look: state what you searched and what you did not.

Not hedged: what you directly observed this session; what you could verify yourself with a tool you have (do it); the work itself (deliver it, then flag). Gellmann governs what you claim and how you verify it, not what you build or how you talk. Off: "stop gellmann".

(Yes, this file also applies to agents working on the gellmann repo itself. Especially to them.)
```

- [ ] **Step 4: Commit**

```bash
git add LICENSE .gitignore package.json AGENTS.md
git commit -m "feat: repository skeleton and canonical ruleset"
```

---

### Task 2: Core skill and shared hook modules

**Files:**
- Create: `skills/gellmann/SKILL.md`
- Port: `$PONY/hooks/ponytail-config.js` → `hooks/gellmann-config.js`
- Port: `$PONY/hooks/ponytail-runtime.js` → `hooks/gellmann-runtime.js`
- Port: `$PONY/hooks/ponytail-instructions.js` → `hooks/gellmann-instructions.js`
- Create: `hooks/gellmann-detect.js` (stub in this task; real logic in Task 3)
- Test: `tests/instructions.test.js`

**Interfaces:**
- Produces `hooks/gellmann-config.js`: `DEFAULT_MODE='solo'`, `VALID_MODES=['off','work','solo','review']`, `RUNTIME_MODES=['off','work','solo']`, `normalizeMode(s)`, `normalizeConfigMode(s)`, `normalizePersistedMode(s)`, `isDeactivationCommand(text)`, `isShellSafe(p)`, `getConfigDir()`, `getConfigPath()`, `getClaudeDir()`, `getDefaultMode(cwd?)`, `getQuietStartup()`, `getHideStatus()`, `writeDefaultMode(mode)`.
- Produces `hooks/gellmann-runtime.js`: `setMode`, `clearMode`, `readMode`, `writeHookOutput(event, mode, context)`, `isCodex`, `isCopilot`, `isQoder`.
- Produces `hooks/gellmann-instructions.js`: `filterSkillBodyForMode(body, mode)`, `getFallbackInstructions(mode)`, `getGellmannInstructions(mode)`.
- Produces `hooks/gellmann-detect.js`: `detectMode(cwd) -> 'work'|'solo'`.

- [ ] **Step 1: Write skills/gellmann/SKILL.md**

```markdown
---
name: gellmann
description: >
  Reads AI output the way a domain expert would before it is presented, to
  counter the Gell-Mann Amnesia effect: fluent output in a field you don't
  know reads as true. Names the domain, marks every load-bearing claim as
  proven, sourced, hypothesis, assumption, or unknown, hunts reversed
  causality and unverified defaults, then verifies through the active
  persona: work (find the teammates and internal record who own the domain)
  or solo (find canonical primary sources). Use on ANY output that makes
  claims: code, docs, analyses, answers, plans, reviews, summaries. Also use
  whenever the user says "gellmann", "would an expert buy this", "how do you
  know", "verify that", "source?", "are you sure", or worries about
  hallucination, confident-sounding output, or trusting AI outside their
  expertise. Not for purely mechanical edits with no claims (renames,
  formatting).
argument-hint: "[work|solo|off]"
license: MIT
---

# Gellmann

You are the expert reader of your own output. You have watched a specialist
open an article in their own field, find it backward, and then turn the page
and believe the next one. You do not turn the page.

## Persistence

ACTIVE EVERY RESPONSE. Still active if unsure. Off only: "stop gellmann" /
`/gellmann off`. Mode: **work** or **solo**, auto-detected at session start.
Switch: `/gellmann work|solo`.

## The reflex

Before presenting any output that makes a claim:

1. **Name the domain.** Which field does this touch, and what is your actual footing in it? Fluency is not footing. Say which parts you know cold and which you are reconstructing.
2. **Mark every load-bearing claim.** proven (observed this session: a line read, a command run, a behavior reproduced), sourced (you can cite where it comes from and the citation opens), hypothesis (you can argue for it), assumption (taken as given), unknown. A conclusion drawn from an observation is not itself observed.
3. **Hunt "wet streets cause rain".** Reversed causality. Version-specific facts stated as timeless. A default that sounds right. A generalization from one example. "Common knowledge" with no owner. The plausible number.
4. **Separate mechanism from framing.** Showing the code does X proves X. It does not prove X is a bug, the cause, a best practice, or a regression. Framing is a second claim with its own burden.
5. **Go find out.** Through the active persona, before presenting. Work: who owns this, and what does the internal record already say? Solo: what is the canonical primary source, and what does it actually say? Time-box it; then report what you found and what you did not.
6. **Present with the ledger visible.** What you could not verify stays marked. Never smooth an assumption into confident prose.

## Rules

- Confidence is not proof. Memory is not proof. A plausible inference is a hypothesis.
- Never invent a source. A citation you cannot open does not exist. Check that a reference exists before you cite it.
- A secondary source counts only when it is a published critique of a named primary source. Blog posts, forum answers, and summaries do not settle anything; they point at something that might.
- Mark specifically, not uniformly. Commit plainly to what is proven; flag exactly what is not and what would settle it. Uniform hedging is as useless as uniform confidence.
- The expert's questions are cheap; ask them of yourself first: "How do I know this?" "Which version?" "What would the person who built this say?" "What is the one observation that would prove me wrong, and did I look for it?"
- Load-bearing negatives ("there is no way to", "X doesn't support", "nobody does this") get the hardest look: state what you searched and what you did not.

## Output

Deliver the work as normal. When the ledger is non-empty, append it, one line per unresolved claim:

`Verify: <claim> — <who or what settles it>`

Nothing else. No essay about uncertainty. If every load-bearing claim is proven or sourced, append nothing.

## Modes

| Mode | Where the truth lives |
|------|-----------------------|
| **work** | With the people and the record. CODEOWNERS and git blame on the touched files, ADRs and design docs, sibling repos, internal wikis, Slack, Confluence, tickets. End with who to ask and what to ask them. Never post or message on the user's behalf. |
| **solo** | In canonical primary sources. The spec, the RFC, the official reference for the exact version, the upstream source, the paper, the standard. Secondary sources only as published critics of a named primary. Every claim gets an openable citation or a "could not verify". |

Example: the output says "Postgres `SERIALIZABLE` prevents this race."
- work: "Verify: SERIALIZABLE prevents the double-insert here — ask the owner of `orders/` (CODEOWNERS: @payments); ADR-014 chose READ COMMITTED for this path and may say why."
- solo: "Verify: SERIALIZABLE prevents the double-insert — PostgreSQL 16 docs §13.2.3: SSI detects the pattern but raises 40001 instead of blocking, so the caller needs the retry loop this diff lacks."

## When NOT to hedge

Never mark as unproven what you directly observed this session. Never ask the user to verify something you could verify yourself with a tool you have. Never withhold the work while verifying; deliver and flag. Never turn a two-line answer into a treatise on epistemology.

## Boundaries

Gellmann governs what you claim and how you verify it, not what you build (pair with ponytail) or how you talk (pair with caveman). "stop gellmann": revert. Mode persists until changed or session end.

You turn the page and forget what you know. Not here.
```

- [ ] **Step 2: Write the failing test `tests/instructions.test.js`**

```js
#!/usr/bin/env node
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const { filterSkillBodyForMode, getGellmannInstructions } = require('../hooks/gellmann-instructions');
const { DEFAULT_MODE, RUNTIME_MODES, VALID_MODES, isDeactivationCommand, normalizeMode } = require('../hooks/gellmann-config');

const skill = fs.readFileSync(path.join(root, 'skills', 'gellmann', 'SKILL.md'), 'utf8');

test('modes are off/work/solo plus session-only review', () => {
  assert.equal(DEFAULT_MODE, 'solo');
  assert.deepEqual(RUNTIME_MODES, ['off', 'work', 'solo']);
  assert.deepEqual(VALID_MODES, ['off', 'work', 'solo', 'review']);
  assert.equal(normalizeMode('WORK '), 'work');
  assert.equal(normalizeMode('ultra'), null);
});

test('filter keeps only the active mode row and example', () => {
  const work = filterSkillBodyForMode(skill, 'work');
  assert.match(work, /\|\s*\*\*work\*\*\s*\|/);
  assert.doesNotMatch(work, /\|\s*\*\*solo\*\*\s*\|/);
  assert.match(work, /^- work: "/m);
  assert.doesNotMatch(work, /^- solo: "/m);
  assert.doesNotMatch(work, /^---/, 'frontmatter stripped');
  const solo = filterSkillBodyForMode(skill, 'solo');
  assert.match(solo, /^- solo: "/m);
  assert.doesNotMatch(solo, /^- work: "/m);
});

test('filter keeps ordinary rule bullets that start with a mode-like word', () => {
  const body = '---\nname: x\n---\n- Work: this is a rule, keep it verbatim\n- solo: "an example"\n';
  const out = filterSkillBodyForMode(body, 'work');
  assert.match(out, /Work: this is a rule/);
  assert.doesNotMatch(out, /an example/);
});

test('instructions carry the header and the load-bearing rules', () => {
  const text = getGellmannInstructions('work');
  assert.match(text, /^GELLMANN MODE ACTIVE — mode: work/);
  for (const phrase of ['wet streets cause rain', 'Confidence is not proof', 'Never invent a source', 'Uniform hedging']) {
    assert.ok(text.includes(phrase), `missing: ${phrase}`);
  }
});

test('review mode points at the review skill', () => {
  assert.match(getGellmannInstructions('review'), /mode: review\. Behavior defined by \/gellmann-review skill/);
});

test('only "stop gellmann" deactivates', () => {
  assert.equal(isDeactivationCommand('Stop gellmann!'), true);
  assert.equal(isDeactivationCommand('normal mode'), false);
  assert.equal(isDeactivationCommand('please stop gellmann from flagging'), false);
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `node --test tests/instructions.test.js`
Expected: FAIL, cannot find module `../hooks/gellmann-instructions`.

- [ ] **Step 4: Port hooks/gellmann-config.js**

`port hooks/ponytail-config.js hooks/gellmann-config.js`, then edit:

```js
const DEFAULT_MODE = 'solo';
const VALID_MODES = ['off', 'work', 'solo', 'review'];
const RUNTIME_MODES = ['off', 'work', 'solo'];
```

Replace the body of `isDeactivationCommand`:
```js
// "stop gellmann" turns gellmann off, only as a standalone command. Not
// "normal mode": that phrase also switches off ponytail and caveman when they
// are co-installed, and gellmann must not eat their off switch.
function isDeactivationCommand(text) {
  const t = String(text || '').trim().toLowerCase().replace(/[.!?\s]+$/, '');
  return t === 'stop gellmann';
}
```

Replace `getDefaultMode` so it takes an optional `cwd` and falls through to detection (the header comment's resolution order gains a step 3 "auto-detect from the repo: work if CODEOWNERS or 2+ authors, else solo"):
```js
function getDefaultMode(cwd) {
  const envMode = process.env.GELLMANN_DEFAULT_MODE;
  if (envMode && RUNTIME_MODES.includes(envMode.toLowerCase())) {
    return envMode.toLowerCase();
  }
  try {
    const config = JSON.parse(fs.readFileSync(getConfigPath(), 'utf8').replace(/^﻿/, ''));
    if (config.defaultMode && RUNTIME_MODES.includes(config.defaultMode.toLowerCase())) {
      return config.defaultMode.toLowerCase();
    }
  } catch (e) {
    // no config — fall through
  }
  try {
    return require('./gellmann-detect').detectMode(cwd);
  } catch (e) {
    return DEFAULT_MODE;
  }
}
```

Update the comments referencing `#377` to say `review is session-only, never a default`. Keep everything else (config dir, shell-safe, quiet-startup, hide-status, writeDefaultMode).

- [ ] **Step 5: Stub hooks/gellmann-detect.js**

```js
// Auto-detect the default mode from the working tree. Real logic in Task 3.
function detectMode() { return 'solo'; }
module.exports = { detectMode };
```

- [ ] **Step 6: Port hooks/gellmann-runtime.js**

`port hooks/ponytail-runtime.js hooks/gellmann-runtime.js`. No further edits (the rename gives `.gellmann-active`; keep the `#528` comment).

- [ ] **Step 7: Port hooks/gellmann-instructions.js**

`port hooks/ponytail-instructions.js hooks/gellmann-instructions.js`, then:

- `SKILL_PATH` points at `skills/gellmann/SKILL.md` (rename does this).
- Rename `getPonytailInstructions` → `getGellmannInstructions` (rename does this; verify).
- Replace every `' — level: '` with `' — mode: '`.
- Update the comment on the table filter: "Only the mode table rows and worked examples are mode-specific, keyed by a mode name (work/solo)."
- Replace `getFallbackInstructions` body with the compact ruleset (this is `AGENTS.md` minus the H1 and the final parenthetical, as a string), prefixed by `'GELLMANN MODE ACTIVE — mode: ' + mode + '\n\n'` and followed by `'\n\nCurrent mode: **' + mode + '**. Switch: `/gellmann work|solo`.'`.
- `INDEPENDENT_MODES` stays `new Set(['review'])`; the review line reads `'GELLMANN MODE ACTIVE — mode: review. Behavior defined by /gellmann-review skill.'`.

- [ ] **Step 8: Run the test**

Run: `node --test tests/instructions.test.js`
Expected: PASS (6 tests).

- [ ] **Step 9: Commit**

```bash
git add skills/gellmann hooks/gellmann-config.js hooks/gellmann-runtime.js hooks/gellmann-instructions.js hooks/gellmann-detect.js tests/instructions.test.js
git commit -m "feat: core gellmann skill and shared hook modules"
```

---

### Task 3: Mode auto-detection

**Files:**
- Modify: `hooks/gellmann-detect.js`
- Test: `tests/detect.test.js`

**Interfaces:**
- Produces: `detectMode(cwd = process.cwd()) -> 'work'|'solo'`, `hasCodeowners(cwd) -> boolean`, `authorCount(cwd) -> number`, `CODEOWNERS_PATHS`.

- [ ] **Step 1: Write the failing test**

```js
#!/usr/bin/env node
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const { detectMode, hasCodeowners, authorCount } = require('../hooks/gellmann-detect');
const { getDefaultMode } = require('../hooks/gellmann-config');

// GIT_CONFIG_GLOBAL/SYSTEM → devNull: the developer's commit.gpgsign or hooks
// template must not reach these throwaway repos.
function git(cwd, args, env = {}) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], env: { ...process.env, GIT_CONFIG_GLOBAL: os.devNull, GIT_CONFIG_SYSTEM: os.devNull, ...env } });
}

function repo(commitsBy) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gellmann-detect-'));
  git(dir, ['init', '-q']);
  let n = 0;
  for (const [name, email] of commitsBy) {
    fs.writeFileSync(path.join(dir, `f${n++}.txt`), 'x');
    git(dir, ['add', '.']);
    git(dir, ['-c', `user.name=${name}`, '-c', `user.email=${email}`, 'commit', '-qm', 'c'], {
      GIT_AUTHOR_NAME: name, GIT_AUTHOR_EMAIL: email, GIT_COMMITTER_NAME: name, GIT_COMMITTER_EMAIL: email,
    });
  }
  return dir;
}

const cleanup = [];
process.on('exit', () => { for (const d of cleanup) fs.rmSync(d, { recursive: true, force: true }); });

// The config resolver must reach detection in these tests.
delete process.env.GELLMANN_DEFAULT_MODE;
process.env.XDG_CONFIG_HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'gellmann-xdg-'));
cleanup.push(process.env.XDG_CONFIG_HOME);

test('one author, no CODEOWNERS → solo', () => {
  const dir = repo([['A', 'a@x.io']]); cleanup.push(dir);
  assert.equal(authorCount(dir), 1);
  assert.equal(hasCodeowners(dir), false);
  assert.equal(detectMode(dir), 'solo');
});

test('two authors → work', () => {
  const dir = repo([['A', 'a@x.io'], ['B', 'b@x.io']]); cleanup.push(dir);
  assert.equal(authorCount(dir), 2);
  assert.equal(detectMode(dir), 'work');
});

test('same author, different case email → still one author', () => {
  const dir = repo([['A', 'a@x.io'], ['A', 'A@X.IO']]); cleanup.push(dir);
  assert.equal(authorCount(dir), 1);
});

test('CODEOWNERS in any of the three places → work', () => {
  for (const rel of ['CODEOWNERS', '.github/CODEOWNERS', 'docs/CODEOWNERS']) {
    const dir = repo([['A', 'a@x.io']]); cleanup.push(dir);
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, rel), '* @team\n');
    assert.equal(hasCodeowners(dir), true, rel);
    assert.equal(detectMode(dir), 'work', rel);
  }
});

test('not a git repo → solo, no throw', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gellmann-nogit-')); cleanup.push(dir);
  assert.equal(authorCount(dir), 0);
  assert.equal(detectMode(dir), 'solo');
});

test('getDefaultMode reaches detection and env beats it', () => {
  const dir = repo([['A', 'a@x.io'], ['B', 'b@x.io']]); cleanup.push(dir);
  assert.equal(getDefaultMode(dir), 'work');
  process.env.GELLMANN_DEFAULT_MODE = 'solo';
  try { assert.equal(getDefaultMode(dir), 'solo'); } finally { delete process.env.GELLMANN_DEFAULT_MODE; }
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test tests/detect.test.js`
Expected: FAIL, `hasCodeowners is not a function` and `two authors → work` fails.

- [ ] **Step 3: Implement hooks/gellmann-detect.js**

```js
#!/usr/bin/env node
// gellmann — default-mode auto-detection.
//
// work: the repo shows teammates (a CODEOWNERS file, or two or more distinct
// commit authors). solo: everything else, including "not a git repo" and any
// git failure. Must never throw or block: the SessionStart hook calls this.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const CODEOWNERS_PATHS = ['CODEOWNERS', '.github/CODEOWNERS', 'docs/CODEOWNERS'];

function hasCodeowners(cwd) {
  return CODEOWNERS_PATHS.some((rel) => fs.existsSync(path.join(cwd, rel)));
}

// Distinct author emails in the last 200 commits, case-insensitive.
// gellmann: 200 is a cheap bound; a solo repo hits 1 in the first commit and a
// team repo hits 2 long before 200. Raise if a real repo fools it.
function authorCount(cwd) {
  try {
    const out = execFileSync('git', ['log', '--format=%aE', '-n', '200'], {
      cwd,
      timeout: 2000,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return new Set(out.split('\n').map((s) => s.trim().toLowerCase()).filter(Boolean)).size;
  } catch (e) {
    return 0;
  }
}

// gellmann: process.cwd() — Claude Code runs hooks in the project directory.
// Read the SessionStart stdin `cwd` instead if a host ever runs hooks elsewhere.
function detectMode(cwd = process.cwd()) {
  try {
    if (hasCodeowners(cwd) || authorCount(cwd) >= 2) return 'work';
  } catch (e) {
    // fall through
  }
  return 'solo';
}

module.exports = { CODEOWNERS_PATHS, authorCount, detectMode, hasCodeowners };
```

- [ ] **Step 4: Run the tests**

Run: `node --test tests/detect.test.js tests/instructions.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add hooks/gellmann-detect.js tests/detect.test.js
git commit -m "feat: auto-detect work vs solo from CODEOWNERS and author count"
```

---

### Task 4: Lifecycle hooks, hook manifests, statusline

**Files:**
- Port: `$PONY/hooks/ponytail-activate.js` → `hooks/gellmann-activate.js`
- Port: `$PONY/hooks/ponytail-subagent.js` → `hooks/gellmann-subagent.js`
- Port: `$PONY/hooks/ponytail-mode-tracker.js` → `hooks/gellmann-mode-tracker.js`
- Port: `$PONY/hooks/ponytail-statusline.sh` → `hooks/gellmann-statusline.sh`
- Port: `$PONY/hooks/ponytail-statusline.ps1` → `hooks/gellmann-statusline.ps1`
- Port: `$PONY/hooks/claude-codex-hooks.json`, `copilot-hooks.json`, `qoder-hooks.json` → same names under `hooks/`
- Port: `$PONY/tests/hooks.test.js` → `tests/hooks.test.js`; `$PONY/tests/hooks-windows.test.js` → `tests/hooks-windows.test.js`

**Interfaces:**
- Consumes: everything from Task 2 and 3.
- Produces: the three hook entry points; `/gellmann`, `/gellmann-work`, `/gellmann-solo`, `/gellmann-review` prompt handling.

- [ ] **Step 1: Port the tests first**

`port tests/hooks.test.js tests/hooks.test.js` and `port tests/hooks-windows.test.js tests/hooks-windows.test.js`. Apply the mode mapping. Then add these cases to `tests/hooks.test.js` right after the existing native-Claude activate assertions (use the same `run()` helper and temp `home`):

```js
// Auto-detect: with no env/config default, activate resolves work vs solo from
// the cwd. Build a two-author temp repo and run the hook from inside it.
{
  const { execFileSync } = require('child_process');
  const repoDir = path.join(temp, 'team-repo');
  fs.mkdirSync(repoDir, { recursive: true });
  const g = (args, env = {}) => execFileSync('git', args, { cwd: repoDir, stdio: 'ignore', env: { ...process.env, GIT_CONFIG_GLOBAL: os.devNull, GIT_CONFIG_SYSTEM: os.devNull, ...env } });
  g(['init', '-q']);
  for (const [n, e] of [['A', 'a@x.io'], ['B', 'b@x.io']]) {
    fs.writeFileSync(path.join(repoDir, n + '.txt'), n);
    g(['add', '.']);
    g(['commit', '-qm', n], { GIT_AUTHOR_NAME: n, GIT_AUTHOR_EMAIL: e, GIT_COMMITTER_NAME: n, GIT_COMMITTER_EMAIL: e });
  }
  const detectEnv = { HOME: home, USERPROFILE: home, XDG_CONFIG_HOME: path.join(temp, 'xdg-empty') };
  const r = spawnSync(process.execPath, [path.join(root, 'hooks', 'gellmann-activate.js')], { cwd: repoDir, env: { ...process.env, ...detectEnv }, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /GELLMANN MODE ACTIVE — mode: work/);
  assert.equal(fs.readFileSync(path.join(home, '.claude', '.gellmann-active'), 'utf8'), 'work');
}

// "normal mode" must NOT deactivate gellmann (it is ponytail's and caveman's switch).
result = run('gellmann-mode-tracker.js', { HOME: home, USERPROFILE: home }, JSON.stringify({ prompt: 'normal mode' }));
assert.equal(result.status, 0, result.stderr);
assert.equal(fs.existsSync(path.join(home, '.claude', '.gellmann-active')), true, 'normal mode must leave the flag alone');

// "stop gellmann" does.
result = run('gellmann-mode-tracker.js', { HOME: home, USERPROFILE: home }, JSON.stringify({ prompt: 'stop gellmann' }));
assert.equal(fs.existsSync(path.join(home, '.claude', '.gellmann-active')), false);

// /gellmann-work and /gellmann-solo switch the persisted mode.
result = run('gellmann-mode-tracker.js', { HOME: home, USERPROFILE: home }, JSON.stringify({ prompt: '/gellmann-work orders/' }));
assert.equal(fs.readFileSync(path.join(home, '.claude', '.gellmann-active'), 'utf8'), 'work');
result = run('gellmann-mode-tracker.js', { HOME: home, USERPROFILE: home }, JSON.stringify({ prompt: '/gellmann-solo' }));
assert.equal(fs.readFileSync(path.join(home, '.claude', '.gellmann-active'), 'utf8'), 'solo');
```

Where the ported tests set `PONYTAIL_DEFAULT_MODE` in an env, they now set `GELLMANN_DEFAULT_MODE` (rename does it). Every ported activate test must set `GELLMANN_DEFAULT_MODE` or a config so detection does not run against the gellmann repo itself.

- [ ] **Step 2: Run to verify failure**

Run: `node --test tests/hooks.test.js`
Expected: FAIL, hook files missing.

- [ ] **Step 3: Port the three hooks**

`port` each of `ponytail-activate.js`, `ponytail-subagent.js`, `ponytail-mode-tracker.js`. Edits:

`hooks/gellmann-activate.js`:
- Statusline nudge text: `"(e.g. [GELLMANN:WORK], [GELLMANN:SOLO])"`.
- No other change; `getDefaultMode()` now auto-detects from `process.cwd()`.

`hooks/gellmann-subagent.js`: rename only. Env var becomes `GELLMANN_SUBAGENT_MATCHER` (rename does it).

`hooks/gellmann-mode-tracker.js`: replace the command block inside `if (/^[/@$]gellmann/.test(prompt))` with:

```js
      const parts = prompt.split(/\s+/);
      const cmd = parts[0].replace(/^[@$]/, '/').replace(/^\/gellmann:gellmann/, '/gellmann');
      const arg = parts[1] || '';

      let mode = null;
      let isReportOnly = false;

      if (cmd === '/gellmann-review') {
        mode = 'review';
      } else if (cmd === '/gellmann-work') {
        mode = 'work';
      } else if (cmd === '/gellmann-solo') {
        mode = 'solo';
      } else if (cmd === '/gellmann') {
        // `/gellmann default <mode>` persists the default to config (survives
        // restarts). Plain switches stay session-scoped. review is never a
        // valid default, so only off/work/solo are accepted.
        if (arg === 'default') {
          const dmode = parts[2];
          if (dmode === 'off' || dmode === 'work' || dmode === 'solo') {
            writeDefaultMode(dmode);
            writeHookOutput('UserPromptSubmit', dmode, 'GELLMANN DEFAULT SET — new sessions start in ' + dmode + '.');
          }
          return;
        }
        if (arg === 'work') mode = 'work';
        else if (arg === 'solo') mode = 'solo';
        else if (arg === 'off') mode = 'off';
        else if (arg === '') {
          isReportOnly = true;
          mode = readMode() || getDefaultMode();
        } else {
          mode = getDefaultMode();
        }
      }
```

Below that block, `'PONYTAIL MODE ACTIVE — level: '` strings become `'GELLMANN MODE ACTIVE — mode: '` and `MODE CHANGED — level:` becomes `MODE CHANGED — mode:` (three places). Keep the Qoder double-duty logic and the never-hang stdin guard verbatim.

- [ ] **Step 4: Port statusline scripts**

`hooks/gellmann-statusline.sh`:
```bash
#!/usr/bin/env bash
# CLAUDE_CONFIG_DIR overrides ~/.claude, matching where the hooks write the flag.
flag="${CLAUDE_CONFIG_DIR:-$HOME/.claude}/.gellmann-active"
[ -f "$flag" ] || exit 0
mode=$(head -n1 "$flag" | tr -d '[:space:]')
[ -z "$mode" ] && exit 0
# work is green (people), solo is blue (books). The mode is in the text too.
color=110
[ "$mode" = "work" ] && color=108
printf '\033[38;5;%sm[GELLMANN:%s]\033[0m' "$color" "$(printf '%s' "$mode" | tr '[:lower:]' '[:upper:]')"
```

`hooks/gellmann-statusline.ps1`: port, then make the output always `[GELLMANN:<MODE>]`: `$Color = if ($Mode -eq "work") { "108" } else { "110" }`, drop the `IsNullOrEmpty -or full` branch (exit 0 when empty), single `[Console]::Write("${Esc}[38;5;${Color}m[GELLMANN:$Suffix]${Esc}[0m")`.

`chmod +x hooks/gellmann-statusline.sh hooks/*.js`.

- [ ] **Step 5: Port the three hook manifests**

`port hooks/claude-codex-hooks.json hooks/claude-codex-hooks.json`, same for `copilot-hooks.json` and `qoder-hooks.json`. Rename is sufficient; verify the command paths read `gellmann-activate.js`, `gellmann-mode-tracker.js`, `gellmann-subagent.js` and the Qoder `_comment` says `GELLMANN_DIR`.

- [ ] **Step 6: Run the tests**

Run: `node --test tests/hooks.test.js tests/hooks-windows.test.js tests/detect.test.js tests/instructions.test.js`
Expected: PASS. If a ported assertion fails because it still expects ponytail's three-level behavior, apply the mode mapping rule from Global Constraints; do not weaken the hook to match the old test.

- [ ] **Step 7: Commit**

```bash
git add hooks tests/hooks.test.js tests/hooks-windows.test.js
git commit -m "feat: lifecycle hooks, hook manifests, statusline"
```

---

### Task 5: Persona, review, and help skills; commands

**Files:**
- Create: `skills/gellmann-work/SKILL.md`, `skills/gellmann-solo/SKILL.md`, `skills/gellmann-review/SKILL.md`, `skills/gellmann-help/SKILL.md`
- Create: `commands/gellmann.toml`, `commands/gellmann-work.toml`, `commands/gellmann-solo.toml`, `commands/gellmann-review.toml`, `commands/gellmann-help.toml`
- Create: `.opencode/command/gellmann.md`, `gellmann-work.md`, `gellmann-solo.md`, `gellmann-review.md`, `gellmann-help.md`
- Test: `tests/commands.test.js`

**Interfaces:**
- Produces: the five skill names `gellmann`, `gellmann-work`, `gellmann-solo`, `gellmann-review`, `gellmann-help` that every adapter (pi, Hermes, OpenClaw, manifests) enumerates.

- [ ] **Step 1: Write the failing test**

Ponytail derives the command list from the pi extension, which does not exist yet. Derive it from `skills/` instead:

```js
#!/usr/bin/env node
// Every skill ships a file-based command for the hosts that need one: Claude
// Code (commands/*.toml, reused by Gemini CLI and Copilot CLI) and OpenCode
// (.opencode/command/*.md). A skill without both fails here.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const EXPECTED = ['gellmann', 'gellmann-help', 'gellmann-review', 'gellmann-solo', 'gellmann-work'];
const skills = fs.readdirSync(path.join(root, 'skills')).filter((d) => fs.existsSync(path.join(root, 'skills', d, 'SKILL.md'))).sort();

test('the five skills exist', () => assert.deepEqual(skills, EXPECTED));

test('every skill ships a Claude commands/*.toml with description and prompt', () => {
  for (const name of skills) {
    const p = path.join(root, 'commands', `${name}.toml`);
    assert.ok(fs.existsSync(p), `missing commands/${name}.toml`);
    const text = fs.readFileSync(p, 'utf8');
    assert.match(text, /^description = ".+"/m);
    assert.match(text, /^prompt = ".+"/m);
  }
});

test('every skill ships an OpenCode .opencode/command/*.md with frontmatter', () => {
  for (const name of skills) {
    const p = path.join(root, '.opencode', 'command', `${name}.md`);
    assert.ok(fs.existsSync(p), `missing .opencode/command/${name}.md`);
    assert.match(fs.readFileSync(p, 'utf8'), /^---\r?\ndescription: .+\r?\n---/);
  }
});

test('every SKILL.md has name matching its directory and a description', () => {
  for (const name of skills) {
    const text = fs.readFileSync(path.join(root, 'skills', name, 'SKILL.md'), 'utf8');
    assert.match(text, new RegExp(`^name: ${name}$`, 'm'));
    assert.match(text, /^description: >/m);
  }
});
```

- [ ] **Step 2: Run to verify failure**

Run: `node --test tests/commands.test.js`
Expected: FAIL on `the five skills exist`.

- [ ] **Step 3: Write skills/gellmann-work/SKILL.md**

```markdown
---
name: gellmann-work
description: >
  Work persona of the Gell-Mann lens: you are on a team, and someone here
  already knows this. Locates the owners and the internal record for the
  domain an output touches: CODEOWNERS, git blame and log on the touched
  files, ADRs, design docs, READMEs, sibling repos, and internal wikis,
  Slack, Confluence, or tickets when the host exposes tools for them. Ends
  with a named list of who to ask, exactly what to ask, and which internal
  artifact already answers it. Use when the user says "who owns this", "who
  should I ask", "has anyone here done this", "check the wiki", or invokes
  /gellmann-work, or when work mode is active and a claim rests on domain
  knowledge the codebase or team may already hold. Drafts questions; never
  sends them. Switches the session to work mode.
argument-hint: "[topic, file, or claim]"
---

# Gellmann: work

Someone on this team is the expert. Find them, and the record they left,
before you trust yourself.

## Procedure

Given a topic, file, diff, or claim (default: the claims in your last output):

1. **Owners.** `CODEOWNERS` (root, `.github/`, `docs/`) for the touched paths. `git log --format='%aN <%aE>' -- <path> | sort | uniq -c | sort -rn | head` for who actually touches it. `git blame` on the specific lines a claim depends on. The last person to change a line is the first person to ask about it.
2. **The record in the repo.** ADRs, `docs/`, design docs, RFCs, `CHANGELOG`, PR descriptions (`git log --merges`, `gh pr list --search`), issue links in commit messages, TODO and FIXME comments near the touched code, tests that encode intent.
3. **The record next door.** Sibling repos with the same framework or the same owners. A service's consumers and producers. The shared library the codebase already uses for this.
4. **The record outside the repo**, only through tools the host actually exposes: internal wiki and Confluence pages, Slack threads, Jira or Linear tickets, meeting notes. Search read-only. Quote what you find, with a link. If no such tool exists, name the search you would run and stop.
5. **Prior decisions beat present intuition.** If the record shows a choice was made deliberately (an ADR, a PR discussion, a reverted commit), your claim that it is wrong is a hypothesis about their reasoning, not a finding. Say so.

## Output

```
Ask: <name or team> (<why them: CODEOWNERS / last touched <file> on <date> / wrote ADR-N>)
  Q: <the exact question, one sentence, naming the claim it settles>
Record: <artifact> — <what it says, one line> (<link or path>)
Unowned: <claim> — nobody in the record; falls to /gellmann-solo
```

One block per claim, ordered by how much rides on the claim. Draft the questions the way the user would send them. Never send, post, DM, comment, or open a ticket yourself.

## Boundaries

Read-only against every external system. Does not fabricate people, teams, pages, or threads: a name appears in the output only if it appeared in a file, a commit, or a tool result this session. Where the record is silent, say `Unowned` and hand off to `/gellmann-solo`.
```

- [ ] **Step 4: Write skills/gellmann-solo/SKILL.md**

```markdown
---
name: gellmann-solo
description: >
  Solo persona of the Gell-Mann lens: no teammate to ask, so find where the
  truth is published. Locates canonical primary sources for the domain an
  output touches: the specification or RFC, the official reference
  documentation for the exact version in use, the upstream source code, the
  paper, the standard, the vendor's own API reference. Secondary sources
  count only when they are published critiques of a named primary. Every
  claim ends with a citation the user can open or an explicit "could not
  verify". Use when the user says "source?", "cite that", "what does the
  spec say", "check the docs", or invokes /gellmann-solo, or when solo mode
  is active and a claim rests on knowledge the agent is reconstructing from
  memory. Switches the session to solo mode.
argument-hint: "[topic, file, or claim]"
---

# Gellmann: solo

Nobody here to ask. Find where the truth is published and read it.

## What counts as a source

**Primary (settles a claim):** the specification or standard (RFC, W3C, ISO, PEP, KEP); the official reference documentation for the exact version in use; the upstream source code and its tests; the changelog or release notes for the version boundary a claim depends on; the paper or dataset a result comes from; the statute, regulation, or ruling; the vendor's own API reference and service documentation.

**Secondary (does not settle a claim):** tutorials, blog posts, forum answers, summaries, textbooks, other AI output, your memory. A secondary source counts only when it is a published critique of a named primary source: an erratum, a peer-reviewed reply, a maintainer's postmortem, a CVE against a specified behavior. Then cite both.

## Procedure

Given a topic, file, diff, or claim (default: the claims in your last output):

1. **Pin the version.** Lockfile, `package.json`, `pyproject.toml`, `go.mod`, runtime version, API version header, schema version. A fact about "Postgres" is not a fact about Postgres 16.3.
2. **Name the primary source before you look.** For this domain and version, which document is canonical? (`docs/where-truth-lives.md` lists common ones.) If you cannot name one, you cannot verify the claim; say so.
3. **Open it.** Fetch the page, read the section, quote the sentence. If the host has no fetch tool, give the exact document, section, and what it should say, marked `unopened`.
4. **Check the reference exists** before citing it: the URL resolves, the RFC number matches the title, the function is in that module in that version. A citation that does not open is a fabrication.
5. **Read against the claim, not for it.** Look for the sentence that would refute it: a caveat, a version note, a "deprecated", a "not guaranteed". Report it if it exists.
6. **Prefer source over docs when they disagree.** Docs describe intent; code is behavior. Note the disagreement.

## Output

```
<claim>
  Source: <document, section> — "<quoted sentence>" (<URL or path>)
  Status: confirmed | refuted | narrower than stated | could not verify
```

One block per claim. `refuted` and `narrower than stated` come first. `could not verify` names the primary source that would settle it and why it could not be opened.

## Boundaries

No source from memory: every citation in the output was opened this session or is marked `unopened`. Does not cite secondary sources as settlement. Does not stop at the first confirming sentence; the refuting caveat is the thing an expert would know.
```

- [ ] **Step 5: Write skills/gellmann-review/SKILL.md**

```markdown
---
name: gellmann-review
description: >
  One-shot expert review of an AI output (the last response, a diff, a
  file, or a pasted document) for the errors a domain expert would catch and
  a non-expert would not: unsourced or wrong facts, missing or fabricated
  citations, reversed causality, one-sided framing, contested claims stated
  as settled, hidden assumptions, and vague conclusions. Built on Julian
  King's quality checklist and critical-reviewer prompts. One line per
  finding. Use when the user says "review this like an expert", "would an
  expert buy this", "gellmann review", "fact-check this", "what would a
  specialist say", or invokes /gellmann-review. Lists; does not fix.
argument-hint: "[target: last | diff | <file> | pasted text]"
---

Review an output as the specialist who owns its domain would. One line per
finding: location, tag, the claim, what settles it. The output's best outcome
is fewer unearned claims.

## Format

`<loc>: <tag> <claim>. <what settles it>.`

`<loc>` is a line number, a section heading, or `¶N` for prose.

Tags:

- `fact:` a factual claim that is wrong, speculative, overstated, or unsourced. Name the primary source or the person.
- `source:` a citation that is missing, secondary, or does not exist. Name what a real one would be.
- `logic:` non-sequitur, reversed causality ("wet streets cause rain"), false dichotomy, unjustified leap, generalization from one case.
- `onesided:` a stakeholder, discipline, or counterargument that is missing.
- `contested:` reasonable experts would dispute this; say whether the dispute is empirical or values-based.
- `hidden:` an assumption, value judgment, or limitation that is implicit and load-bearing.
- `vague:` too abstract to act on. Say what specific form would be actionable.

## Examples

❌ "This section might benefit from additional supporting evidence and a more balanced consideration of alternative viewpoints."

✅ `¶3: fact: "Python dicts are unordered". True before 3.7; insertion order is guaranteed since 3.7 (docs, Mapping Types — dict, "Changed in version 3.7").`

✅ `L41: source: cites "the OWASP guide" for "12 rounds of bcrypt". The OWASP Password Storage Cheat Sheet gives a work factor of 10 or more; "rounds" misreads the cost parameter. Quote the sheet.`

✅ `¶7: logic: "teams that adopted the tool shipped faster, so the tool speeds teams up". Selection: fast teams adopt tools. Needs the pre-adoption baseline.`

✅ `README §Deploy: hidden: assumes a single region. The failover claim in ¶2 rests on it and it is stated nowhere.`

✅ `¶9: contested: "microservices are the right default". Values-based; team size, cost, and ops maturity decide it. State the conditions.`

✅ `¶12: vague: "monitor for anomalies". Which metric, what threshold, who is paged.`

## Interrogation set

When the target is prose or analysis, run these against it, each producing findings in the format above. Adapted from Julian King, "AI and the Gell-Mann amnesia effect" (Dec 2025):

1. Logical problems: unclear premises, non-sequiturs, unjustified leaps, informal fallacies (overgeneralisation, false dichotomy). Quote the text, explain plainly, suggest a sounder alternative.
2. Each factual claim (numbers, dates, classifications, causal statements): (a) inaccurate, (b) speculative or uncertain, (c) overstated relative to typical evidence, or (d) lacking a clear source. Note when you are unsure.
3. Sections that are one-sided, oversimplified, or incomplete given what other stakeholder groups or disciplines would reasonably think. Name the missing perspective.
4. Conclusions stated without sufficient support. What is missing: (a) empirical evidence, (b) causal mechanism or theory, (c) evaluative reasoning linking evidence to explicit criteria, or (d) why alternative interpretations were rejected.
5. Framing or language bias: loaded terms, one-sided portrayal of actors, implicit value judgements. Suggest neutral wording.
6. Statements reasonable stakeholders would contest. Distinguish empirical contestation (other credible evidence exists) from values-based contestation (different interests would disagree).
7. Claims that rest on broad generalisations or "common sense" ("X always leads to Y"). Explain why it may rely on assumed consensus rather than evidence.
8. How clearly the text states (a) key value judgements, (b) major assumptions, (c) limitations. Point out where each is missing, implicit, or underdeveloped.
9. Statements, findings, or recommendations too vague or high-level to guide action. Say how each could be made specific and decision-relevant.

When the target is code, the same set applies to its comments, commit message, PR description, and to every claim the code embodies: a timeout value, a retry count, an "is safe because" comment, a chosen isolation level.

## Verdict

End with one line: `N claims need a source or a human.` If nothing is flagged: `An expert would sign off.`

## Boundaries

Scope: what the output claims and whether an expert would accept it. Code logic correctness, style, and over-engineering are out of scope; route them to a normal review or ponytail-review. Lists findings; does not rewrite the target. Never fabricates a source to fill a `source:` line; if none is known, say `primary source unknown; falls to /gellmann-solo`.
```

- [ ] **Step 6: Write skills/gellmann-help/SKILL.md**

```markdown
---
name: gellmann-help
description: >
  Quick-reference card for gellmann's modes, skills, and commands. One-shot
  display, not a persistent mode. Trigger: /gellmann-help, "gellmann help",
  "what gellmann commands", "how do I use gellmann".
---

# Gellmann Help

Display this card when invoked. One-shot: do NOT change mode, write flag
files, or persist anything.

## Modes

| Mode | Trigger | Where the truth lives |
|------|---------|-----------------------|
| **work** | `/gellmann work` | With the team: CODEOWNERS, git blame, ADRs, wikis, Slack, Confluence, tickets. Ends with who to ask. |
| **solo** | `/gellmann solo` | In canonical primary sources: spec, RFC, official docs for the exact version, upstream source, paper. |

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

Say "stop gellmann" or run `/gellmann off`. Resume with `/gellmann`. "normal mode" is deliberately not a switch: it belongs to ponytail and caveman.

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
```

- [ ] **Step 7: Write the five commands/*.toml**

`commands/gellmann.toml`:
```toml
description = "Switch gellmann mode (work/solo/off) or report the current one"
prompt = "Switch to gellmann {{args}} mode. If no mode is given, report the current mode. You are the expert reader of your own output: before presenting any claim, name the domain and your footing in it, mark each load-bearing claim as proven, sourced, hypothesis, assumption, or unknown, hunt reversed causality and version-specific facts stated as timeless, separate mechanism from framing, verify through the active mode (work: who owns this and what does the internal record say; solo: what does the canonical primary source say), and append one 'Verify: <claim> — <who or what settles it>' line per unresolved claim. Confidence is not proof. Never invent a source."
```

`commands/gellmann-work.toml`:
```toml
description = "Find the teammates and internal record that own this domain; draft the questions"
prompt = "Run the gellmann work persona on {{args}} (default: the claims in your last output). Switch to work mode. Find the owners: CODEOWNERS, git log and git blame on the touched files. Find the record: ADRs, docs, design docs, PR descriptions, tests that encode intent, sibling repos, and internal wiki, Confluence, Slack, or tickets only through tools this host exposes, read-only. Output per claim: 'Ask: <name or team> (<why them>)' with 'Q: <exact one-sentence question>', 'Record: <artifact> — <what it says> (<link>)', or 'Unowned: <claim> — falls to /gellmann-solo'. Never send, post, or DM. Never name a person who did not appear in a file, commit, or tool result."
```

`commands/gellmann-solo.toml`:
```toml
description = "Find canonical primary sources for this domain; cite or say could-not-verify"
prompt = "Run the gellmann solo persona on {{args}} (default: the claims in your last output). Switch to solo mode. Pin the exact version in use. Name the canonical primary source before looking (spec, RFC, official reference docs for that version, upstream source, paper, standard). Open it and quote the sentence; check the reference exists before citing it. Read against the claim: look for the caveat that refutes or narrows it. Secondary sources count only as published critiques of a named primary. Output per claim: the claim, 'Source: <document, section> — \"<quoted sentence>\" (<URL>)', 'Status: confirmed | refuted | narrower than stated | could not verify'. No source from memory."
```

`commands/gellmann-review.toml`:
```toml
description = "Expert review of an AI output: facts, sources, logic, framing, hidden assumptions"
prompt = "Review {{args}} (default: your last output) as the specialist who owns its domain would. One line per finding: <loc>: <tag> <claim>. <what settles it>. Tags: fact (wrong, speculative, overstated, or unsourced claim), source (missing, secondary, or nonexistent citation), logic (non-sequitur, reversed causality, false dichotomy, generalization from one case), onesided (missing stakeholder or counterargument), contested (experts would dispute; empirical or values-based), hidden (implicit load-bearing assumption or limitation), vague (not actionable). For prose, run Julian King's nine critical-reviewer prompts: logic, factual claims, one-sidedness, unsupported conclusions, framing bias, contested statements, generalisations, transparency of values/assumptions/limitations, actionability. End with 'N claims need a source or a human.' or 'An expert would sign off.' List; do not fix."
```

`commands/gellmann-help.toml`:
```toml
description = "Quick reference for gellmann modes, skills, and commands"
prompt = "Show the gellmann quick reference. One shot, change nothing: do not switch mode, write flag files, or persist anything. Modes: /gellmann work (verify with the team: CODEOWNERS, git blame, ADRs, wikis, Slack, Confluence, tickets; ends with who to ask), /gellmann solo (verify with canonical primary sources: spec, RFC, official docs for the exact version, upstream source, paper). Auto-detected at session start: work if the repo has CODEOWNERS or two or more commit authors, else solo. Commands: /gellmann [work|solo|off] (switch or report), /gellmann-work [topic] (find owners and internal record; switches to work), /gellmann-solo [topic] (find primary sources; switches to solo), /gellmann-review [target] (expert review, one line per finding), /gellmann-help (this card). Deactivate with 'stop gellmann' or /gellmann off, not 'normal mode' (that is ponytail's and caveman's). Default mode: GELLMANN_DEFAULT_MODE env var (off|work|solo), then ~/.config/gellmann/config.json (Windows: %APPDATA%\\gellmann\\config.json) with {\"defaultMode\": \"work\"}, then auto-detect, then solo. /gellmann default <mode> writes the config."
```

- [ ] **Step 8: Write the five .opencode/command/*.md**

Each is the matching toml's description and prompt in frontmatter form, with `{{args}}` replaced by `$ARGUMENTS`:

```markdown
---
description: <same description as the toml>
---

<same prompt text as the toml, with $ARGUMENTS>
```

- [ ] **Step 9: Run the tests**

Run: `node --test tests/commands.test.js`
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add skills commands .opencode/command tests/commands.test.js
git commit -m "feat: work, solo, review, and help skills with host commands"
```

---

### Task 6: Instruction-tier rule copies and drift check

**Files:**
- Create: `.cursor/rules/gellmann.mdc`, `.windsurf/rules/gellmann.md`, `.clinerules/gellmann.md`, `.agents/rules/gellmann.md`, `.qoder/rules/gellmann.md`, `.github/copilot-instructions.md`, `.kiro/steering/gellmann.md`
- Port: `$PONY/scripts/check-rule-copies.js` → `scripts/check-rule-copies.js`

- [ ] **Step 1: Port the drift check**

`port scripts/check-rule-copies.js scripts/check-rule-copies.js`. Replace the `INVARIANTS` array:

```js
const INVARIANTS = [
  'wet streets cause rain',                    // the effect, named
  'Fluency is not footing',                    // step 1
  'Confidence is not proof',                   // rule 1
  'Never invent a source',                     // rule 2
  'published critique of a named primary',     // secondary-source rule
  'mechanism from framing',                    // step 4
  'Uniform hedging',                           // mark specifically
  'Verify: <claim>',                           // the ledger line
  'stop gellmann',                             // the only off switch
];
```

Update the comment above it to name gellmann's rules. The `copies` list keeps the same seven paths with `gellmann` names.

- [ ] **Step 2: Run to verify it fails**

Run: `node scripts/check-rule-copies.js`
Expected: exit 1, ENOENT on `.cursor/rules/gellmann.mdc`.

- [ ] **Step 3: Generate the copies from AGENTS.md**

```bash
body="$(sed -e '/^(Yes, this file also applies/,$d' AGENTS.md | sed -e '${/^$/d;}')"
mkdir -p .cursor/rules .windsurf/rules .clinerules .agents/rules .qoder/rules .github .kiro/steering
printf '%s\n' "$body" > .windsurf/rules/gellmann.md
printf '%s\n' "$body" > .clinerules/gellmann.md
printf '%s\n' "$body" > .agents/rules/gellmann.md
printf '%s\n' "$body" > .qoder/rules/gellmann.md
printf '%s\n' "$body" > .github/copilot-instructions.md
{ printf -- '---\ndescription: Gellmann, the expert reader. Verify every claim as a domain expert would.\nglobs:\nalwaysApply: true\n---\n\n'; printf '%s\n' "$body"; } > .cursor/rules/gellmann.mdc
{ printf -- '---\ntitle: Gellmann, the expert reader\ninclusion: always\n---\n\n'; printf '%s\n' "$body"; } > .kiro/steering/gellmann.md
```

- [ ] **Step 4: Run the check**

Run: `node scripts/check-rule-copies.js`
Expected: `Rule copies match AGENTS.md; 9 rule invariants present in SKILL.md and AGENTS.md.` If an invariant is missing from `skills/gellmann/SKILL.md`, fix the skill text, not the invariant.

- [ ] **Step 5: Commit**

```bash
git add .cursor .windsurf .clinerules .agents/rules .qoder .github/copilot-instructions.md .kiro scripts/check-rule-copies.js
git commit -m "feat: instruction-tier rule copies with drift check"
```

---

### Task 7: Plugin manifests and version check

**Files:**
- Create: `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, `.codex-plugin/plugin.json`, `.devin-plugin/plugin.json`, `.qoder-plugin/plugin.json`, `.github/plugin/plugin.json`, `.github/plugin/marketplace.json`, `.grok-plugin/marketplace.json`, `.agents/plugins/marketplace.json`, `plugin.json`, `gemini-extension.json`, `opencode.json`
- Create: `gellmann-mcp/package.json` (version-bearing; the server lands in Task 11)
- Port: `$PONY/scripts/check-versions.js` → `scripts/check-versions.js`
- Port tests: `$PONY/tests/gemini-extension.test.js`, `copilot-plugin.test.js`, `grok-plugin.test.js`, `qoder-plugin.test.js` → same names under `tests/` (`package.test.js` moves to Task 13, where `scripts/uninstall.js` lands)

- [ ] **Step 1: Port the tests and the version check**

`port` each of the four test files and `scripts/check-versions.js`. Edits:
- `tests/gemini-extension.test.js`: `REUSED_COMMANDS = ['commands/gellmann.toml', 'commands/gellmann-review.toml']`; `RULE_INVARIANTS = ['expert reader', 'Confidence is not proof', 'wet streets cause rain']`.
- Read each of `copilot-plugin`, `grok-plugin`, `qoder-plugin` after porting and fix any expectation that names a ponytail-only skill (`ponytail-audit`, `-debt`, `-gain`) to the five gellmann skills.
- `scripts/check-versions.js`: `VERSION_FILES` lists the eight files from Global Constraints with `gellmann-mcp/package.json`; update the header comment (drop the `#260/#262` history, keep the two-gap explanation).

- [ ] **Step 2: Run to verify failure**

Run: `node --test tests/gemini-extension.test.js tests/copilot-plugin.test.js tests/grok-plugin.test.js tests/qoder-plugin.test.js && node scripts/check-versions.js`
Expected: FAIL, manifests missing.

- [ ] **Step 3: Write the manifests**

Shared description string `D`: `"The expert reader for AI agents. Counters the Gell-Mann Amnesia effect: reads every output as a domain expert would, then verifies with the team (work) or with primary sources (solo)."`
Shared short string `S`: `"Reads AI output as a domain expert would. Verifies with your team or with primary sources."`
Shared keywords: `["verification", "fact-checking", "sources", "code-review", "gell-mann-amnesia"]`.

`.claude-plugin/plugin.json`:
```json
{
  "name": "gellmann",
  "version": "0.1.0",
  "description": D,
  "author": { "name": "Adam Tankanow", "url": "https://github.com/tankanow" },
  "hooks": "./hooks/claude-codex-hooks.json"
}
```

`.claude-plugin/marketplace.json`:
```json
{
  "$schema": "https://anthropic.com/claude-code/marketplace.schema.json",
  "name": "gellmann",
  "description": S,
  "owner": { "name": "Adam Tankanow", "url": "https://github.com/tankanow" },
  "plugins": [{ "name": "gellmann", "description": S, "source": "./", "category": "productivity" }]
}
```

`.codex-plugin/plugin.json`: port `$PONY/.codex-plugin/plugin.json`, set version `0.1.0`, description `D`, keywords as above, `interface.displayName: "Gellmann"`, `shortDescription: "The expert reader"`, `longDescription: "Read every AI output as the domain expert would, mark unverified claims, and verify with the team or with primary sources."`, `defaultPrompt: ["Review this like an expert in the field would.", "Which of these claims rest on a source I can open?", "Who on the team owns this and what should I ask them?"]`, `brandColor: "#1f3a5f"`, `composerIcon` and `logo`: `./assets/logo.svg`.

`.devin-plugin/plugin.json`, `.qoder-plugin/plugin.json`, `.github/plugin/plugin.json`, `.github/plugin/marketplace.json`, `.grok-plugin/marketplace.json`, `.agents/plugins/marketplace.json`, `plugin.json`: `port` each from `$PONY`, set version `0.1.0` where present, description `D` or `S` matching the ponytail slot, keywords/tags as above. The Copilot marketplace `tags` use the keyword list.

`gemini-extension.json`:
```json
{ "name": "gellmann", "version": "0.1.0", "description": D, "contextFileName": "AGENTS.md" }
```

`opencode.json`:
```json
{ "$schema": "https://opencode.ai/config.json", "plugin": ["./.opencode/plugins/gellmann.mjs"] }
```

`gellmann-mcp/package.json`:
```json
{
  "name": "gellmann-mcp",
  "version": "0.1.0",
  "description": "MCP server that serves Gellmann's expert-reader instructions as a prompt and a tool.",
  "private": true,
  "type": "module",
  "license": "MIT",
  "scripts": { "test": "node --test ./test/*.test.js" },
  "dependencies": { "@modelcontextprotocol/sdk": "^1.26.0", "zod": "^3.23.0" }
}
```

- [ ] **Step 4: Run the tests**

Run: `node --test tests/gemini-extension.test.js tests/copilot-plugin.test.js tests/grok-plugin.test.js tests/qoder-plugin.test.js && node scripts/check-versions.js`
Expected: PASS; `All 8 version files pinned at 0.1.0.`

- [ ] **Step 5: Commit**

```bash
git add .claude-plugin .codex-plugin .devin-plugin .qoder-plugin .github/plugin .grok-plugin .agents/plugins plugin.json gemini-extension.json opencode.json gellmann-mcp/package.json scripts/check-versions.js tests
git commit -m "feat: host plugin manifests and version consistency check"
```

---

### Task 8: OpenCode plugin

**Files:**
- Port: `$PONY/.opencode/plugins/ponytail.mjs` → `.opencode/plugins/gellmann.mjs`
- Port: `$PONY/.opencode/plugins/ponytail-frontmatter.cjs` → `.opencode/plugins/gellmann-frontmatter.cjs`
- Port: `$PONY/tests/opencode-plugin.test.js` → `tests/opencode-plugin.test.js`

- [ ] **Step 1: Port the test**

`port tests/opencode-plugin.test.js tests/opencode-plugin.test.js`. Mode mapping; the default-mode test must set `process.env.GELLMANN_DEFAULT_MODE = 'solo'` before import (detection would otherwise run against the gellmann repo) and assert `/GELLMANN MODE ACTIVE — mode: solo/` and `/expert reader/`. The "persists ultra" test becomes "persists work". Add:

```js
test('command.execute.before on gellmann-work / gellmann-solo switches the mode', async () => {
  const hooks = await loadPlugin({});
  await hooks['command.execute.before']({ command: 'gellmann-work', arguments: '', sessionID: 's' });
  assert.equal(fs.readFileSync(statePath, 'utf8'), 'work');
  await hooks['command.execute.before']({ command: 'gellmann-solo', arguments: '', sessionID: 's' });
  assert.equal(fs.readFileSync(statePath, 'utf8'), 'solo');
});
```

- [ ] **Step 2: Run to verify failure**

Run: `node --test tests/opencode-plugin.test.js`
Expected: FAIL, module not found.

- [ ] **Step 3: Port the plugin**

`port .opencode/plugins/ponytail.mjs .opencode/plugins/gellmann.mjs` and `port .opencode/plugins/ponytail-frontmatter.cjs .opencode/plugins/gellmann-frontmatter.cjs`. In `gellmann.mjs`, replace the `command.execute.before` handler:

```js
    'command.execute.before': async (input) => {
      if (!input) return;
      const persona = { 'gellmann-work': 'work', 'gellmann-solo': 'solo' }[input.command];
      if (persona) { writeMode(persona); log('info', 'gellmann ' + persona); return; }
      if (input.command !== 'gellmann') return;
      const args = String(input.arguments || '').trim();
      const mode = args ? normalizePersistedMode(args) : getDefaultMode();
      if (!mode) return;
      writeMode(mode);
      log('info', 'gellmann ' + mode);
    },
```

Header comment: install line becomes `{ "plugin": ["./.opencode/plugins/gellmann.mjs"] }` (checkout path; no npm).

- [ ] **Step 4: Run the test**

Run: `node --test tests/opencode-plugin.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add .opencode tests/opencode-plugin.test.js
git commit -m "feat: OpenCode plugin adapter"
```

---

### Task 9: pi extension

**Files:**
- Port: `$PONY/pi-extension/index.js`, `package.json`, `test/extension.test.js`, `test/helpers.test.js` → `pi-extension/`

- [ ] **Step 1: Port the tests**

`port` both test files. Edits to `extension.test.js`:
- Registered commands assertion: `["gellmann", "gellmann-help", "gellmann-review", "gellmann-solo", "gellmann-work"]`.
- Skill alias test: `gellmann-review`, `gellmann-help` send `/skill:gellmann-review`, `/skill:gellmann-help`; add that `gellmann-work` sends `/skill:gellmann-work` and appends a `gellmann-mode` entry `{ mode: "work" }`, and `gellmann-solo` likewise with `solo`.
- Deactivation test uses `"stop gellmann"`; the "mentioning normal mode stays active" test keeps the text `"add a normal mode toggle"` and asserts still active.
- Status bar regexes: `/○.*WORK/`, `/●.*WORK/`.
- Every `withTempConfig` block sets `process.env.GELLMANN_DEFAULT_MODE = "solo"` at the top (restore in `finally`) so detection does not run.
- `helpers.test.js`: read it after porting and map modes; if it tests `parsePonytailCommand("")` defaulting to `full`, the expectation becomes `solo`.

- [ ] **Step 2: Run to verify failure**

Run: `npm test --prefix pi-extension`
Expected: FAIL.

- [ ] **Step 3: Port the extension**

`port pi-extension/index.js pi-extension/index.js` and `port pi-extension/package.json pi-extension/package.json`. Edits:
- `parseGellmannCommand`: empty text → `{ type: "set-mode", mode: fallback === "off" ? "solo" : fallback }`.
- `const modeIcons = { work: "👥", solo: "📚" };` and the status label `"🔍 " + theme.fg("muted", "gellmann: ") + ...`.
- Replace the four skill alias `registerCommand` calls with:

```js
  const persona = (mode, ctx, args) => { setMode(mode, ctx); sendAlias(`/skill:gellmann-${mode}`, args, ctx); };
  pi.registerCommand("gellmann-work", { description: "Find owners and internal record; switch to work mode", handler: (args, ctx) => persona("work", ctx, args) });
  pi.registerCommand("gellmann-solo", { description: "Find primary sources; switch to solo mode", handler: (args, ctx) => persona("solo", ctx, args) });
  pi.registerCommand("gellmann-review", { description: "Run /skill:gellmann-review", handler: (args, ctx) => sendAlias("/skill:gellmann-review", args, ctx) });
  pi.registerCommand("gellmann-help", { description: "Run /skill:gellmann-help", handler: (_args, ctx) => sendAlias("/skill:gellmann-help", "", ctx) });
```

- [ ] **Step 4: Run the tests**

Run: `npm test --prefix pi-extension`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add pi-extension
git commit -m "feat: pi extension adapter"
```

---

### Task 10: Hermes plugin

**Files:**
- Port: `$PONY/__init__.py` → `__init__.py`, `$PONY/plugin.yaml` → `plugin.yaml`, `$PONY/after-install.md` → `after-install.md`
- Port: `$PONY/tests/hermes-plugin.test.js` → `tests/hermes-plugin.test.js`

- [ ] **Step 1: Port the test**

`port tests/hermes-plugin.test.js tests/hermes-plugin.test.js`. Edits: `commands = ['gellmann', 'gellmann-work', 'gellmann-solo', 'gellmann-review', 'gellmann-help']`; registered skills assertion lists the five; mode mapping (`ultra`→`work`, `lite`→`solo`); the review-mode assertion matches `/An expert would sign off/`; the injected-context test asserts `/expert reader/` and `assert.doesNotMatch(ctx, /\|\s*\*\*solo\*\*/i)` when mode is `work`. Every python() call that reaches `_default_mode()` passes `GELLMANN_DEFAULT_MODE` in env. Add a test that `ctx.commands['gellmann-work']('')` sets the mode so a following `pre_llm_call` context matches `/mode: work/`.

- [ ] **Step 2: Run to verify failure**

Run: `node --test tests/hermes-plugin.test.js`
Expected: FAIL.

- [ ] **Step 3: Port the plugin**

`port __init__.py __init__.py`. Edits:

```python
DEFAULT_MODE = "solo"
RUNTIME_MODES = {"off", "work", "solo"}
CONFIG_MODES = RUNTIME_MODES | {"review"}
SKILL_COMMANDS = {
    "gellmann-work": "Find the teammates and internal record that own this domain; draft the questions.",
    "gellmann-solo": "Find canonical primary sources for this domain; cite or say could-not-verify.",
    "gellmann-review": "Expert review of an output: facts, sources, logic, framing, hidden assumptions.",
    "gellmann-help": "Show the Gellmann command reference.",
}
PERSONA_COMMANDS = {"gellmann-work": "work", "gellmann-solo": "solo"}
```

Add detection and wire it into `_default_mode()` after the config-file step:

```python
CODEOWNERS_PATHS = ("CODEOWNERS", ".github/CODEOWNERS", "docs/CODEOWNERS")


def _detect_mode(cwd: str | None = None) -> str:
    """work if the repo shows teammates (CODEOWNERS or 2+ authors), else solo."""
    root = Path(cwd or os.getcwd())
    try:
        if any((root / rel).exists() for rel in CODEOWNERS_PATHS):
            return "work"
        out = subprocess.run(
            ["git", "log", "--format=%aE", "-n", "200"],
            cwd=root, capture_output=True, text=True, timeout=2, check=False,
        ).stdout
        authors = {line.strip().lower() for line in out.splitlines() if line.strip()}
        if len(authors) >= 2:
            return "work"
    except Exception:
        pass
    return "solo"
```

(`import subprocess` at the top.) `_default_mode()` returns `_detect_mode()` instead of `DEFAULT_MODE` at the end.

`_fallback_instructions` returns the compact ruleset (AGENTS.md body minus H1 and parenthetical) under the header `GELLMANN MODE ACTIVE — mode: {mode}`. All `level:` → `mode:`.

`_make_skill_command_handler`: before building the prompt, `if command in PERSONA_COMMANDS: global _current_mode; _current_mode = PERSONA_COMMANDS[command]` (declare `global` at the top of the inner `handler`).

`_handle_mode_command` usage strings: `/gellmann work|solo|off`.

`plugin.yaml`:
```yaml
name: gellmann
version: 0.1.0
description: The expert reader for Hermes Agent, always-on context, bundled skills, and slash commands.
author: Adam Tankanow
provides_hooks:
  - pre_llm_call
  - pre_gateway_dispatch
provides_commands:
  - gellmann
  - gellmann-work
  - gellmann-solo
  - gellmann-review
  - gellmann-help
provides_skills:
  - gellmann
  - gellmann-work
  - gellmann-solo
  - gellmann-review
  - gellmann-help
```

`after-install.md`: port and list the five commands and five `gellmann:<skill>` names.

- [ ] **Step 4: Run the test**

Run: `node --test tests/hermes-plugin.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add __init__.py plugin.yaml after-install.md tests/hermes-plugin.test.js
git commit -m "feat: Hermes Agent plugin adapter"
```

---

### Task 11: MCP server

**Files:**
- Port: `$PONY/ponytail-mcp/index.js`, `instructions.js`, `README.md`, `test/instructions.test.js` → `gellmann-mcp/`
- Modify: `gellmann-mcp/package.json` (exists from Task 7)

- [ ] **Step 1: Port the test**

`port ponytail-mcp/test/instructions.test.js gellmann-mcp/test/instructions.test.js`. Modes: `MODES` deep-equals `["work", "solo"]`; `resolveMode("off")` and `resolveMode(undefined)` with `GELLMANN_DEFAULT_MODE=solo` → `"solo"`; `resolveMode("ultra")` → the default; `buildInstructions("work")` matches `/mode: work/`.

- [ ] **Step 2: Install deps and run to verify failure**

Run: `npm install --prefix gellmann-mcp && npm test --prefix gellmann-mcp`
Expected: FAIL, module not found.

- [ ] **Step 3: Port the server**

`port` `index.js`, `instructions.js`, `README.md`. In `instructions.js`: `export const MODES = ["work", "solo"];`, fallback `"solo"`. In `index.js`: prompt title `"Gellmann mode"`, description `"Expert-reader instructions: mark unverified claims, verify with the team (work) or primary sources (solo)."`, tool name `gellmann_instructions`, argument description `"Gellmann mode: work or solo. Omit for the configured default."`. README: the install snippet points at `gellmann-mcp/index.js`; drop the `#70` reference.

- [ ] **Step 4: Run the test**

Run: `npm test --prefix gellmann-mcp`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add gellmann-mcp
git commit -m "feat: MCP server serving the gellmann instructions"
```

---

### Task 12: OpenClaw skill package

**Files:**
- Port: `$PONY/scripts/build-openclaw-skills.js` → `scripts/build-openclaw-skills.js`
- Port: `$PONY/tests/openclaw-skills.test.js` → `tests/openclaw-skills.test.js`
- Generate: `.openclaw/skills/*/SKILL.md`

- [ ] **Step 1: Port test and generator**

`port` both. `DESCRIPTIONS` in the generator:

```js
const DESCRIPTIONS = {
  'gellmann': 'Read AI output as a domain expert would: mark unverified claims, then verify with the team (work) or primary sources (solo). Any output with claims.',
  'gellmann-work': 'Find the teammates and internal record that own this domain: CODEOWNERS, git blame, ADRs, wikis, Slack. Drafts the questions; never sends.',
  'gellmann-solo': 'Find canonical primary sources for a claim: spec, RFC, official docs for the exact version, upstream source. Cite or say could not verify.',
  'gellmann-review': 'Expert review of an AI output: wrong or unsourced facts, fake citations, reversed causality, hidden assumptions. One line per finding.',
  'gellmann-help': "Quick reference for gellmann's modes, skills, and commands. One-shot display.",
};
```

- [ ] **Step 2: Run to verify failure, then generate**

Run: `node --test tests/openclaw-skills.test.js` → FAIL (files missing). Then `node scripts/build-openclaw-skills.js`.

- [ ] **Step 3: Run the test**

Run: `node --test tests/openclaw-skills.test.js`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add scripts/build-openclaw-skills.js tests/openclaw-skills.test.js .openclaw
git commit -m "feat: generated OpenClaw skill package"
```

---

### Task 13: Uninstall script

**Files:**
- Port: `$PONY/scripts/uninstall.js` → `scripts/uninstall.js`
- Port: `$PONY/tests/uninstall.test.js` → `tests/uninstall.test.js`
- Port: `$PONY/tests/package.test.js` → `tests/package.test.js`, adding an assertion `pkg.private === true` with the message "no npm publish; GitHub-only distribution"

- [ ] **Step 1: Port tests, run to verify failure**

`port tests/uninstall.test.js tests/uninstall.test.js` and `port tests/package.test.js tests/package.test.js` (add the `private` assertion). Run `node --test tests/uninstall.test.js tests/package.test.js` → FAIL (uninstall.js missing).

- [ ] **Step 2: Port the script**

`port scripts/uninstall.js scripts/uninstall.js`. `STATUSLINE_SCRIPT = 'gellmann-statusline'`. Rename covers the rest.

- [ ] **Step 3: Run the full suite**

Run: `npm test && node scripts/check-rule-copies.js && node scripts/check-versions.js`
Expected: PASS across `tests/`, `pi-extension`, `gellmann-mcp`.

- [ ] **Step 4: Commit**

```bash
git add scripts/uninstall.js tests/uninstall.test.js tests/package.test.js
git commit -m "feat: uninstall script for state outside the plugin"
```

---

### Task 14: CI workflows

**Files:**
- Create: `.github/workflows/test.yml`, `.github/workflows/release.yml`

- [ ] **Step 1: test.yml**

```yaml
name: test

on:
  push:
    branches: [main]
    tags: ['v*']
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      - name: Install MCP deps
        run: npm install --prefix gellmann-mcp
      - name: Check rule copies
        run: node scripts/check-rule-copies.js
      - name: Check version consistency
        run: node scripts/check-versions.js
      - name: Run tests
        run: npm test
```

- [ ] **Step 2: release.yml**

```yaml
name: release

on:
  push:
    tags: ['v*']

permissions:
  contents: write

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      # The tag must equal the version every manifest declares.
      - run: node scripts/check-versions.js
      - run: gh release create "$GITHUB_REF_NAME" --generate-notes --verify-tag
        env:
          GH_TOKEN: ${{ github.token }}
```

- [ ] **Step 3: Validate YAML parses**

Run: `python3 -c "import yaml,sys; [yaml.safe_load(open(f)) for f in ['.github/workflows/test.yml','.github/workflows/release.yml']]; print('ok')"` (if PyYAML is missing: `uv run --with pyyaml python -c ...`).
Expected: `ok`.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows
git commit -m "ci: test on push and PR, GitHub release on tag"
```

---

### Task 15: Documentation, examples, logo, README

**Files:**
- Port: `$PONY/docs/agent-portability.md` → `docs/agent-portability.md`
- Create: `docs/where-truth-lives.md`, `examples/README.md`, `examples/dict-ordering.md`, `examples/redirect-method.md`, `examples/serializable.md`, `examples/jwt-alg-none.md`, `assets/logo.svg`, `README.md`

- [ ] **Step 1: docs/agent-portability.md**

`port docs/agent-portability.md docs/agent-portability.md`. Replace the "Portable Behavior" list with the five skills and their one-line purposes; drop ClawHub and npm mentions from the OpenClaw and OpenCode rows ("copy `.openclaw/skills/gellmann` into `~/.openclaw/skills/`"; OpenCode installs from a checkout path).

- [ ] **Step 2: docs/where-truth-lives.md**

```markdown
# Where the Truth Lives

The expert reader's first question is always: *where is this actually written down?*

Solo mode needs a canonical primary source before it can settle a claim. This table names them for common domains, and names the secondary sources that feel authoritative but do not settle anything. A secondary source counts only when it is a published critique of a named primary (an erratum, a peer-reviewed reply, a maintainer's postmortem, a CVE against a specified behavior).

Always pin the version first. A fact about "Postgres" is not a fact about Postgres 16.3.

| Domain | Primary sources (settle a claim) | Feels authoritative, does not settle |
|---|---|---|
| Python language and stdlib | docs.python.org for the exact minor version; PEPs (peps.python.org); CPython source and `Lib/test`; "What's New in Python 3.x" | Real Python, Stack Overflow, tutorials, library READMEs restating stdlib behavior |
| Node.js and JavaScript | nodejs.org/api for the exact major; ECMA-262 (tc39.es/ecma262); MDN for web APIs is a W3C/WHATWG-tracked reference, cite the spec it links; V8 blog for engine behavior | npm package READMEs about platform behavior, blog posts, "JavaScript: The Good Parts" |
| Go | go.dev/ref/spec; pkg.go.dev for the exact module version; Go release notes; proposals in golang/go issues | Effective Go is guidance not spec; Medium posts |
| Rust | The Reference (doc.rust-lang.org/reference); std docs for the exact toolchain; RFCs (rust-lang/rfcs); release notes | The Book is a tutorial; forum threads |
| HTTP, URLs, web standards | RFC 9110–9114 (HTTP semantics, caching, /1.1, /2, /3); WHATWG URL, Fetch, HTML living standards; W3C recommendations; IANA registries | MDN prose summaries, caniuse for support (fine for support, not for semantics) |
| Security and crypto | The RFC or NIST SP (e.g. RFC 8725 JWT BCP, NIST SP 800-63B); OWASP Cheat Sheet Series (primary for OWASP's own recommendation, not for the underlying math); CVE/NVD records; the library's own security advisories | Blog posts explaining an attack, conference talks, "X is insecure" tweets |
| AWS | The service's Developer Guide and API Reference for the region and date; service quotas page; official SDK source; AWS What's New for launch dates | re:Post answers, Medium architecture posts, third-party pricing calculators |
| Kubernetes | kubernetes.io/docs for the exact minor; KEPs (kubernetes/enhancements); API reference; kubernetes/kubernetes source | Helm chart READMEs, vendor distributions' docs when the claim is about upstream |
| PostgreSQL | postgresql.org/docs/<major>; release notes; the source (`src/backend`); pgsql-hackers threads for intent | ORM docs describing database behavior, Stack Overflow, "use the index Luke" (excellent, still secondary) |
| Git | git-scm.com/docs (the man pages) for the installed version; git source; release notes | Pro Git book (tutorial), cheat sheets, blog posts |
| Statistics and data science | The original paper; the method's reference implementation and its docs (e.g. scipy.stats for the exact version); textbook only when it is the canonical reference the field cites | Towards Data Science, Cross Validated answers, the model's memory of a formula |
| Law and regulation | The statute, regulation, or ruling as published by the issuing body (eCFR, EUR-Lex, the court); the regulator's own guidance | Law-firm client alerts, compliance-vendor summaries, Wikipedia |
| Medicine and health | Peer-reviewed primary studies and systematic reviews; the regulator's label (FDA, EMA); clinical guidelines from the issuing society | Health-news articles, vendor whitepapers, forum posts |
| An internal system | Its source, its tests, its ADRs, its runbook, and the people in CODEOWNERS (work mode) | Another team's wiki page about it, a Slack message from a year ago, your memory of a meeting |

## The pattern

```
Someone wrote the canonical text.
Someone else summarized it, slightly wrong.
The model read the summary.
You read the model.
```

Go back up the chain. Open the canonical text. Quote the sentence.

## When there is no primary source

Some claims have no canonical document: a judgement call, an estimate, a prediction, "best practice" in a field without a standards body. Say so. Mark the claim as a hypothesis, name whose judgement it rests on, and name what evidence would move it. That is more useful than a secondary source dressed as a citation.
```

- [ ] **Step 3: examples/**

`examples/README.md`:
```markdown
# Examples

Each example is a real class of AI output that read fine to a non-expert, the
line an expert would have caught, and the primary source that settles it.
The point is not that the model is often wrong. It is that when it is wrong in
a field you do not know, nothing in the prose tells you.

| Example | The claim that read fine | What settles it |
|---|---|---|
| [dict-ordering.md](dict-ordering.md) | "Python dicts are unordered, so sort the keys first" | docs.python.org, Mapping Types, "Changed in version 3.7" |
| [redirect-method.md](redirect-method.md) | "Return 301 so the client retries the POST at the new URL" | RFC 9110 §15.4.2 vs §15.4.9 |
| [serializable.md](serializable.md) | "SERIALIZABLE isolation prevents this double-insert" | PostgreSQL docs §13.2.3 |
| [jwt-alg-none.md](jwt-alg-none.md) | "The library rejects alg: none by default" | RFC 8725 §3.1 and the library's own changelog |
```

`examples/dict-ordering.md`:
```markdown
# "Python dicts are unordered"

**The output:** a helper that sorts `dict.keys()` before serializing "because
dict ordering is not guaranteed in Python."

**What a Python expert winces at:** that was true through 3.6 (an
implementation detail in CPython 3.6, unspecified before). Since 3.7,
insertion order is part of the language. The sort is not wrong, but the
reason is, and the reason will get copied into the next place where order
actually matters.

**Gellmann (solo):**

```
"dict ordering is not guaranteed"
  Source: docs.python.org/3/library/stdtypes.html#mapping-types-dict — "Changed in version 3.7: Dictionary order is guaranteed to be insertion order."
  Status: refuted for the pinned runtime (3.12); true only below 3.7
```

**Gellmann (work):**

```
Ask: @platform (CODEOWNERS for tooling/) — Q: do we still support any 3.6 runtime that would justify sorting here?
```

**Tag:** `fact:` a version-specific fact stated as timeless.
```

`examples/redirect-method.md`:
```markdown
# "301 preserves the method"

**The output:** an API migration note saying "return 301 Moved Permanently
from the old endpoint; clients will retry the POST at the new URL."

**What an HTTP expert winces at:** RFC 9110 permits a user agent to change
POST to GET on a 301 (and historically most do). 308 Permanent Redirect
exists precisely to forbid that. The migration would silently turn writes
into reads.

**Gellmann (solo):**

```
"clients will retry the POST at the new URL after a 301"
  Source: RFC 9110 §15.4.2 — "a user agent MAY change the request method from POST to GET for the subsequent request"; §15.4.9 (308) — "the user agent MUST NOT change the request method"
  Status: refuted; use 308
```

**Tag:** `fact:` the confident default; `logic:` the plan rests on it.
```

`examples/serializable.md`:
```markdown
# "SERIALIZABLE prevents the race"

**The output:** a PR description: "switched the transaction to SERIALIZABLE
so the double-insert can no longer happen."

**What a Postgres expert winces at:** SERIALIZABLE in PostgreSQL is
Serializable Snapshot Isolation. It detects the anomaly and aborts one
transaction with SQLSTATE 40001; it does not block or make the second insert
wait. Without a retry loop in the caller, the race becomes a 500.

**Gellmann (solo):**

```
"SERIALIZABLE means the double-insert can no longer happen"
  Source: postgresql.org/docs/16/transaction-iso.html §13.2.3 — applications using this level "must be prepared to retry transactions due to serialization failures"
  Status: narrower than stated; the anomaly is detected, not prevented; the diff has no retry
```

**Gellmann (work):**

```
Ask: the author of ADR-014 (git log docs/adr/) — Q: READ COMMITTED was chosen for orders/ deliberately; does this PR revisit that decision or work around it?
```

**Tag:** `fact:` overstated; `hidden:` the retry requirement.
```

`examples/jwt-alg-none.md`:
```markdown
# "The library rejects alg: none"

**The output:** a security review note: "our JWT library rejects `alg: none`
by default, so the unsigned-token attack does not apply."

**What a security expert winces at:** whether `none` is rejected depends on
the library and the version, and on whether the caller pinned the allowed
algorithms. The best-current-practice RFC exists because libraries got this
wrong. "By default" is the claim that needs a source.

**Gellmann (solo):**

```
"the library rejects alg: none by default"
  Source: RFC 8725 §3.1 — libraries MUST let the caller specify the allowed algorithms and MUST NOT use any other; pin the set rather than rely on a default
  Source: <library> changelog for the pinned version — unopened; the claim is settled only by the release notes or a test in the library's suite
  Status: could not verify as stated; verify the pinned version, and pin the algorithm list regardless
```

**Tag:** `fact:` library- and version-specific claim stated as universal; `source:` none given.
```

- [ ] **Step 4: assets/logo.svg**

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="480" height="120" viewBox="0 0 480 120" role="img" aria-label="Gellmann">
  <rect width="480" height="120" rx="16" fill="#1f3a5f"/>
  <text x="32" y="78" font-family="Georgia, 'Times New Roman', serif" font-size="56" fill="#f5f1e8">Gellmann</text>
  <text x="300" y="78" font-family="Georgia, serif" font-size="56" fill="#f5f1e8" opacity="0.35">§</text>
</svg>
```

- [ ] **Step 5: README.md**

Structure and section order copy ponytail's README. Content:

```markdown
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

(Copy ponytail's Install section verbatim in structure, host by host, with these substitutions: `DietrichGebert/ponytail` → `tankanow/gellmann`; `ponytail@ponytail` → `gellmann@gellmann`; command names → `/gellmann`, `/gellmann-work`, `/gellmann-solo`, `/gellmann-review`, `/gellmann-help`; drop the npm OpenCode line and keep only the checkout form `{ "plugin": ["./.opencode/plugins/gellmann.mjs"] }`; OpenClaw: "copy `.openclaw/skills/gellmann` into `~/.openclaw/skills/`" (no ClawHub); env var `GELLMANN_DEFAULT_MODE` (`work`/`solo`/`off`); config `~/.config/gellmann/config.json`; subagent matcher `GELLMANN_SUBAGENT_MATCHER`; statusline badge `[GELLMANN:WORK]` / `[GELLMANN:SOLO]`. Add one sentence at the top of the section: "Hermes, Grok Build, Devin, Qoder, Swival, and Antigravity install paths are carried over from ponytail's adapters and have not yet been exercised against those hosts by this project; the Claude Code, Codex, Copilot CLI, Gemini CLI, OpenCode, and pi paths are covered by the test suite.")

### Uninstall

(Port ponytail's Uninstall table and the `node scripts/uninstall.js` paragraph with renames.)

## Commands

| Command | What it does |
|---|---|
| `/gellmann [work \| solo \| off]` | Set the mode, or turn it off. No argument reports the current mode. `/gellmann default <mode>` persists it. |
| `/gellmann-work [topic]` | Find the teammates and internal record that own this domain; draft the questions. Switches to work. |
| `/gellmann-solo [topic]` | Find canonical primary sources; cite or say could-not-verify. Switches to solo. |
| `/gellmann-review [target]` | Expert review of an output, one line per finding, ending in `N claims need a source or a human.` |
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
```

The "(Copy ponytail's Install section ...)" and "(Port ponytail's Uninstall ...)" parentheticals are instructions to the implementer, not README text: expand them into the real sections by porting `$PONY/README.md` lines 170–336 with the listed substitutions.

- [ ] **Step 6: Final full run**

Run: `node scripts/check-rule-copies.js && node scripts/check-versions.js && npm test`
Expected: all PASS.

- [ ] **Step 7: Commit**

```bash
git add docs examples assets README.md
git commit -m "docs: README, agent portability, where truth lives, examples"
```

---

## Self-review

**Spec coverage:** §3.1 lens → Task 1 (AGENTS.md), Task 2 (SKILL.md). §3.2 modes and auto-detect → Tasks 2, 3, 4. §3.3 skills → Tasks 2, 5. §3.4 commands → Task 5. §4 layout → Tasks 1–15 (benchmarks, translations, npm publish, ClawHub publish, FUNDING skipped as specified). §5 shared modules → Tasks 2, 4, 8–11. §6 CI → Task 14. §7 testing → each task; invariants in Task 6; detect tests in Task 3; "normal mode" non-deactivation in Task 4. §8 docs → Task 15. §10 open items → README sentence in Task 15 and the user's `origin` setup, which is not a repo task.

**Placeholders:** none; the README Install/Uninstall sections are specified as a port with an explicit substitution list and source line range.

**Name consistency:** `getGellmannInstructions`, `filterSkillBodyForMode`, `detectMode`, `hasCodeowners`, `authorCount`, `getDefaultMode(cwd)`, `isDeactivationCommand`, `normalizePersistedMode`, `writeDefaultMode`, `readMode`/`setMode`/`clearMode`, `writeHookOutput` are used identically across Tasks 2–11.
