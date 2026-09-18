#!/usr/bin/env node
// The dev/release version scheme. Two forms share one base:
//   release  X.Y.Z                    what a v-tag ships
//   dev      X.Y.Z-YYYYMMDDTHHMMSSZ   every install-worthy change
// A dev stamp exists because Claude Code keys its install cache on the version
// string; see scripts/version-files.js.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const V = require('../scripts/version-files');

test('devStamp is UTC ISO 8601 basic, second precision, no colons', () => {
  const stamp = V.devStamp(new Date('2026-09-14T10:44:55.123Z'));
  assert.equal(stamp, '20260914T104455Z');
  assert.match(stamp, V.DEV_STAMP);
  // Colons would collide on the install cache path (the CLI sanitizes them to
  // hyphens) and are illegal in Windows filenames.
  assert.ok(!stamp.includes(':'));
});

test('dev stamps sort lexically in chronological order', () => {
  const a = V.devStamp(new Date('2026-09-14T10:44:55Z'));
  const b = V.devStamp(new Date('2026-09-14T11:30:00Z'));
  const c = V.devStamp(new Date('2026-10-01T00:00:00Z'));
  assert.deepEqual([c, a, b].sort(), [a, b, c]);
});

test('parseVersion splits both forms and rejects junk', () => {
  assert.deepEqual(V.parseVersion('0.2.0'), { base: '0.2.0', prerelease: null });
  assert.deepEqual(V.parseVersion('0.2.0-20260914T104455Z'),
    { base: '0.2.0', prerelease: '20260914T104455Z' });
  for (const bad of ['', 'v0.2.0', '0.2', 'latest', undefined]) {
    assert.equal(V.parseVersion(bad), null, `should reject ${JSON.stringify(bad)}`);
  }
});

test('RELEASE_SEMVER accepts only the bare form', () => {
  assert.match('0.2.0', V.RELEASE_SEMVER);
  assert.doesNotMatch('0.2.0-20260914T104455Z', V.RELEASE_SEMVER);
});

// The bug this catches: plugin.yaml and the MCP lockfile both declared the
// version while sitting outside the guard's file list, so they could drift
// silently. Any new version-bearing file must be added to ALL_FILES.
test('ALL_FILES covers every file in the repo that declares a version', () => {
  const tracked = execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' })
    .split('\n').filter(Boolean).filter((f) => !f.includes('node_modules'));

  const found = [];
  for (const rel of tracked) {
    if (/\.json$/.test(rel)) {
      let parsed;
      try { parsed = JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8').replace(/^﻿/, '')); }
      catch { continue; }
      // A project version is X.Y.Z-shaped; hooks/*.json carry a schema version
      // of 1, which is not this.
      if (typeof parsed.version === 'string' && /^\d+\.\d+\.\d+/.test(parsed.version)) found.push(rel);
    } else if (/\.ya?ml$/.test(rel)) {
      const m = fs.readFileSync(path.join(root, rel), 'utf8').match(/^version:\s*(\S+)\s*$/m);
      if (m && /^\d+\.\d+\.\d+/.test(m[1])) found.push(rel);
    }
  }

  const missing = found.filter((f) => !V.ALL_FILES.includes(f));
  assert.deepEqual(missing, [],
    `these files declare a version but are not in scripts/version-files.js ALL_FILES: ${missing.join(', ')}`);
});

test('every guarded file currently reads one shared, well-formed version', () => {
  const versions = V.ALL_FILES.map((f) => V.readVersion(f));
  assert.equal(new Set(versions).size, 1, `versions disagree: ${JSON.stringify(versions)}`);
  const parsed = V.parseVersion(versions[0]);
  assert.ok(parsed, `unparseable version ${versions[0]}`);
  if (parsed.prerelease) assert.match(parsed.prerelease, V.DEV_STAMP);
});

// The strict half of the scheme: a dev stamp is fine on a branch, forbidden on
// a release tag. Run the guard as a subprocess so the real env rules apply.
function runGuard(env) {
  try {
    return { code: 0, out: execFileSync('node', ['scripts/check-versions.js'],
      { cwd: root, encoding: 'utf8', env: { ...process.env, ...env } }) };
  } catch (e) {
    return { code: e.status, out: (e.stdout || '') + (e.stderr || '') };
  }
}

test('guard passes on a branch regardless of form', () => {
  const { code } = runGuard({ GITHUB_REF_TYPE: '', GITHUB_REF_NAME: '' });
  assert.equal(code, 0);
});

test('guard rejects a release tag whose version carries a dev stamp', () => {
  const current = V.readVersion(V.ALL_FILES[0]);
  const parsed = V.parseVersion(current);
  if (parsed.prerelease) {
    // Repo is on a dev stamp: tagging it must fail.
    const { code, out } = runGuard({ GITHUB_REF_TYPE: 'tag', GITHUB_REF_NAME: `v${parsed.base}` });
    assert.equal(code, 1);
    assert.match(out, /bump-version\.js --release/);
  } else {
    // Repo is on a release: a mismatched tag must still fail.
    const { code, out } = runGuard({ GITHUB_REF_TYPE: 'tag', GITHUB_REF_NAME: 'v99.99.99' });
    assert.equal(code, 1);
    assert.match(out, /does not match version/);
  }
});

test('bump-version --print reports the shared version and changes nothing', () => {
  const before = V.ALL_FILES.map((f) => V.readVersion(f));
  const out = execFileSync('node', ['scripts/bump-version.js', '--print'],
    { cwd: root, encoding: 'utf8' }).trim();
  assert.equal(out, before[0]);
  assert.deepEqual(V.ALL_FILES.map((f) => V.readVersion(f)), before);
});

test('bump-version rejects a version argument that already carries a stamp', () => {
  try {
    execFileSync('node', ['scripts/bump-version.js', '0.2.0-20260914T104455Z'],
      { cwd: root, encoding: 'utf8', stdio: 'pipe' });
    assert.fail('should have exited non-zero');
  } catch (e) {
    assert.equal(e.status, 2);
    assert.match(e.stderr, /must be a bare X\.Y\.Z/);
  }
});
