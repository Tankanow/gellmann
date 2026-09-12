#!/usr/bin/env node
// Structural check on the eval suite. `claude plugin eval` only reports a bad
// case file once you pay for a run, so the schema is asserted here for free.
// Key lists come from the CLI's own validator (claude 2.1.269).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const evalsDir = path.join(root, 'evals');

const CASE_KEYS = new Set(['schema_version', 'name', 'description', 'tags', 'plugins',
  'runs', 'expected_outcome', 'model', 'max_turns', 'timeout_seconds', 'allowed_tools',
  'artifact_publish', 'growthbook_overrides', 'append_system_prompt', 'env']);
// type, weight, name and arm are confirmed against the CLI's validator; tool is
// confirmed required for tool_used. The rest are the plausible per-type keys for
// grader types this suite does not use yet -- listed permissively so an unused
// type does not fail here, since the CLI is the real authority on those.
const GRADER_KEYS = new Set(['type', 'weight', 'name', 'arm', 'tool', 'tools', 'order', 'path']);
const GRADER_TYPES = new Set(['regex', 'tool_order', 'tool_used', 'file_exists', 'llm', 'baseline']);
const ARMS = new Set(['with-only', 'both']);

// Top-level `key: value` lines only; nested list/map lines start with whitespace or '-'.
function frontmatterKeys(text) {
  const m = text.replace(/\r\n/g, '\n').match(/^---\n([\s\S]*?)\n---/);
  assert.ok(m, 'file has no frontmatter');
  return m[1].split('\n')
    .filter((l) => /^[A-Za-z_][A-Za-z0-9_]*\s*:/.test(l))
    .map((l) => [l.slice(0, l.indexOf(':')).trim(), l.slice(l.indexOf(':') + 1).trim()]);
}

// `results/` and `mocks/` are harness directories, not cases.
const NOT_CASES = new Set(['results', 'mocks']);
const cases = fs.readdirSync(evalsDir, { withFileTypes: true })
  .filter((d) => d.isDirectory() && !NOT_CASES.has(d.name)).map((d) => d.name).sort();

test('the eval suite has cases', () => assert.ok(cases.length > 0));

for (const name of cases) {
  test(`eval case ${name} is well formed`, () => {
    const dir = path.join(evalsDir, name);
    const promptPath = path.join(dir, 'prompt.md');
    assert.ok(fs.existsSync(promptPath), `missing evals/${name}/prompt.md`);

    for (const [key] of frontmatterKeys(fs.readFileSync(promptPath, 'utf8'))) {
      assert.ok(CASE_KEYS.has(key), `evals/${name}/prompt.md: unknown frontmatter key "${key}"`);
    }

    const graderDir = path.join(dir, 'graders');
    assert.ok(fs.existsSync(graderDir), `missing evals/${name}/graders/`);
    const graders = fs.readdirSync(graderDir).filter((f) => f.endsWith('.md'));
    assert.ok(graders.length > 0, `evals/${name}/graders/ is empty`);

    for (const g of graders) {
      const entries = frontmatterKeys(fs.readFileSync(path.join(graderDir, g), 'utf8'));
      const fm = Object.fromEntries(entries);
      for (const [key] of entries) {
        assert.ok(GRADER_KEYS.has(key), `evals/${name}/graders/${g}: unknown key "${key}"`);
      }
      assert.ok(GRADER_TYPES.has(fm.type), `evals/${name}/graders/${g}: bad type "${fm.type}"`);
      if (fm.arm) assert.ok(ARMS.has(fm.arm), `evals/${name}/graders/${g}: bad arm "${fm.arm}"`);
      if (fm.type === 'tool_used') assert.ok(fm.tool, `evals/${name}/graders/${g}: tool_used needs tool:`);
    }
  });
}

// The two cases that pin the Session 2 failure must not be deleted quietly.
test('the regression cases that motivated the briefing contract are present', () => {
  for (const required of ['briefing-not-verdict', 'no-tool-domain', 'no-invented-experts']) {
    assert.ok(cases.includes(required), `evals/${required}/ is missing`);
  }
});
