#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), 'utf8').replace(/\r\n/g, '\n').trim();
}

function stripFrontmatter(text) {
  return text.replace(/^---\n[\s\S]*?\n---\n*/, '').trim();
}

const agents = read('AGENTS.md');
const canonical = agents.replace(/\n\n\(Yes, this file also applies[\s\S]*?\)$/, '').trim();

// Compact copies: same body as AGENTS.md, host-specific frontmatter stripped.
const copies = [
  ['.cursor/rules/gellmann.mdc', stripFrontmatter],
  ['.windsurf/rules/gellmann.md', text => text.trim()],
  ['.clinerules/gellmann.md', text => text.trim()],
  ['.agents/rules/gellmann.md', text => text.trim()],
  ['.qoder/rules/gellmann.md', text => text.trim()],
  ['.github/copilot-instructions.md', text => text.trim()],
  ['.kiro/steering/gellmann.md', stripFrontmatter],
];

let failed = false;

for (const [relPath, normalize] of copies) {
  const actual = normalize(read(relPath));
  if (actual !== canonical) {
    console.error(`${relPath} drifted from AGENTS.md`);
    failed = true;
  }
}

// SKILL.md is the runtime source of truth and is longer than the compact body,
// so it cannot be byte-compared. gellmann: canary, not full equality. Assert the
// expert-reader rules survive verbatim in both the source and AGENTS.md. Changing
// a rule's wording trips this, which is the reminder to propagate it everywhere.
// Upgrade path: generate the copies from SKILL.md if this ever misses a real drift.
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

const skill = read('skills/gellmann/SKILL.md');
const initPy = read('__init__.py');
const sources = [['skills/gellmann/SKILL.md', skill], ['AGENTS.md', agents], ['__init__.py', initPy]];
for (const phrase of INVARIANTS) {
  for (const [label, text] of sources) {
    if (!text.includes(phrase)) {
      console.error(`${label} is missing rule invariant: "${phrase}"`);
      failed = true;
    }
  }
}

if (failed) {
  console.error('Update the copied rule text, AGENTS.md, or SKILL.md so the shared rules match.');
  process.exit(1);
}

console.log(`Rule copies match AGENTS.md; ${INVARIANTS.length} rule invariants present in SKILL.md, AGENTS.md, and __init__.py.`);
