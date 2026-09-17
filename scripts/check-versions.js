#!/usr/bin/env node
// Version-consistency guard. Gellmann declares its version in ten files across
// six host ecosystems, and every bump moves all of them together.
//
// tests/gemini-extension.test.js already checks the plugin manifests agree with
// each other, but that can't catch every manifest staying stale together while
// a release moves on — they'd "agree" and the test would pass. It also ignores
// the package.json files, plugin.yaml, and the MCP lockfile. This check closes
// those gaps:
//   1. every version-bearing file must share one version,
//   2. that version must be X.Y.Z or X.Y.Z-YYYYMMDDTHHMMSSZ, and
//   3. on a release-tag CI run it must be the bare X.Y.Z form, equal to the tag.
//
// Rule 3 is the strict one: a dev stamp is fine on a branch and forbidden on a
// release. See scripts/version-files.js for the scheme and why it exists.

const {
  ALL_FILES, RELEASE_SEMVER, DEV_STAMP, readVersion, parseVersion,
} = require('./version-files');

let failed = false;

const versions = ALL_FILES.map((relPath) => {
  const version = readVersion(relPath);
  const parsed = typeof version === 'string' ? parseVersion(version) : null;
  if (!parsed) {
    console.error(`${relPath}: version must be X.Y.Z or X.Y.Z-<stamp>, got ${JSON.stringify(version)}`);
    failed = true;
  } else if (parsed.prerelease && !DEV_STAMP.test(parsed.prerelease)) {
    console.error(`${relPath}: prerelease must be a UTC stamp YYYYMMDDTHHMMSSZ, got ${JSON.stringify(parsed.prerelease)}`);
    failed = true;
  }
  return [relPath, version];
});

// Every file must declare the same version.
const distinct = [...new Set(versions.map(([, v]) => v))];
if (distinct.length > 1) {
  console.error('Version mismatch — every manifest must share one version:');
  for (const [relPath, version] of versions) console.error(`  ${version}\t${relPath}`);
  console.error('Run: node scripts/bump-version.js <X.Y.Z> [--dev]');
  failed = true;
}
const shared = distinct.length === 1 ? distinct[0] : null;

// On a release-tag push CI sets GITHUB_REF_TYPE=tag and GITHUB_REF_NAME=vX.Y.Z.
// A tagged release must be a release version — no dev stamp — and must match
// the tag. Mutual agreement alone catches neither.
if (shared && process.env.GITHUB_REF_TYPE === 'tag') {
  const tag = process.env.GITHUB_REF_NAME || '';
  const tagVersion = tag.replace(/^v/, '');
  if (!RELEASE_SEMVER.test(shared)) {
    console.error(`release tag ${tag} but version is ${shared}; run: node scripts/bump-version.js --release`);
    failed = true;
  } else if (RELEASE_SEMVER.test(tagVersion) && tagVersion !== shared) {
    console.error(`release tag ${tag} does not match version ${shared}; bump the version files before tagging`);
    failed = true;
  }
}

if (failed) {
  console.error('Align the version fields so every manifest shares one version.');
  process.exit(1);
}

const kind = RELEASE_SEMVER.test(shared) ? 'release' : 'dev';
console.log(`All ${ALL_FILES.length} version files pinned at ${shared} (${kind}).`);
