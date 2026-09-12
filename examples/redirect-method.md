# "301 preserves the method"

**The output:** an API migration note saying "return 301 Moved Permanently
from the old endpoint; clients will retry the POST at the new URL."

**What an HTTP expert winces at:** RFC 9110 permits a user agent to change
POST to GET on a 301 (and historically most do). 308 Permanent Redirect
exists precisely to forbid that. The migration would silently turn writes
into reads.

**Gellmann (solo):**

```
HTTP redirect method semantics. A redirect status does two things: it moves
the client, and it decides what method the client uses when it arrives. 301
and 302 permit the client to change POST to GET. 307 and 308 forbid it. That
distinction is the entire reason 307 and 308 exist.

Read RFC 9110 §15.4.2 — "a user agent MAY change the request method from POST
to GET for the subsequent request" — against §15.4.9, where 308 says the user
agent MUST NOT. (rfc-editor.org/rfc/rfc9110) Two paragraphs, five minutes.

Who knows this: Roy Fielding, Mark Nottingham, and Julian Reschke edited
RFC 9110. Nottingham writes about HTTP semantics for non-specialists.

Say "findings" for my read of it.
```

**On `findings`:** `¶1: fact: "clients will retry the POST". RFC 9110 §15.4.2
permits the method change; §15.4.9 (308) forbids it. Use 308.`
