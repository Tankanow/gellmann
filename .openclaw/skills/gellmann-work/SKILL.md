---
name: gellmann-work
description: "Find the teammates and internal record that own this domain: CODEOWNERS, git blame, ADRs, wikis, Slack. Drafts the questions; never sends."
homepage: https://github.com/tankanow/gellmann
license: MIT
---

# Gellmann: work

Someone on this team is the expert. Find them, and the record they left,
before you trust yourself.

## Procedure

Given a topic, file, diff, or claim (default: the claims in your last output):

1. **Owners.** `CODEOWNERS` (root, `.github/`, `docs/`) for the touched paths. `git log --format='%aN <%aE>' -- <path> | sort | uniq -c | sort -rn | head` for who actually touches it. `git blame` on the specific lines a claim depends on. The last person to change a line is the first person to ask about it.
2. **The record in the repo.** ADRs, `docs/`, design docs, RFCs, `CHANGELOG`, PR descriptions (`git log --merges`, `gh pr list --search`), issue links in commit messages, TODO and FIXME comments near the touched code, tests that encode intent.
3. **The record next door.** Sibling repos with the same framework or the same owners. A service's consumers and producers. The shared library the codebase already uses for this.
4. **The record outside the repo**, only through tools the host actually exposes: internal wiki and Confluence pages, Slack threads, Jira or Linear tickets, meeting notes. Search read-only. Quote what you find, with a link. If no such tool exists, name the search you would run and stop.
5. **Prior decisions beat present intuition.** If the record shows a choice was made deliberately (an ADR, a PR discussion, a reverted commit), your claim that it is wrong is a hypothesis about their reasoning, not a finding. Say so.

## Output

```
Ask: <name or team> (<why them: CODEOWNERS / last touched <file> on <date> / wrote ADR-N>)
  Q: <the exact question, one sentence, naming the claim it settles>
Record: <artifact> — <what it says, one line> (<link or path>)
Unowned: <claim> — nobody in the record; falls to /gellmann-solo
```

One block per claim, ordered by how much rides on the claim. Draft the questions the way the user would send them. Never send, post, DM, comment, or open a ticket yourself.

## Boundaries

Read-only against every external system. Does not fabricate people, teams, pages, or threads: a name appears in the output only if it appeared in a file, a commit, or a tool result this session. Where the record is silent, say `Unowned` and hand off to `/gellmann-solo`.
