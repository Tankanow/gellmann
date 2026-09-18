// Pure instruction selection for the Gellmann MCP server. No MCP/SDK imports,
// so this stays unit-testable on its own. Reuses the same builder the Claude
// hooks and Pi extension use, so every host emits identical rules.
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { getGellmannInstructions } = require("../hooks/gellmann-instructions.js");
const { RUNTIME_MODES, getDefaultMode, normalizeMode } = require("../hooks/gellmann-config.js");

// The two modes the server offers. "off" has no instructions to serve.
export const MODES = RUNTIME_MODES.filter((m) => m !== "off");

// Resolve a requested mode to a runtime mode. Unknown, empty, or "off"
// falls back to the configured default, then to "solo".
// gellmann: keep the surface to these two; "off"/"review" aren't served here.
export function resolveMode(requested) {
  const asked = normalizeMode(requested);
  if (asked && asked !== "off") return asked;

  const fallback = normalizeMode(getDefaultMode());
  return fallback && fallback !== "off" ? fallback : "solo";
}

export function buildInstructions(requested) {
  return getGellmannInstructions(resolveMode(requested));
}
