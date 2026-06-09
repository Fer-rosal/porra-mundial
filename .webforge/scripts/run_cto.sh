#!/bin/bash
# =============================================================================
# WebForge — run_cto.sh
# Launches the CTO agent as an interactive Claude Code session.
#
# This is NOT a polling loop — it opens a Claude Code session where:
#   - The CTO CLAUDE.md is loaded as context
#   - You can interact when agents need input
#   - The CTO uses Task tool to spawn subagents
#
# Usage (from project root):
#   bash .webforge/scripts/run_cto.sh
# =============================================================================

set -uo pipefail

# ─────────────────────────────────────────────────────────────────────────────
# Resolve WEBFORGE_ROOT from this script's own absolute path
# ─────────────────────────────────────────────────────────────────────────────
_SELF="${BASH_SOURCE[0]}"
while [[ -L "$_SELF" ]]; do
  _SELF="$(cd "$(dirname "$_SELF")" && pwd)/$(readlink "$_SELF")"
done
WEBFORGE_ROOT="$(cd "$(dirname "$_SELF")/.." && pwd)"
unset _SELF

INBOX_PROTOCOL="$WEBFORGE_ROOT/scripts/inbox_protocol.sh"
if [[ ! -f "$INBOX_PROTOCOL" ]]; then
  echo "[webforge] ERROR: inbox_protocol.sh not found at: $INBOX_PROTOCOL" >&2
  exit 1
fi
source "$INBOX_PROTOCOL"

PROJECT_PATH="${PROJECT_PATH:-$(cd "$WEBFORGE_ROOT/.." && pwd)}"
CTO_DIR="$WEBFORGE_ROOT/agents/cto"
CTO_CLAUDE_MD="$CTO_DIR/CLAUDE.md"
LOG_DIR="$WEBFORGE_ROOT/logs/cto"

PROJECT_NAME="$(config_get project 2>/dev/null || basename "$PROJECT_PATH")"

mkdir -p "$LOG_DIR"

if [[ ! -f "$CTO_CLAUDE_MD" ]]; then
  echo "[webforge] ERROR: $CTO_CLAUDE_MD not found" >&2
  exit 1
fi

if ! command -v claude &>/dev/null; then
  echo "[webforge] ERROR: 'claude' CLI not found. Install Claude Code first." >&2
  exit 1
fi

# ─────────────────────────────────────────────────────────────────────────────
# Show current state
# ─────────────────────────────────────────────────────────────────────────────
echo "╔══════════════════════════════════════╗"
echo "║   WebForge — Starting CTO Session    ║"
echo "╚══════════════════════════════════════╝"
echo "  Project   : $PROJECT_NAME"
echo "  Root      : $PROJECT_PATH"
echo "  Framework : $WEBFORGE_ROOT"
echo ""
inbox_status
echo ""
echo "  Claude Code will open an interactive session."
echo "  The CTO agent will read its CLAUDE.md and act."
echo "  You can interact whenever agents need input."
echo ""

# ─────────────────────────────────────────────────────────────────────────────
# Build the initial prompt — state snapshot the CTO sees on startup
# ─────────────────────────────────────────────────────────────────────────────
AGENT_STATE=""
for agent in cto po architect frontend backend qa ux; do
  if [[ -f "$WEBFORGE_ROOT/agents/$agent/actual_job.md" ]]; then
    AGENT_STATE+="- $agent: WORKING"$'\n'
  elif [[ -f "$WEBFORGE_ROOT/agents/$agent/inbox.md" ]]; then
    AGENT_STATE+="- $agent: INBOX PENDING"$'\n'
  else
    AGENT_STATE+="- $agent: idle"$'\n'
  fi
done

CTO_JOB_CONTENT=""
if [[ -f "$CTO_DIR/actual_job.md" ]]; then
  CTO_JOB_CONTENT=$'\n## Your active job\n'"$(cat "$CTO_DIR/actual_job.md")"
fi

INITIAL_PROMPT="You are the WebForge CTO agent for project '$PROJECT_NAME'.

## Environment
- WEBFORGE_ROOT: $WEBFORGE_ROOT
- PROJECT_PATH: $PROJECT_PATH
- Timestamp: $(_wf_timestamp)

## Current Agent States
$AGENT_STATE
$CTO_JOB_CONTENT

## Instructions
1. Read your full rules at: $CTO_CLAUDE_MD
2. Act on any INBOX PENDING agents — claim their inbox and spawn them as subagents
3. When an agent needs user input, ask me directly in this conversation
4. Keep me informed of progress as agents complete their work
5. When all agents have finished, open the PR and notify me to review"

# ─────────────────────────────────────────────────────────────────────────────
# Launch interactive Claude Code session from the project root.
# No -p flag = interactive mode, user can respond when needed.
# --allowedTools controls what the CTO session can do.
# ─────────────────────────────────────────────────────────────────────────────
cd "$PROJECT_PATH"

exec claude \
  --allowedTools "Task,Read,Write,Bash,TodoRead,TodoWrite" \
  --append-system-prompt "$(cat "$CTO_CLAUDE_MD")" \
  "$INITIAL_PROMPT"
