---
type: llm
weight: 2
name: actually-searched
---
PASS if the transcript shows the agent actually ran searches against this
repository before answering — git log / git blame, Grep over the source or
tests, or reading the relevant files.

FAIL if the agent described a search it would run, or answered from the
prompt text alone without opening anything.
