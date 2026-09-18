#!/usr/bin/env bash
# CLAUDE_CONFIG_DIR overrides ~/.claude, matching where the hooks write the flag.
flag="${CLAUDE_CONFIG_DIR:-$HOME/.claude}/.gellmann-active"
[ -f "$flag" ] || exit 0
mode=$(head -n1 "$flag" | tr -d '[:space:]')
[ -z "$mode" ] && exit 0
# work is green (people), solo is blue (books). The mode is in the text too.
color=110
[ "$mode" = "work" ] && color=108
printf '\033[38;5;%sm[GELLMANN:%s]\033[0m' "$color" "$(printf '%s' "$mode" | tr '[:lower:]' '[:upper:]')"
