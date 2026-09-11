# "301 preserves the method"

**The output:** an API migration note saying "return 301 Moved Permanently
from the old endpoint; clients will retry the POST at the new URL."

**What an HTTP expert winces at:** RFC 9110 permits a user agent to change
POST to GET on a 301 (and historically most do). 308 Permanent Redirect
exists precisely to forbid that. The migration would silently turn writes
into reads.

**Gellmann (solo):**

```
"clients will retry the POST at the new URL after a 301"
  Source: RFC 9110 §15.4.2 — "a user agent MAY change the request method from POST to GET for the subsequent request"; §15.4.9 (308) — "the user agent MUST NOT change the request method […]"
  Status: refuted; use 308
```

**Tag:** `fact:` the confident default; `logic:` the plan rests on it.
