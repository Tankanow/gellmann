---
name: gellmann-work
description: >
  Work persona of the Gell-Mann lens: someone here already knows this, and
  your job is to find them. Searches the work ecosystem for the humans who
  own a domain and the artifacts they left behind: Slack, GitHub, Jira,
  Confluence, CODEOWNERS, git blame and log, ADRs, design docs, sibling
  repos. Returns a short briefing on the domain, a named list of who to ask
  with the exact question to send, and the internal artifact that already
  answers part of it. Falls through to outside experts and primary sources
  when nobody internal has touched it. Use when the user says "who owns
  this", "who should I ask", "has anyone here done this", "check the wiki",
  or invokes /gellmann-work, or when work mode is active and a claim rests on
  domain knowledge the team may already hold. Drafts questions; never sends
  them. Switches the session to work mode.
argument-hint: "[topic, file, or claim]"
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
