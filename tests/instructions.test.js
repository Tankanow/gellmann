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
