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
