#!/usr/bin/env node
// Generate the OpenClaw skill package (.openclaw/skills/) from the canonical
// skills/. OpenClaw skills are SKILL.md (frontmatter + body), the same format
// gellmann already uses, with one difference: `description` must be a single
// line under 160 chars. The canonical descriptions are long (tuned for Claude's
// skill picker), so each ships a short one here. The body is copied verbatim
// from skills/<name>/SKILL.md so the ruleset never drifts; only the frontmatter
// is rewritten.
//
// Run:  node scripts/build-openclaw-skills.js
// tests/openclaw-skills.test.js fails if the committed copies are stale.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const HOMEPAGE = 'https://github.com/tankanow/gellmann';

const DESCRIPTIONS = {
  'gellmann': 'Read AI output as a domain expert would: mark unverified claims, then verify with the team (work) or primary sources (solo). Any output with claims.',
  'gellmann-work': 'Find the teammates and internal record that own this domain: CODEOWNERS, git blame, ADRs, wikis, Slack. Drafts the questions; never sends.',
  'gellmann-solo': 'Find canonical primary sources for a claim: spec, RFC, official docs for the exact version, upstream source. Cite or say could not verify.',
  'gellmann-review': 'Expert review of an AI output: wrong or unsourced facts, fake citations, reversed causality, hidden assumptions. One line per finding.',
  'gellmann-help': "Quick reference for gellmann's modes, skills, and commands. One-shot display.",
};

const NAMES = Object.keys(DESCRIPTIONS);

function sourceBody(name) {
  const src = fs.readFileSync(path.join(ROOT, 'skills', name, 'SKILL.md'), 'utf8').replace(/\r\n/g, '\n');
  const fm = src.match(/^---\n[\s\S]*?\n---\n?/);
  if (!fm) throw new Error(`skills/${name}/SKILL.md has no frontmatter`);
  return src.slice(fm[0].length);
}

function render(name) {
  const desc = DESCRIPTIONS[name];
  if (desc.length > 160 || desc.includes('\n') || desc.includes('"')) {
    throw new Error(`description for ${name} must be one line, no quotes, under 160 chars`);
  }
  const frontmatter =
    `---\nname: ${name}\ndescription: "${desc}"\nhomepage: ${HOMEPAGE}\nlicense: MIT\n---\n`;
  return frontmatter + sourceBody(name);
}

function outPath(name) {
  return path.join(ROOT, '.openclaw', 'skills', name, 'SKILL.md');
}

module.exports = { DESCRIPTIONS, NAMES, render, outPath, sourceBody };

if (require.main === module) {
  for (const name of NAMES) {
    const p = outPath(name);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, render(name));
    console.log('wrote', path.relative(ROOT, p).replace(/\\/g, '/'));
  }
}
