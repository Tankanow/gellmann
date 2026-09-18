#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

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
  'You are not the expert',                    // the premise: find the expert, don't be one
  'fluency is not footing',                    // step 1
  'You are not the evidence',                  // the rule that blocks a self-anchored finding
  'Confidence is not proof',                   // rule: memory is not proof
  'Never invent a source',                     // rule: a citation that won't open
  'Never invent a person',                     // rule: the same, for humans
  'published critique of a named primary',     // secondary-source rule
  'mechanism from framing',                    // fact about the code vs. the human's call
  'Say "findings" for my read of it.',         // the artifact's closing offer
  'stop gellmann',                             // the only off switch
];

const skill = read('skills/gellmann/SKILL.md');
const initPy = read('__init__.py');
const sources = [['skills/gellmann/SKILL.md', skill], ['AGENTS.md', agents], ['__init__.py', initPy]];

// The fallback strings are what ships when SKILL.md can't be read (e.g. a
// broken checkout) — they must carry the same invariants, not just the
// primary sources above.
const nodeFallback = require('../hooks/gellmann-instructions').getFallbackInstructions('solo');
sources.push(['hooks/gellmann-instructions.js (Node fallback)', nodeFallback]);

let pythonFallback = null;
for (const cmd of ['python3', 'python']) {
  try {
    pythonFallback = execFileSync(cmd, ['-c', [
      "import importlib.util",
      "spec = importlib.util.spec_from_file_location('gellmann_init', '__init__.py')",
      "mod = importlib.util.module_from_spec(spec)",
      "spec.loader.exec_module(mod)",
      "print(mod._fallback_instructions('solo'))",
    ].join('\n')], { cwd: root, encoding: 'utf8' });
    break;
  } catch {
    // try the next candidate; if neither is available, skip the Python source below
  }
}
if (pythonFallback) {
  sources.push(['__init__.py _fallback_instructions (Python fallback)', pythonFallback]);
} else {
  console.error('warning: no working python3/python found — skipping the Python fallback invariant check');
}

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

console.log(`Rule copies match AGENTS.md; ${INVARIANTS.length} rule invariants present in ${sources.map(([label]) => label).join(', ')}.`);
