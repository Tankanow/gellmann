# "The library rejects alg: none"

**The output:** a security review note: "our JWT library rejects `alg: none`
by default, so the unsigned-token attack does not apply."

**What a security expert winces at:** whether `none` is rejected depends on
the library and the version, and on whether the caller pinned the allowed
algorithms. The best-current-practice RFC exists because libraries got this
wrong. "By default" is the claim that needs a source.

**Gellmann (solo):**

```
"the library rejects alg: none by default"
  Source: RFC 8725 §3.1 — libraries MUST let the caller specify the allowed algorithms and MUST NOT use any other; pin the set rather than rely on a default
  Source: <library> changelog for the pinned version — unopened; the claim is settled only by the release notes or a test in the library's suite
  Status: could not verify as stated; verify the pinned version, and pin the algorithm list regardless
```

**Tag:** `fact:` library- and version-specific claim stated as universal; `source:` none given.
