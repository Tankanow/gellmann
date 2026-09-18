---
name: findings-on-request
description: The verdict exists and is delivered in review format when the human explicitly asks for it.
tags: [opt-in, review]
runs: 3
max_turns: 12
allowed_tools: [Read, Glob, Grep, Skill]
---

/gellmann solo

Here is an AI-written migration note:

> Return 301 from the old checkout endpoint. Clients will retry the POST at the new URL, so no data is lost. We've set a 5 minute cache TTL, which is standard.

Give me your findings on it.
