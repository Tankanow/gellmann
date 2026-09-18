#!/usr/bin/env node
// Grok Build loads Gellmann through its native skill system. Lifecycle-hook
// stdout is passive in Grok, so this adapter must not register any hooks.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

test('Grok manifest is a skill-only adapter with no lifecycle hooks', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'plugin.json'), 'utf8'));
  assert.equal(manifest.name, 'gellmann');
  assert.equal(manifest.hooks, undefined);
  assert.equal(manifest.mcpServers, undefined);
  assert.ok(!fs.existsSync(path.join(root, 'hooks', 'hooks.json')));
  assert.ok(!fs.existsSync(path.join(root, '.grok-plugin', 'hooks.json')));
});

test('Gellmann skill describes every claim-making output for Grok auto-invocation', () => {
  const skill = fs.readFileSync(path.join(root, 'skills', 'gellmann', 'SKILL.md'), 'utf8');
  assert.match(skill, /Use on ANY\s+output that makes\s+claims/i);
  assert.match(skill, /code, docs, analyses, answers, plans, reviews, summaries/i);
  assert.doesNotMatch(skill, /disable-model-invocation:\s*true/i);
});
