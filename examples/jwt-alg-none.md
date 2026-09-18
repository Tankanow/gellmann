# "The library rejects alg: none"

**The output:** a security review note: "our JWT library rejects `alg: none`
by default, so the unsigned-token attack does not apply."

**What a security expert winces at:** whether `none` is rejected depends on
the library and the version, and on whether the caller pinned the allowed
algorithms. The best-current-practice RFC exists because libraries got this
wrong. "By default" is the claim that needs a source.

**Gellmann (solo):**

```
JWT algorithm confusion. A JWT carries its own algorithm in the header, so a
verifier that trusts that header lets the attacker choose it. Two attacks
follow: alg "none" (no signature at all) and swapping RS256 for HS256 so the
public key becomes the HMAC secret. The fix is not a library that rejects
"none" — it is the caller pinning the exact algorithm list it will accept,
because then the header stops being input.

Read RFC 8725 §3.1 — "Libraries MUST enable the caller to specify a supported
set of algorithms and MUST NOT use any other algorithms when performing
cryptographic operations." It is a short BCP written specifically because
this kept happening.

Who knows this: Tim McLean's 2015 write-up is the disclosure that started it.
Yaron Sheffer, Dick Hardt, and Michael B. Jones wrote RFC 8725.

Could not verify: whether your pinned library version rejects "none" by
default — only that library's changelog or its own test suite settles it, and
I could not open either here.

Say "findings" for my read of it.
```

**On `findings`:** `¶1: fact: "rejects alg: none by default" — a library- and
version-specific claim stated as universal. source: none given; the pinned
version's changelog settles it. hidden: the note assumes the caller did not
need to pin an algorithm list, which RFC 8725 §3.1 says it must.`
