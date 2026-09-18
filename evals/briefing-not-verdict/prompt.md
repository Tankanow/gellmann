---
name: briefing-not-verdict
description: Solo mode hands back a domain briefing plus named humans, not a numbered verdict on the output.
tags: [regression, solo, output-shape]
runs: 3
max_turns: 12
allowed_tools: [Read, Glob, Grep, Skill]
---

/gellmann solo

My kid's geometry worksheet asks: Han drew two circles of equal radius, one centered at A and one at B, and marked where they cross. The worksheet asks whether line CD is guaranteed to be parallel to line AB. An AI gave me this answer:

> No — CD is *not* guaranteed to be parallel to AB. It's guaranteed to be perpendicular to it. Han wanted a line through C parallel to AB, but the perpendicular bisector alone doesn't give you that. Since CD ⊥ AB, if Han now constructs a new line through C perpendicular to CD, that new line *will* be parallel to AB — two lines perpendicular to the same line are parallel to each other.

Can you help me explain this to my daughter?
