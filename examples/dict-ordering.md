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
Python dict ordering. Dict ordering is a language-version fact, not a
language fact. Before 3.6 it was genuinely arbitrary. In CPython 3.6 it
became insertion-ordered as an implementation detail nobody was supposed to
rely on. In 3.7 it became part of the language spec. So "is dict ordering
guaranteed" has three different answers depending on the runtime you pin.

Read docs.python.org/3/library/stdtypes.html#mapping-types-dict — "Changed in
version 3.7: Dictionary order is guaranteed to be insertion order." One line,
and it tells you which of the three answers applies to you.

Who knows this: Raymond Hettinger proposed the compact dict that made it
happen, and his "Modern Dictionaries" talk explains the layout that produces
the ordering as a side effect.

Say "findings" for my read of it.
```

**Gellmann (work):**

```
Python dict ordering. [same briefing]

Ask @platform (CODEOWNERS for tooling/) — they pin the runtimes.
  Q: do we still support any 3.6 runtime that would justify sorting here?

Read pyproject.toml — requires-python is >=3.12, which settles it locally.
```

**On `findings`:** `L14: fact: "dict ordering is not guaranteed". A
version-specific fact stated as timeless; refuted for the pinned runtime
(3.12), true only below 3.7.`
