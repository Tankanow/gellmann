# gellmann-mcp

An MCP server that serves Gellmann's expert-reader instructions. It exposes
the same ruleset the Claude hooks and Pi extension use, so every host emits
identical rules.

It is not a replacement for the always-on adapters. Gellmann normally lives in
the system context every turn. MCP prompts are user-invoked, and there is no
portable MCP primitive for "inject this into every turn" across hosts. So this
server is the clean option for MCP hosts whose only injection point is the
prompt menu, or that pull context through tools.

## What it exposes

- Prompt `gellmann`, returns the ruleset as a user message. Optional `mode`
  argument: `work` or `solo`. Omit it to use the configured default.
- Tool `gellmann_instructions`, same text, plus `structuredContent`
  (`{ mode, instructions }`), for hosts that pull context via tools or code
  execution. Read-only.

Mode resolution reuses `hooks/gellmann-config.js`, so `GELLMANN_DEFAULT_MODE`
and `~/.config/gellmann/config.json` work the same as everywhere else.

## Run it

```bash
cd gellmann-mcp
npm install
node index.js        # speaks MCP over stdio
```

Point an MCP host at that command. Example client entry:

```json
{ "mcpServers": { "gellmann": { "command": "node", "args": ["gellmann-mcp/index.js"] } } }
```

## Test

```bash
npm test
```

Covers mode resolution and the instruction text. The MCP wiring in `index.js`
is intentionally thin: it just maps the prompt and tool onto
`buildInstructions`.
