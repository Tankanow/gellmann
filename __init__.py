"""Hermes plugin for Gellmann."""

from __future__ import annotations

import json
import os
import re
import subprocess
from pathlib import Path
from typing import Any, Callable

DEFAULT_MODE = "solo"
RUNTIME_MODES = {"off", "work", "solo"}
CONFIG_MODES = RUNTIME_MODES | {"review"}
SKILL_COMMANDS = {
    "gellmann-work": "Find the teammates and internal record that own this domain; draft the questions.",
    "gellmann-solo": "Find canonical primary sources for this domain; cite or say could-not-verify.",
    "gellmann-review": "Expert review of an output: facts, sources, logic, framing, hidden assumptions.",
    "gellmann-help": "Show the Gellmann command reference.",
}
PERSONA_COMMANDS = {"gellmann-work": "work", "gellmann-solo": "solo"}

ROOT = Path(__file__).resolve().parent
SKILLS_DIR = ROOT / "skills"
GELLMANN_SKILL = SKILLS_DIR / "gellmann" / "SKILL.md"
REVIEW_SKILL = SKILLS_DIR / "gellmann-review" / "SKILL.md"

_current_mode = None


def _normalize_runtime_mode(mode: str | None) -> str | None:
    if not isinstance(mode, str):
        return None
    mode = mode.strip().lower()
    return mode if mode in RUNTIME_MODES else None


def _normalize_config_mode(mode: str | None) -> str | None:
    if not isinstance(mode, str):
        return None
    mode = mode.strip().lower()
    return mode if mode in CONFIG_MODES else None


def _config_dir() -> Path:
    if os.environ.get("XDG_CONFIG_HOME"):
        return Path(os.environ["XDG_CONFIG_HOME"]) / "gellmann"
    if os.name == "nt":
        return Path(os.environ.get("APPDATA", Path.home() / "AppData" / "Roaming")) / "gellmann"
    return Path.home() / ".config" / "gellmann"


CODEOWNERS_PATHS = ("CODEOWNERS", ".github/CODEOWNERS", "docs/CODEOWNERS")


def _detect_mode(cwd: str | None = None) -> str:
    """work if the repo shows teammates (CODEOWNERS or 2+ authors), else solo."""
    root = Path(cwd or os.getcwd())
    try:
        if any((root / rel).exists() for rel in CODEOWNERS_PATHS):
            return "work"
        out = subprocess.run(
            ["git", "log", "--format=%aE", "-n", "200"],
            cwd=root, capture_output=True, text=True, timeout=2, check=False,
        ).stdout
        authors = {line.strip().lower() for line in out.splitlines() if line.strip()}
        if len(authors) >= 2:
            return "work"
    except Exception:
        pass
    return "solo"


def _default_mode() -> str:
    env_mode = _normalize_config_mode(os.environ.get("GELLMANN_DEFAULT_MODE"))
    if env_mode:
        return env_mode
    try:
        data = json.loads((_config_dir() / "config.json").read_text(encoding="utf-8"))
        file_mode = _normalize_config_mode(data.get("defaultMode"))
        if file_mode:
            return file_mode
    except Exception:
        pass
    return _detect_mode()


def _strip_frontmatter(text: str) -> str:
    return re.sub(r"^---[\s\S]*?---\s*", "", text or "", count=1)


def _filter_skill_body_for_mode(body: str, mode: str) -> str:
    effective = _normalize_runtime_mode(mode) or DEFAULT_MODE
    lines = []
    for line in _strip_frontmatter(body).splitlines():
        table_label = re.match(r"^\|\s*\*\*(.+?)\*\*\s*\|", line)
        if table_label:
            label_mode = _normalize_runtime_mode(table_label.group(1))
            if label_mode and label_mode != effective:
                continue

        example_label = re.match(r'^-\s*([^:]+):\s*"', line)
        if example_label:
            label_mode = _normalize_runtime_mode(example_label.group(1))
            if label_mode and label_mode != effective:
                continue

        lines.append(line)
    return "\n".join(lines)


def _fallback_instructions(mode: str) -> str:
    return (
        f"GELLMANN MODE ACTIVE — mode: {mode}\n\n"
        "You are the expert reader of your own output. The Gell-Mann Amnesia effect: an expert opens an article in their own field, finds it backward (\"wet streets cause rain\"), then turns the page and believes the next one. Do not turn the page.\n\n"
        "Before presenting any output that makes a claim:\n\n"
        "1. Name the domain it touches and your actual footing in it. Fluency is not footing.\n"
        "2. Mark every load-bearing claim: proven (observed this session), sourced (a citation that opens), hypothesis (you can argue for it), assumption (taken as given), or unknown. A conclusion drawn from an observation is not itself observed.\n"
        "3. Hunt \"wet streets cause rain\": reversed causality, version-specific facts stated as timeless, a default that sounds right, a generalization from one example, common knowledge with no owner.\n"
        "4. Separate mechanism from framing: showing the code does X proves X, not that X is a bug, the cause, or a best practice.\n"
        "5. Go find out through the active mode. work: find who owns the domain (CODEOWNERS, git blame, ADRs, wikis, Slack, Confluence, tickets) and what the internal record already says; end with who to ask and what to ask, and never post on the user's behalf. solo: find the canonical primary source (spec, RFC, official reference for the exact version, upstream source, paper, standard); secondary sources count only as published critics of a named primary.\n"
        "6. Present with the ledger visible. Append one line per unresolved claim: `Verify: <claim> — <who or what settles it>`. Append nothing when everything is proven or sourced.\n\n"
        "Rules:\n\n"
        "- Confidence is not proof. Memory is not proof. A plausible inference is a hypothesis.\n"
        "- Never invent a source. A citation you cannot open does not exist.\n"
        "- A secondary source counts only when it is a published critique of a named primary source.\n"
        "- Mark specifically, not uniformly. Uniform hedging is as useless as uniform confidence.\n"
        "- Load-bearing negatives (\"X doesn't support\", \"there is no way\") get the hardest look: state what you searched and what you did not.\n\n"
        "Not hedged: what you directly observed this session; what you could verify yourself with a tool you have (do it); the work itself (deliver it, then flag). Gellmann governs what you claim and how you verify it, not what you build or how you talk. Off: \"stop gellmann\"."
        f"\n\nCurrent mode: **{mode}**. Switch: `/gellmann work|solo`."
    )


def build_injected_context(mode: str | None = None) -> str:
    """Return the mode-filtered Gellmann context injected before LLM turns."""
    configured = _normalize_config_mode(mode) or _default_mode()
    if configured == "off":
        return ""
    if configured == "review":
        try:
            body = REVIEW_SKILL.read_text(encoding="utf-8")
            return f"GELLMANN MODE ACTIVE — mode: review\n\n{_strip_frontmatter(body)}"
        except OSError:
            return "GELLMANN MODE ACTIVE — mode: review. Expert review of an output: facts, sources, logic, framing, hidden assumptions."

    effective = _normalize_runtime_mode(configured) or DEFAULT_MODE
    try:
        body = GELLMANN_SKILL.read_text(encoding="utf-8")
        return f"GELLMANN MODE ACTIVE — mode: {effective}\n\n{_filter_skill_body_for_mode(body, effective)}"
    except OSError:
        return _fallback_instructions(effective)


def _pre_llm_call(session_id: str = "", **_: Any) -> dict[str, str] | None:
    global _current_mode
    if _current_mode is None:
        _current_mode = _default_mode()
    context = build_injected_context(_current_mode)
    return {"context": context} if context else None


def _skill_prompt(command: str, args: str = "") -> str:
    tail = args.strip()
    target = f"\n\nUser arguments: {tail}" if tail else ""
    return (
        f"Load and follow the Hermes plugin skill `gellmann:{command}`. "
        f"{SKILL_COMMANDS[command]}{target}"
    )


def _slash_access_denied(event: Any, gateway: Any, command: str) -> bool:
    if gateway is None or event is None:
        return False
    checker = getattr(gateway, "_check_slash_access", None)
    source = getattr(event, "source", None)
    if checker is None or source is None:
        return False
    try:
        return checker(source, command) is not None
    except Exception:
        return True


def rewrite_gateway_command(event: Any = None, gateway: Any = None, **_: Any) -> dict[str, str] | None:
    """Rewrite authorized gateway /gellmann-* commands into normal agent prompts."""
    text = str(getattr(event, "text", "") or "").strip()
    if not text.startswith("/"):
        return None
    head, _, rest = text[1:].partition(" ")
    command = head.replace("_", "-").lower()
    if command not in SKILL_COMMANDS:
        return None
    if _slash_access_denied(event, gateway, command):
        return None
    return {"action": "rewrite", "text": _skill_prompt(command, rest)}


def _handle_mode_command(raw_args: str) -> str:
    global _current_mode
    arg = (raw_args or "").strip().lower()
    if not arg:
        mode = _current_mode or _default_mode()
        return f"Gellmann mode: {mode}. Use `/gellmann work|solo|off`."
    mode = _normalize_runtime_mode(arg)
    if not mode:
        return "Usage: /gellmann [work|solo|off]"
    _current_mode = mode
    return f"Gellmann mode set to {mode}."


def _make_skill_command_handler(ctx: Any, command: str) -> Callable[[str], str]:
    def handler(raw_args: str) -> str:
        global _current_mode
        if command in PERSONA_COMMANDS:
            _current_mode = PERSONA_COMMANDS[command]
        prompt = _skill_prompt(command, raw_args or "")
        injected = False
        try:
            injected = bool(ctx.inject_message(prompt))
        except Exception:
            injected = False
        if injected:
            return f"Queued `{command}` for the agent."
        return prompt

    return handler


def register(ctx: Any) -> None:
    """Register Gellmann hooks, skills, and slash commands with Hermes."""
    for child in sorted(SKILLS_DIR.iterdir() if SKILLS_DIR.exists() else []):
        skill_md = child / "SKILL.md"
        if child.is_dir() and skill_md.exists():
            ctx.register_skill(child.name, skill_md)

    ctx.register_hook("pre_llm_call", _pre_llm_call)
    ctx.register_hook("pre_gateway_dispatch", rewrite_gateway_command)

    ctx.register_command(
        "gellmann",
        _handle_mode_command,
        description="Set Gellmann mode: work, solo, or off.",
        args_hint="[work|solo|off]",
    )
    for command, description in SKILL_COMMANDS.items():
        ctx.register_command(
            command,
            _make_skill_command_handler(ctx, command),
            description=description,
            args_hint="[target or notes]",
        )
