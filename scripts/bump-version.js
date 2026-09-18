#!/usr/bin/env node
// Stamp one version across every manifest that declares it.
//
//   node scripts/bump-version.js                 dev stamp on the current base
//   node scripts/bump-version.js --release       drop the stamp: current base, release form
//   node scripts/bump-version.js 0.2.0           set the base, release form
//   node scripts/bump-version.js 0.2.0 --dev     set the base, fresh dev stamp
//   node scripts/bump-version.js --print         show the current version, change nothing
//
// Why a dev stamp at all: Claude Code keys its plugin install cache on the
// version string. Reinstalling with an unchanged version is a no-op that
// reports success, so a directory-sourced plugin under active development
// serves stale files until the string moves. See scripts/version-files.js.

const {
  ALL_FILES, RELEASE_SEMVER, readVersion, writeVersion, parseVersion, devStamp,
} = require('./version-files');

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith('--')));
const positional = args.filter((a) => !a.startsWith('--'));

for (const f of flags) {
  if (!['--release', '--dev', '--print', '--help', '-h'].includes(f)) {
    console.error(`unknown flag ${f}`);
    process.exit(2);
  }
}
if (flags.has('--help') || flags.has('-h')) {
  console.log(require('fs').readFileSync(__filename, 'utf8').split('\n')
    .slice(1).filter((l) => l.startsWith('//')).map((l) => l.replace(/^\/\/ ?/, '')).join('\n'));
  process.exit(0);
}
if (positional.length > 1) {
  console.error('pass at most one version argument');
  process.exit(2);
}
if (flags.has('--release') && flags.has('--dev')) {
  console.error('--release and --dev are mutually exclusive');
  process.exit(2);
}

// Read the current version from the first file, and refuse to guess if the
// manifests already disagree — bumping a split state would hide the split.
const current = readVersion(ALL_FILES[0]);
const disagree = ALL_FILES.filter((f) => readVersion(f) !== current);
if (disagree.length && !positional.length) {
  console.error('manifests disagree on the current version; pass an explicit version to resolve:');
  for (const f of ALL_FILES) console.error(`  ${readVersion(f)}\t${f}`);
  process.exit(1);
}

if (flags.has('--print')) {
  console.log(current);
  process.exit(0);
}

const requested = positional[0];
if (requested && !RELEASE_SEMVER.test(requested)) {
  console.error(`version argument must be a bare X.Y.Z (got ${JSON.stringify(requested)}); the stamp is added by --dev`);
  process.exit(2);
}

const parsed = parseVersion(current);
if (!parsed && !requested) {
  console.error(`current version ${JSON.stringify(current)} is not parseable; pass an explicit X.Y.Z`);
  process.exit(1);
}
const base = requested || parsed.base;

// Default when no flag is given: an explicit version means a release, a bare
// invocation means "stamp it so the installer notices".
const wantDev = flags.has('--dev') || (!flags.has('--release') && !requested);
const next = wantDev ? `${base}-${devStamp()}` : base;

if (next === current) {
  console.log(`already at ${current}; nothing to do`);
  process.exit(0);
}

for (const relPath of ALL_FILES) writeVersion(relPath, next);

console.log(`${current} -> ${next}`);
console.log(`stamped ${ALL_FILES.length} files`);
if (wantDev) {
  console.log('\nDev build. To pick it up in Claude Code:');
  console.log('  claude plugin marketplace update gellmann && claude plugin update gellmann@gellmann');
}
