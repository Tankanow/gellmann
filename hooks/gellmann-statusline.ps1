# CLAUDE_CONFIG_DIR overrides ~/.claude, matching where the hooks write the flag (issue #34)
$ClaudeDir = if ($env:CLAUDE_CONFIG_DIR) { $env:CLAUDE_CONFIG_DIR } else { Join-Path $HOME ".claude" }
$Flag = Join-Path $ClaudeDir ".gellmann-active"
if (-not (Test-Path $Flag)) {
    exit 0
}

$Mode = ""
try {
    $Mode = (Get-Content $Flag -ErrorAction Stop | Select-Object -First 1).Trim()
} catch {
    exit 0
}

if ([string]::IsNullOrEmpty($Mode)) {
    exit 0
}

$Esc = [char]27
# work is green (people), solo is blue (books). The mode is still in the text.
$Color = if ($Mode -eq "work") { "108" } else { "110" }
$Suffix = $Mode.ToUpperInvariant()
[Console]::Write("${Esc}[38;5;${Color}m[GELLMANN:$Suffix]${Esc}[0m")
