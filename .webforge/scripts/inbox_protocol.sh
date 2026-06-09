#!/bin/bash
# =============================================================================
# WebForge — inbox_protocol.sh
# Shared functions for all agents. Source this file at the top of any agent
# script. Resolves paths relative to WEBFORGE_ROOT (the .webforge/ directory).
#
# Usage: source "$(dirname "$0")/../scripts/inbox_protocol.sh"
# =============================================================================

# WEBFORGE_ROOT must be set before sourcing, or we infer it
if [[ -z "${WEBFORGE_ROOT:-}" ]]; then
  WEBFORGE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
fi

AGENTS_DIR="$WEBFORGE_ROOT/agents"
LOGS_DIR="$WEBFORGE_ROOT/logs"
CONFIG_FILE="$WEBFORGE_ROOT/config.json"

# -----------------------------------------------------------------------------
# _wf_timestamp
# ISO-like timestamp for log entries
# -----------------------------------------------------------------------------
_wf_timestamp() {
  date "+%Y-%m-%d %H:%M:%S"
}

# -----------------------------------------------------------------------------
# inbox_has_work <agent_name>
# Returns 0 (true) if the agent has a pending inbox.md
# -----------------------------------------------------------------------------
inbox_has_work() {
  local agent="$1"
  [[ -f "$AGENTS_DIR/$agent/inbox.md" ]]
}

# -----------------------------------------------------------------------------
# inbox_is_busy <agent_name>
# Returns 0 (true) if the agent is currently working (actual_job.md exists)
# -----------------------------------------------------------------------------
inbox_is_busy() {
  local agent="$1"
  [[ -f "$AGENTS_DIR/$agent/actual_job.md" ]]
}

# -----------------------------------------------------------------------------
# inbox_claim <agent_name>
# Renames inbox.md → actual_job.md so the agent claims the work.
# If actual_job.md already exists, appends inbox content and removes inbox.
# -----------------------------------------------------------------------------
inbox_claim() {
  local agent="$1"
  local inbox="$AGENTS_DIR/$agent/inbox.md"
  local job="$AGENTS_DIR/$agent/actual_job.md"

  if [[ ! -f "$inbox" ]]; then
    echo "[webforge] WARNING: No inbox.md found for $agent" >&2
    return 1
  fi

  if [[ -f "$job" ]]; then
    printf '\n---\n<!-- Task appended: %s -->\n\n' "$(_wf_timestamp)" >> "$job"
    cat "$inbox" >> "$job"
    rm "$inbox"
    echo "[webforge] [$agent] Appended new task to existing actual_job.md"
  else
    mv "$inbox" "$job"
    echo "[webforge] [$agent] Claimed inbox → actual_job.md"
  fi
}

# -----------------------------------------------------------------------------
# inbox_complete <agent_name> <feature_slug>
# Moves actual_job.md → logs/<agent>/<feature_slug>_YYYY-MM-DD.md
# -----------------------------------------------------------------------------
inbox_complete() {
  local agent="$1"
  local feature_slug="$2"
  local job="$AGENTS_DIR/$agent/actual_job.md"
  local date_str
  date_str=$(date +%Y-%m-%d)
  local archive_dir="$LOGS_DIR/$agent"
  local archive_path="$archive_dir/${feature_slug}_${date_str}.md"

  mkdir -p "$archive_dir"

  if [[ ! -f "$job" ]]; then
    echo "[webforge] WARNING: No actual_job.md found for $agent" >&2
    return 1
  fi

  mv "$job" "$archive_path"
  echo "[webforge] [$agent] Job archived → $archive_path"
}

# -----------------------------------------------------------------------------
# inbox_send <target_agent> <content_or_file>
# Writes or appends a task to target agent's inbox.md
#   - Pass a string directly, or
#   - Prefix with @ to send a file: inbox_send architect @/path/to/spec.md
# -----------------------------------------------------------------------------
inbox_send() {
  local target="$1"
  local content="$2"
  local target_inbox="$AGENTS_DIR/$target/inbox.md"

  mkdir -p "$AGENTS_DIR/$target"

  if [[ -f "$target_inbox" ]]; then
    printf '\n---\n<!-- Task received: %s -->\n\n' "$(_wf_timestamp)" >> "$target_inbox"
  else
    printf '<!-- inbox.md — %s agent | created: %s -->\n\n' "$target" "$(_wf_timestamp)" > "$target_inbox"
  fi

  if [[ "$content" == @* ]]; then
    local file_path="${content:1}"
    if [[ -f "$file_path" ]]; then
      cat "$file_path" >> "$target_inbox"
    else
      echo "[webforge] ERROR: File not found: $file_path" >&2
      return 1
    fi
  else
    printf '%s\n' "$content" >> "$target_inbox"
  fi

  echo "[webforge] Message sent → $target/inbox.md"
}

# -----------------------------------------------------------------------------
# inbox_status
# Prints current status of all agent inboxes
# -----------------------------------------------------------------------------
inbox_status() {
  local project_name="unknown"
  if [[ -f "$CONFIG_FILE" ]] && command -v python3 &>/dev/null; then
    project_name=$(python3 -c "import json,sys; d=json.load(open('$CONFIG_FILE')); print(d.get('project','unknown'))" 2>/dev/null || echo "unknown")
  fi

  echo "╔══════════════════════════════════════╗"
  printf "║  WebForge %-26s║\n" "[$project_name]"
  printf "║  %s               ║\n" "$(_wf_timestamp)"
  echo "╠══════════════════════════════════════╣"
  for agent in cto po architect frontend backend qa ux; do
    local dir="$AGENTS_DIR/$agent"
    local icon="○"
    local label="idle"
    if [[ -f "$dir/actual_job.md" ]]; then
      icon="◉"; label="working"
    elif [[ -f "$dir/inbox.md" ]]; then
      icon="◈"; label="inbox pending"
    fi
    printf "║  %-12s %s %-18s║\n" "$agent" "$icon" "$label"
  done
  echo "╚══════════════════════════════════════╝"
}

# -----------------------------------------------------------------------------
# config_get <key>
# Read a top-level key from config.json (requires python3)
# Example: config_get project → "my-app"
# Example: config_get stack.frontend → "next.js"
# -----------------------------------------------------------------------------
config_get() {
  local key="$1"
  if [[ ! -f "$CONFIG_FILE" ]]; then
    echo "[webforge] WARNING: config.json not found" >&2
    return 1
  fi
  python3 -c "
import json, sys
d = json.load(open('$CONFIG_FILE'))
keys = '$key'.split('.')
val = d
for k in keys:
    val = val.get(k, None)
    if val is None:
        break
print(val if val is not None else '')
" 2>/dev/null
}
