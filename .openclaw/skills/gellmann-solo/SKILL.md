---
name: gellmann-solo
description: "Find canonical primary sources for a claim: spec, RFC, official docs for the exact version, upstream source. Cite or say could not verify."
homepage: https://github.com/tankanow/gellmann
license: MIT
---

# Gellmann: solo

Nobody here to ask. Find the people who wrote it down, and read them.

## What counts as a source

**Primary (settles a claim):** the specification or standard (RFC, W3C, ISO,
PEP, KEP); the official reference documentation for the exact version in use;
the upstream source code and its tests; the changelog for the version
boundary a claim depends on; the paper or dataset a result comes from; the
statute, regulation, or ruling; the vendor's own API reference.

**Secondary (does not settle a claim):** tutorials, blog posts, forum
answers, summaries, textbooks, other AI output, your memory. A secondary
source counts only when it is a published critique of a named primary: an
erratum, a peer-reviewed reply, a maintainer's postmortem, a CVE against a
specified behavior. Then cite both.

**Every primary source has a human behind it.** Name them. RFC 9110 has
editors. A library has a maintainer. A result has authors. A field has people
who explain it better than its spec does. The human in the loop can follow a
person further than they can follow a section number.

## Procedure

Given a topic, file, diff, or claim (default: the claims in your last output):

1. **Pin the version.** Lockfile, `package.json`, `pyproject.toml`, `go.mod`, runtime version, API version header, schema version. A fact about "Postgres" is not a fact about Postgres 16.3.
2. **Name the primary source before you look.** For this domain and version, which document is canonical? (`docs/where-truth-lives.md` lists common ones.) If you cannot name one, you cannot verify the claim; say so.
3. **Open it.** Fetch the page, read the section, quote the sentence. If the host has no fetch tool, say so plainly and mark the citation `unopened`.
4. **Check the reference exists** before citing it: the URL resolves, the RFC number matches the title, the function is in that module in that version. A citation that does not open is a fabrication.
5. **Name the humans.** The editors, authors, maintainers, or researchers behind the source — and, where one exists, the person who explains this domain best to newcomers. Only real, checkable people.
6. **Read against the claim, not for it.** Look for the sentence that would refute it: a caveat, a version note, a "deprecated", a "not guaranteed".
7. **Prefer source over docs when they disagree.** Docs describe intent; code is behavior. Note the disagreement.

## Output

```
**<Domain>.** <three to five plain sentences: the mechanism, and the
distinction that decides the question at hand>

Read <document, section> — "<quoted sentence>" (<URL or path>)
  <what reading it buys> (<how long>)

Who knows this: <named human> — <what they wrote or maintain>

Could not verify: <claim> — <the primary source that would settle it, and
why it could not be opened>
```

Briefing first. Sources you opened before sources you did not. `could not
verify` names the document that would settle it.

## Boundaries

No source from memory: every citation was opened this session or is marked
`unopened`. Does not cite secondary sources as settlement. Does not stop at
the first confirming sentence; the refuting caveat is the thing an expert
would know. Does not invent people. Does not deliver a verdict on the output
— that is `/gellmann-review`, and only when the human asks for it.
