import assert from "node:assert/strict";
import test from "node:test";

// Force the default so auto-detection never runs against this repo's own git state.
process.env.GELLMANN_DEFAULT_MODE = "solo";

import { MODES, resolveMode, buildInstructions } from "../instructions.js";

test("MODES is exactly work and solo", () => {
  assert.deepEqual(MODES, ["work", "solo"]);
});

test("resolveMode keeps valid modes", () => {
  for (const mode of MODES) assert.equal(resolveMode(mode), mode);
});

test("resolveMode falls back to the configured default for off/unknown/empty", () => {
  // GELLMANN_DEFAULT_MODE is forced to "solo" above, so every non-served
  // input — including "off" and the retired "ultra" — resolves there.
  for (const input of ["off", undefined, "ultra", "review", "nonsense", "", null]) {
    assert.equal(resolveMode(input), "solo");
  }
});

test("buildInstructions returns the ruleset tagged with the resolved mode", () => {
  const text = buildInstructions("work");
  assert.match(text, /GELLMANN MODE ACTIVE/);
  assert.match(text, /mode: work/);
});
