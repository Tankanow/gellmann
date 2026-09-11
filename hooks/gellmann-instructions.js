#!/usr/bin/env node
// Shared Gellmann instruction builder for Claude hooks and Pi extension.

const fs = require('fs');
const path = require('path');
const { DEFAULT_MODE, normalizeMode, normalizePersistedMode } = require('./gellmann-config');

const INDEPENDENT_MODES = new Set(['review']);
const SKILL_PATH = path.join(__dirname, '..', 'skills', 'gellmann', 'SKILL.md');

function filterSkillBodyForMode(body, mode) {
  const effectiveMode = normalizeMode(mode) || DEFAULT_MODE;
  const withoutFrontmatter = String(body || '').replace(/^---[\s\S]*?---\s*/, '');

  // Only the mode table rows and worked examples are mode-specific, keyed by
  // a mode name (work/solo). A bullet whose label is not a mode — e.g. "No
  // unrequested abstractions: ..." — is a normal rule and must be kept
  // verbatim.
  return withoutFrontmatter
    .split(/\r?\n/)
    .filter((line) => {
      const tableLabel = line.match(/^\|\s*\*\*(.+?)\*\*\s*\|/);
      if (tableLabel) {
        const labelMode = normalizeMode(tableLabel[1].trim());
        if (labelMode) return labelMode === effectiveMode;
      }

      // Require a quoted value: every worked example is `- lite: "..."`. Without
      // this, an ordinary rule bullet that happens to start with a mode word
      // (e.g. "- Full: ...") is silently dropped in every other mode — it looks
      // like a worked example but is really prose meant to survive verbatim.
      const exampleLabel = line.match(/^-\s*([^:]+):\s*"/);
      if (exampleLabel) {
        const labelMode = normalizeMode(exampleLabel[1].trim());
        if (labelMode) return labelMode === effectiveMode;
      }

      return true;
    })
    .join('\n');
}

function getFallbackInstructions(mode) {
  return 'GELLMANN MODE ACTIVE — mode: ' + mode + '\n\n' +
    "You are the expert reader of your own output. The Gell-Mann Amnesia effect: an expert opens an article in their own field, finds it backward (\"wet streets cause rain\"), then turns the page and believes the next one. Do not turn the page.\n\nBefore presenting any output that makes a claim:\n\n1. Name the domain it touches and your actual footing in it. Fluency is not footing.\n2. Mark every load-bearing claim: proven (observed this session), sourced (a citation that opens), hypothesis (you can argue for it), assumption (taken as given), or unknown. A conclusion drawn from an observation is not itself observed.\n3. Hunt \"wet streets cause rain\": reversed causality, version-specific facts stated as timeless, a default that sounds right, a generalization from one example, common knowledge with no owner.\n4. Separate mechanism from framing: showing the code does X proves X, not that X is a bug, the cause, or a best practice.\n5. Go find out through the active mode. work: find who owns the domain (CODEOWNERS, git blame, ADRs, wikis, Slack, Confluence, tickets) and what the internal record already says; end with who to ask and what to ask, and never post on the user's behalf. solo: find the canonical primary source (spec, RFC, official reference for the exact version, upstream source, paper, standard); secondary sources count only as published critics of a named primary.\n6. Present with the ledger visible. Append one line per unresolved claim: `Verify: <claim> — <who or what settles it>`. Append nothing when everything is proven or sourced.\n\nRules:\n\n- Confidence is not proof. Memory is not proof. A plausible inference is a hypothesis.\n- Never invent a source. A citation you cannot open does not exist.\n- A secondary source counts only when it is a published critique of a named primary source.\n- Mark specifically, not uniformly. Uniform hedging is as useless as uniform confidence.\n- Load-bearing negatives (\"X doesn't support\", \"there is no way\") get the hardest look: state what you searched and what you did not.\n\nNot hedged: what you directly observed this session; what you could verify yourself with a tool you have (do it); the work itself (deliver it, then flag). Gellmann governs what you claim and how you verify it, not what you build or how you talk. Off: \"stop gellmann\"." +
    '\n\nCurrent mode: **' + mode + '**. Switch: `/gellmann work|solo`.';
}

function getGellmannInstructions(mode) {
  const configuredMode = normalizePersistedMode(mode) || DEFAULT_MODE;

  if (INDEPENDENT_MODES.has(configuredMode)) {
    return 'GELLMANN MODE ACTIVE — mode: ' + configuredMode + '. Behavior defined by /gellmann-' + configuredMode + ' skill.';
  }

  const effectiveMode = normalizeMode(configuredMode) || DEFAULT_MODE;

  try {
    return 'GELLMANN MODE ACTIVE — mode: ' + effectiveMode + '\n\n' +
      filterSkillBodyForMode(fs.readFileSync(SKILL_PATH, 'utf8'), effectiveMode);
  } catch (e) {
    return getFallbackInstructions(effectiveMode);
  }
}

module.exports = {
  filterSkillBodyForMode,
  getFallbackInstructions,
  getGellmannInstructions,
};
