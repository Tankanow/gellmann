# "Python dicts are unordered"

**The output:** a helper that sorts `dict.keys()` before serializing "because
dict ordering is not guaranteed in Python."

**What a Python expert winces at:** that was true through 3.6 (an
implementation detail in CPython 3.6, unspecified before). Since 3.7,
insertion order is part of the language. The sort is not wrong, but the
reason is, and the reason will get copied into the next place where order
actually matters.

**Gellmann (solo):**

```
"dict ordering is not guaranteed"
  Source: docs.python.org/3/library/stdtypes.html#mapping-types-dict — "Changed in version 3.7: Dictionary order is guaranteed to be insertion order."
  Status: refuted for the pinned runtime (3.12); true only below 3.7
```

**Gellmann (work):**

```
Ask: @platform (CODEOWNERS for tooling/) — Q: do we still support any 3.6 runtime that would justify sorting here?
```

**Tag:** `fact:` a version-specific fact stated as timeless.
