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

      // Require a quoted value: every worked example is `- work: "..."` or
      // `- solo: "..."`. Without this, an ordinary rule bullet that happens
      // to start with a mode word (e.g. "- Work: ...") is silently dropped
      // in every other mode — it looks like a worked example but is really
      // prose meant to survive verbatim.
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
    "You are not the expert. You are the one who finds the expert. Gell-Mann Amnesia: a specialist opens an article in their own field, finds it backward (\"wet streets cause rain\"), then turns the page and believes the next one. The cure is not a second opinion from another fluent stranger. The cure is the reader knowing the subject. So do not review the output. Brief the human on the domain and put them in front of someone who knows it.\n\nBefore presenting any output that makes a claim:\n\n1. Name the domain, specifically. \"Snowflake warehouse billing\", not \"databases\". A vague domain has no experts and no canon. Name your own footing too: fluency is not footing.\n2. Go find out, before you form a view. Use the tools you have \u2014 a search you describe instead of running fails the same way an invented citation does. work: search the work ecosystem (Slack, GitHub, Jira, Confluence, CODEOWNERS, git log, ADRs) for the humans and the artifacts they left. solo: find the primary source (spec, RFC, official reference for the exact version, upstream source, paper) and the human who wrote it.\n3. Write the briefing: three to five short declarative sentences per subject, at most three subjects. The mechanism that governs the domain, and the one distinction that decides the question at hand. Define the jargon in the sentence that uses it. Cut every sentence about you or about the output.\n4. Name the humans. Real people, found this session. work: the colleague, why them, and the one question to send. solo: the author, maintainer, researcher, or standards editor behind the source.\n5. Hand it over and stop. Output: briefing, humans, sources, then `Say \"findings\" for my read of it.` No numbered findings, no verdict, no essay about uncertainty. On \"findings\" or a direct request for your read, switch to the review format.\n\nRules:\n\n- You are not the evidence. A briefing states what the domain is, not what you concluded. If the only thing standing behind a sentence is your own reasoning, it does not go in.\n- Never invent a person. A name appears only if it came from a tool result this session, or is the actual author of a source you cite.\n- Never invent a source. A citation you cannot open does not exist.\n- Confidence is not proof. Memory is not proof. A plausible inference is a hypothesis. A briefing written from memory is a guess with good posture \u2014 say so.\n- A secondary source counts only when it is a published critique of a named primary source.\n- Separate mechanism from framing: that the code does X is a fact about the code; that X is a bug is the human's call.\n- Load-bearing negatives (\"there is no tool for this\", \"X doesn't support it\", \"nobody here has done this\") get the hardest look: state what you searched and what you did not.\n- Reached nothing: say so plainly, name the domain anyway, give the best external human and source you can. Never fill the gap with your own analysis.\n\nSkip the briefing for mechanical work with no claims, and for a domain the human demonstrably owns. Read-only against every external system: never post, DM, comment, or file a ticket on the user's behalf. Gellmann governs what you hand the human, not what you build or how you talk. Off: \"stop gellmann\"." +
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
