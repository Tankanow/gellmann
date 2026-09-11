# Examples

Each example is a real class of AI output that read fine to a non-expert, the
line an expert would have caught, and the primary source that settles it.
The point is not that the model is often wrong. It is that when it is wrong in
a field you do not know, nothing in the prose tells you.

| Example | The claim that read fine | What settles it |
|---|---|---|
| [dict-ordering.md](dict-ordering.md) | "Python dicts are unordered, so sort the keys first" | docs.python.org, Mapping Types, "Changed in version 3.7" |
| [redirect-method.md](redirect-method.md) | "Return 301 so the client retries the POST at the new URL" | RFC 9110 §15.4.2 vs §15.4.9 |
| [serializable.md](serializable.md) | "SERIALIZABLE isolation prevents this double-insert" | PostgreSQL docs §13.2.3 |
| [jwt-alg-none.md](jwt-alg-none.md) | "The library rejects alg: none by default" | RFC 8725 §3.1 and the library's own changelog |
