---
type: llm
weight: 2
name: catches-the-redirect-claim
---
PASS if the response flags that "clients will retry the POST" after a 301 is
not guaranteed — 301 permits a client to change the method to GET, which is
why 308 exists.

FAIL if the response accepts the 301 claim as correct, or does not address it.
