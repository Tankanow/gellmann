import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  filterSkillBodyForMode,
  parseGellmannCommand,
  readDefaultMode,
  readQuietStartup,
  resolveSessionMode,
  writeDefaultMode,
} from "../index.js";

test("parseGellmannCommand falls back to solo when invoked bare and default is off", () => {
  assert.deepEqual(parseGellmannCommand("", "off"), { type: "set-mode", mode: "solo" });
});

test("parseGellmannCommand parses modes, status, and default subcommand", () => {
  assert.deepEqual(parseGellmannCommand("work", "solo"), { type: "set-mode", mode: "work" });
  assert.deepEqual(parseGellmannCommand("status", "solo"), { type: "status" });
  assert.deepEqual(parseGellmannCommand("default solo", "solo"), { type: "set-default", mode: "solo" });
});

test("parseGellmannCommand rejects review as a default (session-only mode, #377)", () => {
  assert.deepEqual(parseGellmannCommand("default review", "solo"), { type: "invalid", reason: "invalid-default-mode" });
});

test("resolveSessionMode still honors review as a session mode (not a default)", () => {
  const entries = [{ type: "custom", customType: "gellmann-mode", data: { mode: "review" } }];
  assert.equal(resolveSessionMode(entries, "solo"), "review");
});

test("resolveSessionMode prefers latest persisted session mode", () => {
  const entries = [
    { type: "custom", customType: "gellmann-mode", data: { mode: "solo" } },
    { type: "custom", customType: "gellmann-mode", data: { mode: "work" } },
  ];

  assert.equal(resolveSessionMode(entries, "solo"), "work");
});

test("resolveSessionMode returns fallback when entries is not an array", () => {
  assert.equal(resolveSessionMode(null, "work"), "work");
  assert.equal(resolveSessionMode(undefined, "solo"), "solo");
  assert.equal(resolveSessionMode({}, "work"), "work");
  assert.equal(resolveSessionMode("not an array"), "solo"); // DEFAULT_MODE fallback
});

test("readDefaultMode and writeDefaultMode use XDG config path", () => {
  const tempDir = mkdtempSync(join(tmpdir(), "gellmann-config-"));
  const previousXdg = process.env.XDG_CONFIG_HOME;
  const previousDefault = process.env.GELLMANN_DEFAULT_MODE;
  const configPath = join(tempDir, "gellmann", "config.json");
  process.env.XDG_CONFIG_HOME = tempDir;
  delete process.env.GELLMANN_DEFAULT_MODE;

  try {
    // gellmann's getDefaultMode falls through to repo auto-detection when there
    // is no env var or config file; pass tempDir (not a git repo, no CODEOWNERS)
    // as cwd so that fallback is deterministic (solo) instead of depending on
    // this repo's own git history.
    assert.equal(readDefaultMode(tempDir), "solo");
    assert.equal(writeDefaultMode("work"), "work");
    assert.equal(readDefaultMode(tempDir), "work");
    assert.ok(existsSync(configPath));
    assert.deepEqual(JSON.parse(readFileSync(configPath, "utf8")), { defaultMode: "work" });
  } finally {
    if (previousXdg === undefined) delete process.env.XDG_CONFIG_HOME;
    else process.env.XDG_CONFIG_HOME = previousXdg;
    if (previousDefault === undefined) delete process.env.GELLMANN_DEFAULT_MODE;
    else process.env.GELLMANN_DEFAULT_MODE = previousDefault;
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("readQuietStartup resolves env var, config file, and default in that order", () => {
  const tempDir = mkdtempSync(join(tmpdir(), "gellmann-quiet-"));
  const previousXdg = process.env.XDG_CONFIG_HOME;
  const previousEnv = process.env.GELLMANN_QUIET_STARTUP;
  const configDir = join(tempDir, "gellmann");
  const configPath = join(configDir, "config.json");
  process.env.XDG_CONFIG_HOME = tempDir;
  delete process.env.GELLMANN_QUIET_STARTUP;

  try {
    // No env, no config -> default false (toast still shows)
    assert.equal(readQuietStartup(), false);

    // Config file true -> respected
    mkdirSync(configDir, { recursive: true });
    writeFileSync(configPath, JSON.stringify({ quietStartup: true }), "utf8");
    assert.equal(readQuietStartup(), true);

    // Env var overrides config
    process.env.GELLMANN_QUIET_STARTUP = "false";
    assert.equal(readQuietStartup(), false);
    process.env.GELLMANN_QUIET_STARTUP = "1";
    assert.equal(readQuietStartup(), true);
  } finally {
    if (previousXdg === undefined) delete process.env.XDG_CONFIG_HOME;
    else process.env.XDG_CONFIG_HOME = previousXdg;
    if (previousEnv === undefined) delete process.env.GELLMANN_QUIET_STARTUP;
    else process.env.GELLMANN_QUIET_STARTUP = previousEnv;
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("filterSkillBodyForMode keeps only the requested mode's examples and rows", () => {
  // Examples are quoted in the real SKILL.md (`- work: "..."`) — match that
  // shape here too; see the next test for why the quote is load-bearing.
  const body = `---\nname: gellmann\n---\n| **work** | keep work |\n| **solo** | keep solo |\n- work: "Work example"\n- solo: "Solo example"\nOther line`;

  const filtered = filterSkillBodyForMode(body, "solo");

  assert.ok(!filtered.includes("keep work"));
  assert.ok(filtered.includes("keep solo"));
  assert.ok(!filtered.includes("Work example"));
  assert.ok(filtered.includes("Solo example"));
  assert.ok(filtered.includes("Other line"));
});

test("filterSkillBodyForMode does not drop a rule bullet whose label matches a mode name", () => {
  // A rule bullet like "- Work: ..." has the same "label: text" shape as a
  // worked example, but isn't one — it must survive in every mode. Only the
  // quoted, `- work: "..."`-style bullets are real per-mode examples.
  const body = `- Work: do not confuse this rule label with the mode name.\n- Solo: same risk, this is a real rule bullet.\n- work: "real worked example"\n- solo: "real worked example"`;

  const filtered = filterSkillBodyForMode(body, "solo");

  assert.ok(filtered.includes("Work: do not confuse"), "an unquoted rule bullet must not be treated as a mode example");
  assert.ok(filtered.includes("Solo: same risk"), "an unquoted rule bullet must not be treated as a mode example");
  assert.ok(!filtered.includes("- work:"), "the real quoted work example must still be filtered out in solo mode");
  assert.ok(filtered.includes('solo: "real worked example"'));
});

test("filterSkillBodyForMode keeps rule bullets that contain a colon", () => {
  // Regression: rule bullets outside the Modes section (e.g. the
  // "Load-bearing negatives" rule) contain a colon and must not be mistaken
  // for mode-example lines.
  const skillPath = new URL("../../skills/gellmann/SKILL.md", import.meta.url);
  const body = readFileSync(skillPath, "utf8");

  const filtered = filterSkillBodyForMode(body, "work");

  assert.ok(filtered.includes("Confidence is not proof"));
  assert.ok(filtered.includes("Load-bearing negatives"));
  assert.ok(filtered.includes("The expert's questions are cheap"));
  // The Modes examples are still filtered down to the active mode.
  assert.ok(filtered.includes('work: "Verify: SERIALIZABLE prevents the double-insert here'));
  assert.ok(!filtered.includes('solo: "Verify: SERIALIZABLE prevents the double-insert — PostgreSQL'));
});
