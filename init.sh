#!/bin/bash
# =============================================================================
# WebForge — init.sh
# Installs the .webforge/ framework into any existing project repo.
# Future: this logic will be wrapped by `npx webforge init`
#
# Usage:
#   cd /path/to/your/project
#   bash /path/to/webforge/scripts/init.sh
# =============================================================================

set -euo pipefail

# Colours
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

info()    { echo -e "${CYAN}[webforge]${RESET} $*"; }
success() { echo -e "${GREEN}[webforge]${RESET} ✓ $*"; }
warn()    { echo -e "${YELLOW}[webforge]${RESET} ⚠ $*"; }
error()   { echo -e "${RED}[webforge]${RESET} ✗ $*" >&2; exit 1; }
ask()     { echo -e "${BOLD}$*${RESET}"; }

# Where is this script? (source of agent templates)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRAMEWORK_SOURCE="$(cd "$SCRIPT_DIR/.." && pwd)"

# Where are we installing? (current working directory = user's project root)
PROJECT_ROOT="$(pwd)"
WEBFORGE_DIR="$PROJECT_ROOT/.webforge"

echo ""
echo -e "${BOLD}╔══════════════════════════════════════╗${RESET}"
echo -e "${BOLD}║       WebForge Agent Framework       ║${RESET}"
echo -e "${BOLD}╚══════════════════════════════════════╝${RESET}"
echo ""
info "Installing into: $PROJECT_ROOT"
echo ""

# Guard: don't install inside the framework source itself
if [[ "$PROJECT_ROOT" == "$FRAMEWORK_SOURCE" ]]; then
  error "Run this script from your project directory, not from the webforge source directory."
fi

# Guard: already installed?
if [[ -d "$WEBFORGE_DIR" ]]; then
  ask "⚠ .webforge/ already exists. Reinitialise? This will overwrite agent prompts but keep logs and config. [y/N]"
  read -r confirm
  [[ "$confirm" =~ ^[Yy]$ ]] || { info "Aborted."; exit 0; }
fi

# ─────────────────────────────────────────────────────────────────────────────
# Step 1: Detect project context
# ─────────────────────────────────────────────────────────────────────────────
info "Scanning project..."

PROJECT_NAME="$(basename "$PROJECT_ROOT")"
DETECTED_FRONTEND=""
DETECTED_STYLING=""
DETECTED_BACKEND=""
DETECTED_DATABASE=""
DETECTED_AUTH=""
BASE_BRANCH="main"

# Detect stack from package.json
if [[ -f "$PROJECT_ROOT/package.json" ]]; then
  PKG=$(cat "$PROJECT_ROOT/package.json")

  echo "$PKG" | grep -q '"next"'       && DETECTED_FRONTEND="next.js"
  echo "$PKG" | grep -q '"react"'      && [[ -z "$DETECTED_FRONTEND" ]] && DETECTED_FRONTEND="react"
  echo "$PKG" | grep -q '"vue"'        && DETECTED_FRONTEND="vue"
  echo "$PKG" | grep -q '"svelte"'     && DETECTED_FRONTEND="svelte"
  echo "$PKG" | grep -q '"tailwindcss"' && DETECTED_STYLING="tailwind"
  echo "$PKG" | grep -q '"express"'    && DETECTED_BACKEND="express"
  echo "$PKG" | grep -q '"fastify"'    && DETECTED_BACKEND="fastify"
  echo "$PKG" | grep -q '"@supabase"'  && DETECTED_DATABASE="supabase"
  echo "$PKG" | grep -q '"mongoose"'   && DETECTED_DATABASE="mongodb"
  echo "$PKG" | grep -q '"prisma"'     && DETECTED_DATABASE="prisma"
  echo "$PKG" | grep -q '"next-auth"'  && DETECTED_AUTH="next-auth"
  echo "$PKG" | grep -q '"clerk"'      && DETECTED_AUTH="clerk"
fi

# Detect base branch
if git -C "$PROJECT_ROOT" rev-parse --is-inside-work-tree &>/dev/null 2>&1; then
  if git -C "$PROJECT_ROOT" show-ref --verify --quiet refs/heads/develop; then
    BASE_BRANCH="develop"
  fi
fi

# Show what we found
[[ -n "$DETECTED_FRONTEND" ]] && info "  Frontend detected : $DETECTED_FRONTEND"
[[ -n "$DETECTED_STYLING"  ]] && info "  Styling detected  : $DETECTED_STYLING"
[[ -n "$DETECTED_BACKEND"  ]] && info "  Backend detected  : $DETECTED_BACKEND"
[[ -n "$DETECTED_DATABASE" ]] && info "  Database detected : $DETECTED_DATABASE"
[[ -n "$DETECTED_AUTH"     ]] && info "  Auth detected     : $DETECTED_AUTH"
info "  Git base branch   : $BASE_BRANCH"
echo ""

# ─────────────────────────────────────────────────────────────────────────────
# Step 2: Engram — check, install, and configure
# Engram is a system-level Go binary (~/.engram/engram.db).
# It does NOT live inside the project or .webforge/ — it's global.
# What we do here:
#   a) Check if engram binary is available
#   b) If not, offer to install it (brew on macOS, pre-built binary on Linux)
#   c) Set up the Claude Code MCP plugin so agents can use mem_* tools
#   d) Optionally initialise .engram/ in project root for git sync
# ─────────────────────────────────────────────────────────────────────────────
echo ""
info "Checking Engram (persistent memory for agents)..."

ENGRAM_INSTALLED=false
ENGRAM_MCP_READY=false

if command -v engram &>/dev/null; then
  ENGRAM_VERSION=$(engram version 2>/dev/null | head -1 || echo "unknown")
  success "Engram binary found: $ENGRAM_VERSION"
  ENGRAM_INSTALLED=true
else
  warn "Engram binary not found."
  echo ""
  ask "Install Engram now? (required for agent memory)"
  echo "  1) Yes — install via Homebrew (macOS/Linux with brew)"
  echo "  2) Yes — install pre-built Linux binary (curl)"
  echo "  3) Skip — I'll install it manually later"
  echo ""
  read -rp "Choice [1/2/3, default 2]: " engram_install_choice
  engram_install_choice="${engram_install_choice:-2}"

  case "$engram_install_choice" in
    1)
      info "Installing via Homebrew..."
      brew install gentleman-programming/tap/engram
      ENGRAM_INSTALLED=true
      success "Engram installed via Homebrew"
      ;;
    2)
      info "Installing pre-built Linux binary..."
      ENGRAM_BIN_DIR="$HOME/.local/bin"
      mkdir -p "$ENGRAM_BIN_DIR"
      ENGRAM_LATEST=$(curl -s https://api.github.com/repos/Gentleman-Programming/engram/releases/latest \
        | python3 -c "import sys,json; r=json.load(sys.stdin); print(r['tag_name'])" 2>/dev/null || echo "v1.15.13")
      ENGRAM_URL="https://github.com/Gentleman-Programming/engram/releases/download/${ENGRAM_LATEST}/engram_Linux_x86_64.tar.gz"
      info "Downloading $ENGRAM_LATEST..."
      curl -sL "$ENGRAM_URL" | tar -xz -C "$ENGRAM_BIN_DIR" engram
      chmod +x "$ENGRAM_BIN_DIR/engram"
      # Add to PATH for this session
      export PATH="$ENGRAM_BIN_DIR:$PATH"
      if command -v engram &>/dev/null; then
        ENGRAM_INSTALLED=true
        success "Engram installed at $ENGRAM_BIN_DIR/engram"
        warn "Add to your shell profile: export PATH=\"\$HOME/.local/bin:\$PATH\""
      else
        warn "Binary downloaded but not in PATH. Add $ENGRAM_BIN_DIR to your PATH."
      fi
      ;;
    *)
      warn "Skipping Engram install. Agents will not have persistent memory until you install it."
      warn "Install docs: https://github.com/Gentleman-Programming/engram/blob/main/docs/INSTALLATION.md"
      ;;
  esac
fi

# Set up Claude Code MCP plugin for Engram
if $ENGRAM_INSTALLED; then
  echo ""
  info "Configuring Engram MCP plugin for Claude Code..."

  # Check if already configured
  if claude plugin list 2>/dev/null | grep -q "engram"; then
    success "Engram MCP plugin already active in Claude Code"
    ENGRAM_MCP_READY=true
  else
    # Install the plugin
    if claude plugin marketplace add Gentleman-Programming/engram 2>/dev/null && \
       claude plugin install engram 2>/dev/null; then
      success "Engram MCP plugin installed in Claude Code"
      ENGRAM_MCP_READY=true
    else
      warn "Could not auto-install Claude Code plugin. Run manually:"
      warn "  claude plugin marketplace add Gentleman-Programming/engram"
      warn "  claude plugin install engram"
    fi
  fi

  # Ask about .engram/ git sync in project root
  echo ""
  ask "Enable Engram git sync for this project? (.engram/ folder in project root)"
  echo "  This lets you sync agent memories across machines via git commits."
  echo "  Recommended if you work on multiple machines or with a team."
  read -rp "Enable? [y/N]: " engram_sync_choice
  if [[ "$engram_sync_choice" =~ ^[Yy]$ ]]; then
    mkdir -p "$PROJECT_ROOT/.engram"
    # Add .engram/engram.db to gitignore (the SQLite file is local only)
    # The .engram/ folder with sync chunks IS committed
    if [[ -f "$PROJECT_ROOT/.gitignore" ]]; then
      if ! grep -q "\.engram/engram\.db" "$PROJECT_ROOT/.gitignore"; then
        echo "" >> "$PROJECT_ROOT/.gitignore"
        echo "# Engram — local SQLite db (not committed, only sync chunks are)" >> "$PROJECT_ROOT/.gitignore"
        echo ".engram/engram.db" >> "$PROJECT_ROOT/.gitignore"
        echo ".engram/*.db" >> "$PROJECT_ROOT/.gitignore"
      fi
    fi
    # Initialise project in Engram
    engram projects list 2>/dev/null || true
    success "Engram git sync enabled (.engram/ will store sync chunks)"
    info "To sync memories: engram sync && git add .engram/ && git commit -m 'sync engram'"
    info "To import on another machine: engram sync --import"
  fi
fi

# Store engram status in config (written later in Step 5)
ENGRAM_PROJECT_KEY="webforge/$PROJECT_NAME"

# ─────────────────────────────────────────────────────────────────────────────
# Step 3: Ask user what to version
# ─────────────────────────────────────────────────────────────────────────────
ask "What should be committed to git? (you can change this later in .webforge/.gitignore)"
echo "  1) Nothing — add all of .webforge/ to .gitignore (private setup)"
echo "  2) Agent prompts + config only — share the setup, not the logs"
echo "  3) Everything — full transparency, team shares all history"
echo ""
read -rp "Choice [1/2/3, default 2]: " version_choice
version_choice="${version_choice:-2}"

COMMIT_AGENTS=false
COMMIT_CONFIG=false
COMMIT_LOGS=false

case "$version_choice" in
  1) ;;  # all false
  3) COMMIT_AGENTS=true; COMMIT_CONFIG=true; COMMIT_LOGS=true ;;
  *) COMMIT_AGENTS=true; COMMIT_CONFIG=true ;;  # default: 2
esac

# ─────────────────────────────────────────────────────────────────────────────
# Step 4: Create directory structure
# ─────────────────────────────────────────────────────────────────────────────
info "Creating .webforge/ structure..."

mkdir -p "$WEBFORGE_DIR"/{agents/{cto,po,architect,frontend,backend,qa,ux},logs,scripts}

# ─────────────────────────────────────────────────────────────────────────────
# Step 5: Copy agent CLAUDE.md files from framework source
# ─────────────────────────────────────────────────────────────────────────────
for agent in cto po architect frontend backend qa ux; do
  src="$FRAMEWORK_SOURCE/agents/$agent/CLAUDE.md"
  dst="$WEBFORGE_DIR/agents/$agent/CLAUDE.md"
  if [[ -f "$src" ]]; then
    cp "$src" "$dst"
    success "Copied $agent/CLAUDE.md"
  else
    warn "Agent prompt not found: $src (skipping)"
  fi
done

# Copy scripts
cp "$FRAMEWORK_SOURCE/scripts/inbox_protocol.sh" "$WEBFORGE_DIR/scripts/"
cp "$FRAMEWORK_SOURCE/scripts/run_cto.sh"        "$WEBFORGE_DIR/scripts/"
chmod +x "$WEBFORGE_DIR/scripts/"*.sh
success "Copied scripts"

# ─────────────────────────────────────────────────────────────────────────────
# Step 6: Write config.json
# ─────────────────────────────────────────────────────────────────────────────
cat > "$WEBFORGE_DIR/config.json" << EOF
{
  "project": "$PROJECT_NAME",
  "root": "$PROJECT_ROOT",
  "stack": {
    "frontend": ${DETECTED_FRONTEND:+"\"$DETECTED_FRONTEND\""}${DETECTED_FRONTEND:-null},
    "styling":  ${DETECTED_STYLING:+"\"$DETECTED_STYLING\""}${DETECTED_STYLING:-null},
    "backend":  ${DETECTED_BACKEND:+"\"$DETECTED_BACKEND\""}${DETECTED_BACKEND:-null},
    "database": ${DETECTED_DATABASE:+"\"$DETECTED_DATABASE\""}${DETECTED_DATABASE:-null},
    "auth":     ${DETECTED_AUTH:+"\"$DETECTED_AUTH\""}${DETECTED_AUTH:-null}
  },
  "git": {
    "base_branch": "$BASE_BRANCH",
    "feature_prefix": "feature/"
  },
  "versioning": {
    "commit_agents": $COMMIT_AGENTS,
    "commit_config": $COMMIT_CONFIG,
    "commit_logs": $COMMIT_LOGS
  },
  "engram": {
    "namespace": "$ENGRAM_PROJECT_KEY",
    "installed": $ENGRAM_INSTALLED,
    "mcp_ready": $ENGRAM_MCP_READY
  }
}
EOF
success "Written config.json"

# ─────────────────────────────────────────────────────────────────────────────
# Step 7: Generate .gitignore for .webforge/
# ─────────────────────────────────────────────────────────────────────────────
{
  echo "# WebForge — auto-generated by init.sh"
  echo "# Edit manually or re-run init to regenerate"
  echo ""

  if [[ "$COMMIT_AGENTS" == "false" ]]; then
    echo "agents/"
  fi
  if [[ "$COMMIT_CONFIG" == "false" ]]; then
    echo "config.json"
  fi
  if [[ "$COMMIT_LOGS" == "false" ]]; then
    echo "logs/"
  fi

  # Active jobs are never committed (they're transient work state)
  echo ""
  echo "# Never commit active jobs (transient work state)"
  echo "agents/*/actual_job.md"
  echo "agents/*/inbox.md"

} > "$WEBFORGE_DIR/.gitignore"
success "Written .webforge/.gitignore"

# Also add .webforge to project root .gitignore if version_choice=1
if [[ "$version_choice" == "1" ]]; then
  if [[ -f "$PROJECT_ROOT/.gitignore" ]]; then
    if ! grep -q "\.webforge" "$PROJECT_ROOT/.gitignore"; then
      echo "" >> "$PROJECT_ROOT/.gitignore"
      echo "# WebForge agent framework" >> "$PROJECT_ROOT/.gitignore"
      echo ".webforge/" >> "$PROJECT_ROOT/.gitignore"
      success "Added .webforge/ to project root .gitignore"
    fi
  fi
fi

# ─────────────────────────────────────────────────────────────────────────────
# Done
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}${BOLD}╔══════════════════════════════════════╗${RESET}"
echo -e "${GREEN}${BOLD}║  WebForge installed successfully ✓   ║${RESET}"
echo -e "${GREEN}${BOLD}╚══════════════════════════════════════╝${RESET}"
echo ""
info "Next steps:"
echo "  1. Start a feature:"
echo "     echo 'I want a login page with email/password' > .webforge/agents/po/inbox.md"
echo ""
echo "  2. Start the CTO loop:"
echo "     PROJECT_PATH=$PROJECT_ROOT bash .webforge/scripts/run_cto.sh"
echo ""
echo "  3. Check status anytime:"
echo "     source .webforge/scripts/inbox_protocol.sh && inbox_status"
echo ""
if $ENGRAM_INSTALLED; then
  echo "  4. Sync agent memories (optional):"
  echo "     engram sync && git add .engram/ && git commit -m 'sync engram'"
  echo ""
fi
