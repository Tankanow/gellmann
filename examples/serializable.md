# "SERIALIZABLE prevents the race"

**The output:** a PR description: "switched the transaction to SERIALIZABLE
so the double-insert can no longer happen."

**What a Postgres expert winces at:** SERIALIZABLE in PostgreSQL is
Serializable Snapshot Isolation. It detects the anomaly and aborts one
transaction with SQLSTATE 40001; it does not block or make the second insert
wait. Without a retry loop in the caller, the race becomes a 500.

**Gellmann (solo):**

```
"SERIALIZABLE means the double-insert can no longer happen"
  Source: postgresql.org/docs/16/transaction-iso.html §13.2.3 — applications using this level "must be prepared to retry transactions due to serialization failures"
  Status: narrower than stated; the anomaly is detected, not prevented; the diff has no retry
```

**Gellmann (work):**

```
Ask: the author of ADR-014 (git log docs/adr/) — Q: READ COMMITTED was chosen for orders/ deliberately; does this PR revisit that decision or work around it?
```

**Tag:** `fact:` overstated; `hidden:` the retry requirement.
