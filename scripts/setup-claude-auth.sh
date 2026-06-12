#!/bin/bash
# Ensures ~/.claude points to workspace persistent storage so credentials survive Replit restarts
CLAUDE_STORE="/home/runner/workspace/.claude-data"
mkdir -p "$CLAUDE_STORE"

if [ ! -L "$HOME/.claude" ]; then
  if [ -d "$HOME/.claude" ]; then
    if [ -f "$HOME/.claude/.credentials.json" ]; then
      cp "$HOME/.claude/.credentials.json" "$CLAUDE_STORE/.credentials.json"
    fi
    rm -rf "$HOME/.claude"
  fi
  ln -s "$CLAUDE_STORE" "$HOME/.claude"
fi
