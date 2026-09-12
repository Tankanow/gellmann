---
type: llm
weight: 3
name: names-a-real-person-with-why
---
PASS if the response names at least one specific person or owner found in
this repository's actual record (a git commit author, a CODEOWNERS entry, a
name in a doc), AND gives the reason they are the right person — the commit,
file, or artifact that establishes it.

FAIL if it names nobody, or names a plausible-sounding person, team, or
channel that does not appear anywhere in this repository. Inventing a name is
an automatic FAIL.

FAIL if it names a person with no why-them attached ("ask the maintainer").
