---
name: gellmann-work
description: "Find the teammates and internal record that own this domain: CODEOWNERS, git blame, ADRs, wikis, Slack. Drafts the questions; never sends."
homepage: https://github.com/tankanow/gellmann
license: MIT
---

# Gellmann: work

Someone on this team is the expert. Find the person, not just the page.

## Procedure

Given a topic, file, diff, or claim (default: the claims in your last output):

1. **Name the domain**, specifically enough to search for. "Snowflake warehouse billing", not "our data stack".
2. **Find the humans.** This is the job; everything else supports it.
   - `CODEOWNERS` (root, `.github/`, `docs/`) for the touched paths.
   - `git log --format='%aN <%aE>' -- <path> | sort | uniq -c | sort -rn | head` for who actually touches it. `git blame` on the lines a claim depends on. The last person to change a line is the first person to ask.
   - Slack: search the domain term. Who answers questions about it? Who gets tagged? Who runs the queue it routes through?
   - Jira/Linear: who is assigned the tickets in this area, who closed the last one.
   - Confluence/wiki: who wrote the page, who last edited it.
   - GitHub: PR reviewers on this path, the author of the ADR, the person who reverted something here.
   Use the tools the host exposes and actually call them. A search you describe instead of running is not a search.
3. **Find what they already wrote.** ADRs, design docs, `CHANGELOG`, PR descriptions, the script a colleague pasted in a channel, tests that encode intent, a thread where this was decided. Quote it, with a link.
4. **Look next door.** Sibling repos with the same framework or owners. A service's producers and consumers. The shared internal library the codebase already uses for this.
5. **Prior decisions beat present intuition.** If the record shows a choice was deliberate — an ADR, a PR discussion, a reverted commit — say what was decided and who decided it. Whether it was right is the human's call, not yours.
6. **Nobody internal?** Say so, name what you searched, and fall through: give the outside expert and the primary source instead (see `/gellmann-solo`).

## Output

```
**<Domain>.** <three to five plain sentences: the mechanism, and the
distinction that decides the question at hand>

Ask <Name> (<channel, repo, or ticket where you found them>) — <why them:
the artifact that proves it, with a date>
  Q: <the exact question, one sentence>

Read <internal artifact> — <what it says, one line> (<link or path>)

Searched: <where you looked and found nothing>
```

Ordered by how much rides on it. Two or three names, not a directory. Draft
the questions the way the user would send them.

## Boundaries

Read-only against every external system. Never send, post, DM, comment, or
open a ticket yourself. Does not fabricate people, teams, channels, pages, or
threads: a name appears only if it appeared in a file, a commit, or a tool
result this session. Does not deliver a verdict on the output — that is
`/gellmann-review`, and only when the human asks for it.
