#!/usr/bin/env node
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const { detectMode, hasCodeowners, authorCount } = require('../hooks/gellmann-detect');
const { getDefaultMode } = require('../hooks/gellmann-config');

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
