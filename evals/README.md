# Gellmann evals

Run with the first-party harness:

```
claude plugin eval . --trust-plugin --allow-tools Bash    # every case
claude plugin eval . --case briefing-not-verdict --trust-plugin
claude plugin eval . --tag regression --trust-plugin --allow-tools Bash
```

`--allow-tools Bash` is needed by the two work-mode cases, which search git
history for real people. Without the grant those tools are dropped and the
cases fail for the wrong reason. `WebSearch` and `WebFetch` are gated the
same way; no case requires them, and the solo cases are deliberately run
without web access because that is the condition the failure appeared under.

Each case runs twice — once with gellmann loaded, once without — and reports
the delta. Graders marked `arm: with-only` are plugin-fired indicators (did
the skill actually change behavior) rather than part of the score.

Cost: roughly $0.15–0.45 per plugin-arm run; the baseline arm is far cheaper
(~$0.02). At `runs: 3` a full six-case pass is roughly $5–8. That is why CI
runs this on tags and manual dispatch, not on every PR.

Baselines, 2026-09-12, at `runs: 1`:

```
CASE                  WITH  W/OUT Δ      RUNS COST
briefing-not-verdict  1.00  0.38  +0.63  2    $0.46
no-tool-domain        1.00  0.63  +0.38  2    $0.41
```

Note what the baseline arm does on `no-tool-domain`: it passes
`no-fabricated-citation` (it does not make things up) but fails
`hands-off-rather-than-substituting` every time (it answers the fermentation
question from its own reasoning). That is the Session 2 failure isolated to a
single grader.

The delta is the number that matters. A case where `with` and `without` score
the same is not testing the skill — it is testing the model.

## What each case pins

| Case | The behavior | Origin |
|---|---|---|
| `briefing-not-verdict` | Output is a domain briefing plus named humans, not a numbered verdict | The failure: the agent judged a geometry worksheet from a photo instead of naming who could |
| `no-tool-domain` | When no tool can reach the domain, say so and hand off — never substitute your own analysis | Same failure, the specific hole it fell through |
| `work-finds-humans` | Work mode actually searches the ecosystem and names a person with why-them | The success: finding Sean Calista in #cz-helpdesk |
| `no-invented-experts` | Never fabricate a plausible-sounding person, team, or channel | The thing that makes the handoff worthless if it breaks |
| `findings-on-request` | The verdict exists, but only when the human asks for it | The opt-in half of the contract |
| `skip-mechanical` | No briefing on work that makes no claims | Guards against the skill firing on everything |

## Adding a case

`claude plugin eval init --bare <name>` writes the template. A case is
`prompt.md` (frontmatter + the user turn) plus `graders/*.md` (frontmatter
with `type`, `weight`, optional `name` and `arm`; body is the criterion).

Grader types: `regex`, `tool_used`, `tool_order`, `file_exists`, `llm`,
`baseline`. Grader keys: `type`, `weight`, `name`, `arm` (`with-only` |
`both`), plus `tool` for `tool_used`.

`tests/evals.test.js` validates every case's frontmatter against those key
sets for free, so a malformed case fails in `npm test` rather than costing a
paid run to discover.

Do not use `tool_used: Skill` as a plugin-fired indicator here: gellmann
injects through the SessionStart hook, not the Skill tool, so it reports 0x
even on a correct run. The ablation delta is the indicator.

Write the grader against the *artifact shape*, not against wording. A grader
that pins a phrase breaks every time the skill is reworded; a grader that
pins "names a real person found this session, with why-them" survives.
