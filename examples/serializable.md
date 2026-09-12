# "SERIALIZABLE prevents the race"

**The output:** a PR description: "switched the transaction to SERIALIZABLE
so the double-insert can no longer happen."

**What a Postgres expert winces at:** SERIALIZABLE in PostgreSQL is
Serializable Snapshot Isolation. It detects the anomaly and aborts one
transaction with SQLSTATE 40001; it does not block or make the second insert
wait. Without a retry loop in the caller, the race becomes a 500.

**Gellmann (solo):**

```
PostgreSQL isolation levels. Postgres implements SERIALIZABLE as Serializable
Snapshot Isolation, which is optimistic: it lets both transactions run, then
detects the conflict at commit and aborts one with SQLSTATE 40001. Other
databases implement it pessimistically, with locks, so the second writer
waits. The distinction decides who handles the failure — under SSI it is
always the application, which must retry.

Read postgresql.org/docs/16/transaction-iso.html §13.2.3 — applications using
this level "must be prepared to retry transactions due to serialization
failures". One section, ten minutes, and it is the difference between a
correct fix and a 500.

Who knows this: Kevin Grittner wrote the SSI implementation in Postgres and
described it with Dan R. K. Ports in "Serializable Snapshot Isolation in
PostgreSQL" (VLDB 2012). The algorithm comes from Cahill, Röhm, and Fekete,
"Serializable isolation for snapshot databases" (SIGMOD 2008).

Say "findings" for my read of it.
```

**Gellmann (work):**

```
PostgreSQL isolation levels. [same briefing]

Ask the author of ADR-014 (git log docs/adr/) — they chose READ COMMITTED for
orders/ deliberately.
  Q: does this PR revisit that decision, or work around it?

Read docs/adr/014-*.md — the reasoning for the original choice.
```

**On `findings`:** `PR body: fact: "the double-insert can no longer happen".
Narrower than stated — SSI detects the anomaly and aborts, it does not
prevent it, and this diff has no retry loop (PostgreSQL 16 docs §13.2.3).`
