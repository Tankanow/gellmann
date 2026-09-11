# Where the Truth Lives

The expert reader's first question is always: *where is this actually written down?*

Solo mode needs a canonical primary source before it can settle a claim. This table names them for common domains, and names the secondary sources that feel authoritative but do not settle anything. A secondary source counts only when it is a published critique of a named primary (an erratum, a peer-reviewed reply, a maintainer's postmortem, a CVE against a specified behavior).

Always pin the version first. A fact about "Postgres" is not a fact about Postgres 16.3.

| Domain | Primary sources (settle a claim) | Feels authoritative, does not settle |
|---|---|---|
| Python language and stdlib | docs.python.org for the exact minor version; PEPs (peps.python.org); CPython source and `Lib/test`; "What's New in Python 3.x" | Real Python, Stack Overflow, tutorials, library READMEs restating stdlib behavior |
| Node.js and JavaScript | nodejs.org/api for the exact major; ECMA-262 (tc39.es/ecma262); MDN for web APIs is a W3C/WHATWG-tracked reference, cite the spec it links; V8 blog for engine behavior | npm package READMEs about platform behavior, blog posts, "JavaScript: The Good Parts" |
| Go | go.dev/ref/spec; pkg.go.dev for the exact module version; Go release notes; proposals in golang/go issues | Effective Go is guidance not spec; Medium posts |
| Rust | The Reference (doc.rust-lang.org/reference); std docs for the exact toolchain; RFCs (rust-lang/rfcs); release notes | The Book is a tutorial; forum threads |
| HTTP, URLs, web standards | RFC 9110–9114 (HTTP semantics, caching, /1.1, /2, /3); WHATWG URL, Fetch, HTML living standards; W3C recommendations; IANA registries | MDN prose summaries, caniuse for support (fine for support, not for semantics) |
| Security and crypto | The RFC or NIST SP (e.g. RFC 8725 JWT BCP, NIST SP 800-63B); OWASP Cheat Sheet Series (primary for OWASP's own recommendation, not for the underlying math); CVE/NVD records; the library's own security advisories | Blog posts explaining an attack, conference talks, "X is insecure" tweets |
| AWS | The service's Developer Guide and API Reference for the region and date; service quotas page; official SDK source; AWS What's New for launch dates | re:Post answers, Medium architecture posts, third-party pricing calculators |
| Kubernetes | kubernetes.io/docs for the exact minor; KEPs (kubernetes/enhancements); API reference; kubernetes/kubernetes source | Helm chart READMEs, vendor distributions' docs when the claim is about upstream |
| PostgreSQL | postgresql.org/docs/<major>; release notes; the source (`src/backend`); pgsql-hackers threads for intent | ORM docs describing database behavior, Stack Overflow, "use the index Luke" (excellent, still secondary) |
| Git | git-scm.com/docs (the man pages) for the installed version; git source; release notes | Pro Git book (tutorial), cheat sheets, blog posts |
| Statistics and data science | The original paper; the method's reference implementation and its docs (e.g. scipy.stats for the exact version); textbook only when it is the canonical reference the field cites | Towards Data Science, Cross Validated answers, the model's memory of a formula |
| Law and regulation | The statute, regulation, or ruling as published by the issuing body (eCFR, EUR-Lex, the court); the regulator's own guidance | Law-firm client alerts, compliance-vendor summaries, Wikipedia |
| Medicine and health | Peer-reviewed primary studies and systematic reviews; the regulator's label (FDA, EMA); clinical guidelines from the issuing society | Health-news articles, vendor whitepapers, forum posts |
| An internal system | Its source, its tests, its ADRs, its runbook, and the people in CODEOWNERS (work mode) | Another team's wiki page about it, a Slack message from a year ago, your memory of a meeting |

## The pattern

```
Someone wrote the canonical text.
Someone else summarized it, slightly wrong.
The model read the summary.
You read the model.
```

Go back up the chain. Open the canonical text. Quote the sentence.

## When there is no primary source

Some claims have no canonical document: a judgement call, an estimate, a prediction, "best practice" in a field without a standards body. Say so. Mark the claim as a hypothesis, name whose judgement it rests on, and name what evidence would move it. That is more useful than a secondary source dressed as a citation.
