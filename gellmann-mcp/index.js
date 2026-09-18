#!/usr/bin/env node
// Gellmann MCP server: serves the expert-reader instructions over stdio as a
// prompt (user-invoked) and a tool (for hosts that pull context via tools).
// It does NOT replace the always-on adapters; it's the clean option for hosts
// whose only injection point is the prompt menu.
import fs from "node:fs";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { MODES, buildInstructions, resolveMode } from "./instructions.js";

const { version } = JSON.parse(
  await fs.promises.readFile(new URL("../package.json", import.meta.url), "utf8")
);
const server = new McpServer({ name: "gellmann", version });

const modeArg = z
  .enum(MODES)
  .optional()
  .describe("Gellmann mode: work or solo. Omit for the configured default.");

server.registerPrompt(
  "gellmann",
  {
    title: "Gellmann mode",
    description: "Expert-reader instructions: mark unverified claims, verify with the team (work) or primary sources (solo).",
    argsSchema: { mode: modeArg },
  },
  ({ mode }) => ({
    messages: [{ role: "user", content: { type: "text", text: buildInstructions(mode) } }],
  }),
);

server.registerTool(
  "gellmann_instructions",
  {
    title: "Gellmann instructions",
    description: "Return the Gellmann ruleset for the given mode (work or solo).",
    inputSchema: { mode: modeArg },
    outputSchema: { mode: z.string(), instructions: z.string() },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  ({ mode }) => {
    const resolvedMode = resolveMode(mode);
    const instructions = buildInstructions(resolvedMode);
    const structuredContent = { mode: resolvedMode, instructions };
    return { content: [{ type: "text", text: instructions }], structuredContent };
  },
);

await server.connect(new StdioServerTransport());
