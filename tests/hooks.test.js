#!/usr/bin/env node

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.join(__dirname, '..');

// isShellSafe gates the statusline setup snippet (issue #200): ordinary install
// paths pass, paths carrying shell metacharacters are rejected so they never get
// embedded in a shell command.
const { DEFAULT_MODE, getDefaultMode, isShellSafe, writeDefaultMode } = require('../hooks/gellmann-config');
assert.equal(isShellSafe('C:\\Users\\x\\.claude\\plugins\\gellmann\\hooks\\gellmann-statusline.ps1'), true);
assert.equal(isShellSafe('/home/u/.claude/plugins/gellmann/hooks/gellmann-statusline.sh'), true);
assert.equal(isShellSafe('/tmp/a"&calc.exe&"/x.sh'), false);
assert.equal(isShellSafe('/tmp/$(calc)/x.sh'), false);
assert.equal(isShellSafe('/tmp/a;rm -rf/x.sh'), false);

function run(script, env, input = '') {
  return spawnSync(process.execPath, [path.join(root, 'hooks', script)], {
    env: { ...process.env, ...env },
    input,
    encoding: 'utf8',
  });
}

// Keep the base env clean so the default-dir / native-Claude checks are
// deterministic; the CLAUDE_CONFIG_DIR and codex/copilot cases set these
// explicitly where needed. run() spreads process.env, so a PLUGIN_DATA /
// COPILOT_PLUGIN_DATA leaked from the dev or CI shell would otherwise steer
// writeHookOutput into the wrong branch and mis-fire the native assertions.
delete process.env.CLAUDE_CONFIG_DIR;
delete process.env.PLUGIN_DATA;
delete process.env.COPILOT_PLUGIN_DATA;
// A leaked subagent matcher would scope the inject-into-every-subagent assertions.
delete process.env.GELLMANN_SUBAGENT_MATCHER;
delete process.env.QODER_SESSION_ID;

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'gellmann-hooks-'));
// Runs on normal exit and on assertion-throw exit; force makes it idempotent.
process.on('exit', () => fs.rmSync(temp, { recursive: true, force: true }));

const home = path.join(temp, 'home');
const pluginData = path.join(temp, 'plugin-data');
fs.mkdirSync(home, { recursive: true });

// USERPROFILE alongside HOME: os.homedir() reads USERPROFILE on Windows, HOME on POSIX.
const codexEnv = {
  HOME: home,
  USERPROFILE: home,
  PLUGIN_DATA: pluginData,
  GELLMANN_DEFAULT_MODE: 'work',
};
const codexState = path.join(pluginData, '.gellmann-active');

let result = run('gellmann-activate.js', codexEnv);
assert.equal(result.status, 0, result.stderr);
assert.equal(fs.readFileSync(codexState, 'utf8'), 'work');
let output = JSON.parse(result.stdout);
assert.equal(output.systemMessage, 'GELLMANN:WORK');
assert.equal(output.additionalContext, undefined, 'Codex must not emit additionalContext at top level (#573)');
assert.equal(output.hookSpecificOutput.hookEventName, 'SessionStart');
assert.match(
  output.hookSpecificOutput.additionalContext,
  /GELLMANN MODE ACTIVE — mode: work/,
);

result = run(
  'gellmann-mode-tracker.js',
  codexEnv,
  JSON.stringify({ prompt: '@gellmann solo' }),
);
assert.equal(result.status, 0, result.stderr);
assert.equal(fs.readFileSync(codexState, 'utf8'), 'solo');
output = JSON.parse(result.stdout);
assert.equal(output.systemMessage, 'GELLMANN:SOLO');

// Querying bare @gellmann should report the active mode ('solo') without resetting it to default ('work')
result = run(
  'gellmann-mode-tracker.js',
  codexEnv,
  JSON.stringify({ prompt: '@gellmann' }),
);
assert.equal(result.status, 0, result.stderr);
assert.equal(fs.readFileSync(codexState, 'utf8'), 'solo');
output = JSON.parse(result.stdout);
assert.equal(output.additionalContext, undefined, 'Codex must not emit additionalContext at top level (#573)');
assert.equal(output.hookSpecificOutput.hookEventName, 'UserPromptSubmit');
assert.match(
  output.hookSpecificOutput.additionalContext,
  /GELLMANN MODE ACTIVE — mode: solo/,
);

// "normal mode" is ponytail's/caveman's off switch, not gellmann's — it must
// not deactivate gellmann. It matches neither a /gellmann command nor
// isDeactivationCommand ("stop gellmann" only), so the hook no-ops: state
// untouched, nothing written to stdout.
result = run(
  'gellmann-mode-tracker.js',
  codexEnv,
  JSON.stringify({ prompt: 'normal mode' }),
);
assert.equal(result.status, 0, result.stderr);
assert.equal(fs.readFileSync(codexState, 'utf8'), 'solo', '"normal mode" must not deactivate gellmann');
assert.equal(result.stdout, '', '"normal mode" is not a gellmann command');

const claudeEnv = {
  HOME: home,
  USERPROFILE: home,
  GELLMANN_DEFAULT_MODE: 'solo',
};
delete claudeEnv.PLUGIN_DATA;

result = run('gellmann-activate.js', claudeEnv);
assert.equal(result.status, 0, result.stderr);
assert.equal(
  fs.readFileSync(path.join(home, '.claude', '.gellmann-active'), 'utf8'),
  'solo',
);

// Auto-detect: with no env/config default, activate resolves work vs solo from
// the cwd. Build a two-author temp repo and run the hook from inside it.
{
  const { execFileSync } = require('child_process');
  const repoDir = path.join(temp, 'team-repo');
  fs.mkdirSync(repoDir, { recursive: true });
  const g = (args, env = {}) => execFileSync('git', args, { cwd: repoDir, stdio: 'ignore', env: { ...process.env, GIT_CONFIG_GLOBAL: os.devNull, GIT_CONFIG_SYSTEM: os.devNull, ...env } });
  g(['init', '-q']);
  for (const [n, e] of [['A', 'a@x.io'], ['B', 'b@x.io']]) {
    fs.writeFileSync(path.join(repoDir, n + '.txt'), n);
    g(['add', '.']);
    g(['commit', '-qm', n], { GIT_AUTHOR_NAME: n, GIT_AUTHOR_EMAIL: e, GIT_COMMITTER_NAME: n, GIT_COMMITTER_EMAIL: e });
  }
  const detectEnv = { HOME: home, USERPROFILE: home, XDG_CONFIG_HOME: path.join(temp, 'xdg-empty') };
  const r = spawnSync(process.execPath, [path.join(root, 'hooks', 'gellmann-activate.js')], { cwd: repoDir, env: { ...process.env, ...detectEnv }, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /GELLMANN MODE ACTIVE — mode: work/);
  assert.equal(fs.readFileSync(path.join(home, '.claude', '.gellmann-active'), 'utf8'), 'work');
}

// "normal mode" must NOT deactivate gellmann (it is ponytail's and caveman's switch).
result = run('gellmann-mode-tracker.js', { HOME: home, USERPROFILE: home }, JSON.stringify({ prompt: 'normal mode' }));
assert.equal(result.status, 0, result.stderr);
assert.equal(fs.existsSync(path.join(home, '.claude', '.gellmann-active')), true, 'normal mode must leave the flag alone');

// "stop gellmann" does.
result = run('gellmann-mode-tracker.js', { HOME: home, USERPROFILE: home }, JSON.stringify({ prompt: 'stop gellmann' }));
assert.equal(fs.existsSync(path.join(home, '.claude', '.gellmann-active')), false);

// /gellmann-work and /gellmann-solo switch the persisted mode.
result = run('gellmann-mode-tracker.js', { HOME: home, USERPROFILE: home }, JSON.stringify({ prompt: '/gellmann-work orders/' }));
assert.equal(fs.readFileSync(path.join(home, '.claude', '.gellmann-active'), 'utf8'), 'work');
result = run('gellmann-mode-tracker.js', { HOME: home, USERPROFILE: home }, JSON.stringify({ prompt: '/gellmann-solo' }));
assert.equal(fs.readFileSync(path.join(home, '.claude', '.gellmann-active'), 'utf8'), 'solo');

// Copilot namespaces slash commands as /gellmann:gellmann-*; the mode tracker
// must normalize that prefix back to /gellmann-* before matching.
result = run('gellmann-mode-tracker.js', { HOME: home, USERPROFILE: home }, JSON.stringify({ prompt: '/gellmann:gellmann-work' }));
assert.equal(fs.readFileSync(path.join(home, '.claude', '.gellmann-active'), 'utf8'), 'work', 'Copilot-namespaced /gellmann:gellmann-work must switch mode like /gellmann-work');

// CLAUDE_CONFIG_DIR overrides ~/.claude for the flag file (issue #34).
const home2 = path.join(temp, 'home2');
fs.mkdirSync(home2, { recursive: true });
const customConfigDir = path.join(temp, 'custom-claude');
result = run('gellmann-activate.js', {
  HOME: home2,
  USERPROFILE: home2,
  CLAUDE_CONFIG_DIR: customConfigDir,
  GELLMANN_DEFAULT_MODE: 'solo',
});
assert.equal(result.status, 0, result.stderr);
assert.equal(
  fs.readFileSync(path.join(customConfigDir, '.gellmann-active'), 'utf8'),
  'solo',
);
assert.equal(
  fs.existsSync(path.join(home2, '.claude', '.gellmann-active')),
  false,
  'flag must not land in ~/.claude when CLAUDE_CONFIG_DIR is set',
);
// The statusline setup nudge must point at the configured settings.json, not a
// hardcoded ~/.claude (issue #250).
assert.ok(
  result.stdout.includes(path.join(customConfigDir, 'settings.json')),
  'statusline nudge must reference the CLAUDE_CONFIG_DIR settings.json',
);

// #483: the statusline nudge fires at most once — after it writes its flag, a
// later session stays silent instead of re-nagging on every start.
assert.ok(
  fs.existsSync(path.join(customConfigDir, '.gellmann-statusline-nudged')),
  'first nudge must write the once-only flag (#483)',
);
const secondNudge = run('gellmann-activate.js', {
  HOME: home2,
  USERPROFILE: home2,
  CLAUDE_CONFIG_DIR: customConfigDir,
  GELLMANN_DEFAULT_MODE: 'solo',
});
assert.equal(secondNudge.status, 0, secondNudge.stderr);
assert.ok(
  !secondNudge.stdout.includes('STATUSLINE SETUP NEEDED'),
  'nudge must not repeat once the flag file exists (#483)',
);

const copilotData = path.join(temp, 'copilot-data');
const codexData = path.join(temp, 'codex-data-shadow');
result = run('gellmann-activate.js', {
  HOME: home,
  USERPROFILE: home,
  COPILOT_PLUGIN_DATA: copilotData,
  PLUGIN_DATA: codexData,
  GELLMANN_DEFAULT_MODE: 'solo',
});
assert.equal(result.status, 0, result.stderr);
assert.equal(fs.readFileSync(path.join(copilotData, '.gellmann-active'), 'utf8'), 'solo');
assert.equal(
  fs.existsSync(path.join(codexData, '.gellmann-active')),
  false,
  'copilot hooks must not write mode state to codex PLUGIN_DATA',
);
output = JSON.parse(result.stdout);
assert.match(output.additionalContext, /GELLMANN MODE ACTIVE — mode: solo/);

// VS Code Copilot never sets COPILOT_PLUGIN_DATA — it only injects
// CLAUDE_PLUGIN_ROOT pointed at an agent-plugins/.../.vscode install path
// (#528). Without a fallback, isCopilot was false, so gellmann assumed
// native Claude Code and emitted the statusline nudge — noise, since VS
// Code Copilot doesn't read Claude's statusLine setting.
const vscodeHome = path.join(temp, 'vscode-copilot-home');
const vscodePluginRoot = path.join(
  vscodeHome, '.vscode', 'agent-plugins', 'github.com', 'tankanow', 'gellmann', 'hooks',
);
fs.mkdirSync(vscodeHome, { recursive: true });
result = run('gellmann-activate.js', {
  HOME: vscodeHome,
  USERPROFILE: vscodeHome,
  CLAUDE_PLUGIN_ROOT: vscodePluginRoot,
  GELLMANN_DEFAULT_MODE: 'solo',
});
assert.equal(result.status, 0, result.stderr);
assert.ok(
  !result.stdout.includes('STATUSLINE SETUP NEEDED'),
  'VS Code Copilot (detected via CLAUDE_PLUGIN_ROOT) must not get the Claude-only statusline nudge',
);
// isCopilot must still resolve a state dir even though COPILOT_PLUGIN_DATA
// is unset under VS Code — falling back to ~/.claude, not crashing on an
// undefined path.
assert.equal(
  fs.readFileSync(path.join(vscodeHome, '.claude', '.gellmann-active'), 'utf8'),
  'solo',
  'VS Code Copilot must persist mode state under getClaudeDir(), not a path built from the unset COPILOT_PLUGIN_DATA',
);

result = run(
  'gellmann-mode-tracker.js',
  {
    HOME: home,
    USERPROFILE: home,
    COPILOT_PLUGIN_DATA: copilotData,
    PLUGIN_DATA: codexData,
  },
  JSON.stringify({ prompt: '/gellmann work' }),
);
assert.equal(result.status, 0, result.stderr);
assert.equal(fs.readFileSync(path.join(copilotData, '.gellmann-active'), 'utf8'), 'work');
assert.equal(
  fs.existsSync(path.join(codexData, '.gellmann-active')),
  false,
  'copilot mode tracker must keep codex PLUGIN_DATA untouched',
);
output = JSON.parse(result.stdout);
assert.deepEqual(output, {});

// SubagentStart hook: when gellmann mode is active it injects the ruleset into
// each subagent (issue #252). Native Claude must get the hookSpecificOutput JSON
// form, not raw stdout, or the context is dropped.
const subHome = path.join(temp, 'sub-home');
const subFlag = path.join(subHome, '.claude', '.gellmann-active');
fs.mkdirSync(path.dirname(subFlag), { recursive: true });
const subEnv = { HOME: subHome, USERPROFILE: subHome };

fs.writeFileSync(subFlag, 'solo');
result = run('gellmann-subagent.js', subEnv);
assert.equal(result.status, 0, result.stderr);
output = JSON.parse(result.stdout);
assert.equal(output.hookSpecificOutput.hookEventName, 'SubagentStart');
assert.match(
  output.hookSpecificOutput.additionalContext,
  /GELLMANN MODE ACTIVE — mode: solo/,
);

// No flag → gellmann off → inject nothing (empty stdout, no failure).
fs.unlinkSync(subFlag);
result = run('gellmann-subagent.js', subEnv);
assert.equal(result.status, 0, result.stderr);
assert.equal(result.stdout, '', 'SubagentStart must stay silent when gellmann is off');

// Codex shares claude-codex-hooks.json, so SubagentStart is reachable under Codex
// too — assert the codex branch emits the badge plus hookSpecificOutput.
const subCodex = path.join(temp, 'sub-codex');
fs.mkdirSync(subCodex, { recursive: true });
fs.writeFileSync(path.join(subCodex, '.gellmann-active'), 'solo');
result = run('gellmann-subagent.js', { HOME: subHome, USERPROFILE: subHome, PLUGIN_DATA: subCodex });
assert.equal(result.status, 0, result.stderr);
output = JSON.parse(result.stdout);
assert.equal(output.systemMessage, 'GELLMANN:SOLO');
assert.equal(output.additionalContext, undefined, 'Codex must not emit additionalContext at top level (#573)');
assert.equal(output.hookSpecificOutput.hookEventName, 'SubagentStart');
assert.match(output.hookSpecificOutput.additionalContext, /GELLMANN MODE ACTIVE — mode: solo/);

// SubagentStart scoping (issue #506): GELLMANN_SUBAGENT_MATCHER limits the
// injection to agent types whose name matches the regex. Unset keeps the
// inject-into-every-subagent behavior asserted above. The matcher is
// case-insensitive and unanchored, and every uncertain case fails open.
const scopeHome = path.join(temp, 'scope-home');
const scopeFlag = path.join(scopeHome, '.claude', '.gellmann-active');
fs.mkdirSync(path.dirname(scopeFlag), { recursive: true });
fs.writeFileSync(scopeFlag, 'solo');
const scopeEnv = { HOME: scopeHome, USERPROFILE: scopeHome };

// Matching agent_type → inject; the match is case-insensitive.
result = run(
  'gellmann-subagent.js',
  { ...scopeEnv, GELLMANN_SUBAGENT_MATCHER: 'general|plan' },
  JSON.stringify({ agent_type: 'General-purpose' }),
);
assert.equal(result.status, 0, result.stderr);
output = JSON.parse(result.stdout);
assert.equal(output.hookSpecificOutput.hookEventName, 'SubagentStart');
assert.match(output.hookSpecificOutput.additionalContext, /GELLMANN MODE ACTIVE — mode: solo/);

// agent_type the matcher rejects → stay silent.
result = run(
  'gellmann-subagent.js',
  { ...scopeEnv, GELLMANN_SUBAGENT_MATCHER: 'general|plan' },
  JSON.stringify({ agent_type: 'Explore' }),
);
assert.equal(result.status, 0, result.stderr);
assert.equal(result.stdout, '', 'a non-matching agent_type must skip the injection');

// Anchored regex → exact match only; a superset name is rejected.
result = run(
  'gellmann-subagent.js',
  { ...scopeEnv, GELLMANN_SUBAGENT_MATCHER: '^general$' },
  JSON.stringify({ agent_type: 'general-purpose' }),
);
assert.equal(result.status, 0, result.stderr);
assert.equal(result.stdout, '', 'an anchored matcher must not match a superset agent_type');

// Matcher set but agent_type absent → the platform didn't report it; fail
// open and inject rather than silently dropping the persona (issue #252).
result = run(
  'gellmann-subagent.js',
  { ...scopeEnv, GELLMANN_SUBAGENT_MATCHER: 'general' },
  JSON.stringify({}),
);
assert.equal(result.status, 0, result.stderr);
output = JSON.parse(result.stdout);
assert.match(output.hookSpecificOutput.additionalContext, /GELLMANN MODE ACTIVE — mode: solo/);

// Invalid regex → must not crash; fall back to injecting everywhere.
result = run(
  'gellmann-subagent.js',
  { ...scopeEnv, GELLMANN_SUBAGENT_MATCHER: '(' },
  JSON.stringify({ agent_type: 'anything' }),
);
assert.equal(result.status, 0, result.stderr);
output = JSON.parse(result.stdout);
assert.equal(output.hookSpecificOutput.hookEventName, 'SubagentStart');

// The default (no matcher) path must not depend on stdin: even with stdin
// closed empty it injects synchronously, preserving the #252 behavior on
// Windows where the piped JSON can be swallowed (#443).
result = run('gellmann-subagent.js', scopeEnv, '');
assert.equal(result.status, 0, result.stderr);
output = JSON.parse(result.stdout);
assert.match(output.hookSpecificOutput.additionalContext, /GELLMANN MODE ACTIVE — mode: solo/);

// Qoder: no SessionStart event, so UserPromptSubmit does double duty —
// it activates the default mode on first prompt (writes flag), then injects
// the ruleset via additionalContext on every prompt. Output is
// hookSpecificOutput JSON (same shape as Codex minus systemMessage).
const qoderHome = path.join(temp, 'qoder-home');
const qoderState = path.join(qoderHome, '.qoder', '.gellmann-active');
fs.mkdirSync(qoderHome, { recursive: true });

const qoderEnv = {
  HOME: qoderHome,
  USERPROFILE: qoderHome,
  QODER_SESSION_ID: 'test-session-123',
  GELLMANN_DEFAULT_MODE: 'solo',
};

// First prompt: no flag file yet → mode-tracker initializes from default,
// writes flag, and injects the ruleset.
result = run(
  'gellmann-mode-tracker.js',
  qoderEnv,
  JSON.stringify({ prompt: 'write a function' }),
);
assert.equal(result.status, 0, result.stderr);
assert.equal(fs.readFileSync(qoderState, 'utf8'), 'solo');
output = JSON.parse(result.stdout);
assert.equal(output.hookSpecificOutput.hookEventName, 'UserPromptSubmit');
assert.match(
  output.hookSpecificOutput.additionalContext,
  /GELLMANN MODE ACTIVE — mode: solo/,
);

// /gellmann work: mode tracker updates flag and injects work ruleset.
result = run(
  'gellmann-mode-tracker.js',
  qoderEnv,
  JSON.stringify({ prompt: '/gellmann work' }),
);
assert.equal(result.status, 0, result.stderr);
assert.equal(fs.readFileSync(qoderState, 'utf8'), 'work');
output = JSON.parse(result.stdout);
assert.match(
  output.hookSpecificOutput.additionalContext,
  /GELLMANN MODE CHANGED — mode: work/,
);

// "stop gellmann": deactivates, clears flag, no ruleset output.
result = run(
  'gellmann-mode-tracker.js',
  qoderEnv,
  JSON.stringify({ prompt: 'stop gellmann' }),
);
assert.equal(result.status, 0, result.stderr);
assert.equal(fs.existsSync(qoderState), false, 'flag must be cleared after stop gellmann');
output = JSON.parse(result.stdout);
assert.equal(output.hookSpecificOutput.additionalContext, 'GELLMANN MODE OFF');

// Subagent injection via PreToolUse (task|Task matcher): when gellmann is
// active, the subagent hook injects the ruleset. Qoder shares the same
// gellmann-subagent.js script; the isQoder branch outputs hookSpecificOutput
// JSON instead of raw stdout.
fs.writeFileSync(qoderState, 'solo');
result = run('gellmann-subagent.js', qoderEnv);
assert.equal(result.status, 0, result.stderr);
output = JSON.parse(result.stdout);
assert.equal(output.hookSpecificOutput.hookEventName, 'SubagentStart');
assert.match(
  output.hookSpecificOutput.additionalContext,
  /GELLMANN MODE ACTIVE — mode: solo/,
);
// writeDefaultMode must merge into existing config, not overwrite it (#490).
const mergeHome = path.join(temp, 'merge-home');
const mergeConfigDir = path.join(mergeHome, '.config', 'gellmann');
fs.mkdirSync(mergeConfigDir, { recursive: true });
const mergeConfigPath = path.join(mergeConfigDir, 'config.json');
fs.writeFileSync(mergeConfigPath, JSON.stringify({ defaultMode: 'solo', customSetting: 42 }, null, 2));

const prevXdg = process.env.XDG_CONFIG_HOME;
process.env.XDG_CONFIG_HOME = path.join(mergeHome, '.config');
try {
  writeDefaultMode('work');
  const merged = JSON.parse(fs.readFileSync(mergeConfigPath, 'utf8'));
  assert.equal(merged.defaultMode, 'work', 'writeDefaultMode must update defaultMode');
  assert.equal(merged.customSetting, 42, 'writeDefaultMode must preserve existing config fields');
} finally {
  if (prevXdg === undefined) delete process.env.XDG_CONFIG_HOME;
  else process.env.XDG_CONFIG_HOME = prevXdg;
}

// #329: `/gellmann default <mode>` persists the default to config (survives
// restart), while a plain switch stays session-scoped and never touches config.
const defHome = path.join(temp, 'default-cmd-home');
const defEnv = { HOME: defHome, USERPROFILE: defHome, XDG_CONFIG_HOME: path.join(defHome, '.config') };
const defConfig = path.join(defHome, '.config', 'gellmann', 'config.json');
const defFlag = path.join(defHome, '.claude', '.gellmann-active');

result = run('gellmann-mode-tracker.js', defEnv, JSON.stringify({ prompt: '/gellmann default solo' }));
assert.equal(result.status, 0, result.stderr);
assert.equal(JSON.parse(fs.readFileSync(defConfig, 'utf8')).defaultMode, 'solo', '/gellmann default must persist the default');
assert.equal(fs.existsSync(defFlag), false, '/gellmann default must not change the session mode');

// A plain switch is transient: sets the session flag, leaves the default alone.
result = run('gellmann-mode-tracker.js', defEnv, JSON.stringify({ prompt: '/gellmann work' }));
assert.equal(result.status, 0, result.stderr);
assert.equal(fs.readFileSync(defFlag, 'utf8'), 'work', 'plain switch must set the session mode');
assert.equal(JSON.parse(fs.readFileSync(defConfig, 'utf8')).defaultMode, 'solo', 'plain switch must not persist the default');

// review is not a valid default (#377) — the command is ignored, config unchanged.
result = run('gellmann-mode-tracker.js', defEnv, JSON.stringify({ prompt: '/gellmann default review' }));
assert.equal(result.status, 0, result.stderr);
assert.equal(JSON.parse(fs.readFileSync(defConfig, 'utf8')).defaultMode, 'solo', 'review must not be accepted as a default');

// review must be refused as a default by the config functions too, not only the
// mode-tracker command path (#377): writing it is a no-op, and a stray
// GELLMANN_DEFAULT_MODE=review falls back to the built-in default.
const revHome = path.join(temp, 'review-default-home');
const revConfigDir = path.join(revHome, '.config', 'gellmann');
fs.mkdirSync(revConfigDir, { recursive: true });
const revConfigPath = path.join(revConfigDir, 'config.json');
fs.writeFileSync(revConfigPath, JSON.stringify({ defaultMode: 'solo' }, null, 2));

const prevXdgRev = process.env.XDG_CONFIG_HOME;
const prevEnvModeRev = process.env.GELLMANN_DEFAULT_MODE;
process.env.XDG_CONFIG_HOME = path.join(revHome, '.config');
try {
  assert.equal(writeDefaultMode('review'), null, 'writeDefaultMode must refuse review as a default (#377)');
  assert.equal(JSON.parse(fs.readFileSync(revConfigPath, 'utf8')).defaultMode, 'solo', 'a refused review write must leave the config unchanged');

  delete process.env.GELLMANN_DEFAULT_MODE;
  fs.rmSync(revConfigPath);
  process.env.GELLMANN_DEFAULT_MODE = 'review';
  assert.equal(getDefaultMode(), DEFAULT_MODE, 'GELLMANN_DEFAULT_MODE=review must fall back to the built-in default');
} finally {
  if (prevXdgRev === undefined) delete process.env.XDG_CONFIG_HOME; else process.env.XDG_CONFIG_HOME = prevXdgRev;
  if (prevEnvModeRev === undefined) delete process.env.GELLMANN_DEFAULT_MODE; else process.env.GELLMANN_DEFAULT_MODE = prevEnvModeRev;
}

console.log('hook compatibility checks passed');
