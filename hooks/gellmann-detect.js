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
