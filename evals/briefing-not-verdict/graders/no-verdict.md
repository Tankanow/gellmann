---
type: llm
weight: 3
name: no-unrequested-verdict
---
The human did not ask for the agent's read of the AI answer. They asked for
help explaining the topic.

FAIL if the response delivers an unrequested verdict on the quoted AI answer:
a findings list, numbered corrections, a section declaring the answer wrong
or right, or a rewritten "what I'd say instead" that substitutes the agent's
own derivation for a source.

PASS if the response withholds the verdict and instead offers it — a single
short line such as `Say "findings" for my read of it.` is the expected form.

A brief, clearly-marked caveat that the agent cannot verify the diagram is
NOT a verdict and does not fail this grader.
