---
name: gellmann-review
description: >
  One-shot expert review of an AI output (the last response, a diff, a
  file, or a pasted document) for the errors a domain expert would catch and
  a non-expert would not: unsourced or wrong facts, missing or fabricated
  citations, reversed causality, one-sided framing, contested claims stated
  as settled, hidden assumptions, and vague conclusions. Built on Julian
  King's quality checklist and critical-reviewer prompts. One line per
  finding. Use when the user says "review this like an expert", "would an
  expert buy this", "gellmann review", "fact-check this", "what would a
  specialist say", or invokes /gellmann-review. Lists; does not fix.
argument-hint: "[target: last | diff | <file> | pasted text]"
---

Review an output as the specialist who owns its domain would. One line per
finding: location, tag, the claim, what settles it. The output's best outcome
is fewer unearned claims.

## Format

`<loc>: <tag> <claim>. <what settles it>.`

`<loc>` is a line number, a section heading, or `¶N` for prose.

Tags:

- `fact:` a factual claim that is wrong, speculative, overstated, or unsourced. Name the primary source or the person.
- `source:` a citation that is missing, secondary, or does not exist. Name what a real one would be.
- `logic:` non-sequitur, reversed causality ("wet streets cause rain"), false dichotomy, unjustified leap, generalization from one case.
- `onesided:` a stakeholder, discipline, or counterargument that is missing, or a loaded, one-sided framing of one. Suggest neutral wording.
- `contested:` reasonable experts would dispute this; say whether the dispute is empirical or values-based.
- `hidden:` an assumption, value judgment, or limitation that is implicit and load-bearing.
- `vague:` too abstract to act on. Say what specific form would be actionable.

## Examples

❌ "This section might benefit from additional supporting evidence and a more balanced consideration of alternative viewpoints."

✅ `¶3: fact: "Python dicts are unordered". True before 3.7; insertion order is guaranteed since 3.7 (docs, Mapping Types — dict, "Changed in version 3.7").`

✅ `L41: source: cites "the OWASP guide" for "12 rounds of bcrypt". Name the document: the OWASP Password Storage Cheat Sheet sets a minimum work factor of 10, so quote it rather than gesturing at "the guide".`

✅ `¶7: logic: "teams that adopted the tool shipped faster, so the tool speeds teams up". Selection: fast teams adopt tools. Needs the pre-adoption baseline.`

✅ `README §Deploy: hidden: assumes a single region. The failover claim in ¶2 rests on it and it is stated nowhere.`

✅ `¶9: contested: "microservices are the right default". Values-based; team size, cost, and ops maturity decide it. State the conditions.`

✅ `¶12: vague: "monitor for anomalies". Which metric, what threshold, who is paged.`

## Interrogation set

When the target is prose or analysis, run these against it, each producing findings in the format above. Adapted from Julian King, "AI and the Gell-Mann amnesia effect" (Dec 2025):

1. Logical problems: unclear premises, non-sequiturs, unjustified leaps, informal fallacies (overgeneralisation, false dichotomy). Quote the text, explain plainly, suggest a sounder alternative.
2. Each factual claim (numbers, dates, classifications, causal statements): (a) inaccurate, (b) speculative or uncertain, (c) overstated relative to typical evidence, or (d) lacking a clear source. Note when you are unsure.
3. Sections that are one-sided, oversimplified, or incomplete given what other stakeholder groups or disciplines would reasonably think. Name the missing perspective.
4. Conclusions stated without sufficient support. What is missing: (a) empirical evidence, (b) causal mechanism or theory, (c) evaluative reasoning linking evidence to explicit criteria, or (d) why alternative interpretations were rejected.
5. Framing or language bias: loaded terms, one-sided portrayal of actors, implicit value judgements. Suggest neutral wording.
6. Statements reasonable stakeholders would contest. Distinguish empirical contestation (other credible evidence exists) from values-based contestation (different interests would disagree).
7. Claims that rest on broad generalisations or "common sense" ("X always leads to Y"). Explain why it may rely on assumed consensus rather than evidence.
8. How clearly the text states (a) key value judgements, (b) major assumptions, (c) limitations. Point out where each is missing, implicit, or underdeveloped.
9. Statements, findings, or recommendations too vague or high-level to guide action. Say how each could be made specific and decision-relevant.

When the target is code, the same set applies to its comments, commit message, PR description, and to every claim the code embodies: a timeout value, a retry count, an "is safe because" comment, a chosen isolation level.

## Verdict

End with one line: `N claims need a source or a human.` If nothing is flagged: `An expert would sign off.`

## Boundaries

Scope: what the output claims and whether an expert would accept it. Code logic correctness, style, and over-engineering are out of scope; route them to a normal review or ponytail-review. Lists findings; does not rewrite the target. Never fabricates a source to fill a `source:` line; if none is known, say `primary source unknown; falls to /gellmann-solo`.
