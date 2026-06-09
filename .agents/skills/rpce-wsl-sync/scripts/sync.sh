#!/bin/bash
set -e

# Target paths
HOST_DIR="/mnt/c/Users/kaika/BP/gitprojects/repoprompt-ce"
WSL_DIR="$HOME/repoprompt-ce"

# Portable auto-discovery if path is different
if [ ! -d "$HOST_DIR" ]; then
  FOUND_DIR=$(find /mnt/c -maxdepth 6 -type d -name "repoprompt-ce" -print -quit 2>/dev/null)
  if [ -n "$FOUND_DIR" ]; then
    HOST_DIR="$FOUND_DIR"
  fi
fi

MODE=$1
if [ -z "$MODE" ]; then
  echo "Usage: $0 [to-wsl|to-host]"
  exit 1
fi

if [ "$MODE" = "to-wsl" ]; then
  if [ ! -d "$HOST_DIR" ]; then
    echo "ERROR: Host directory not found at $HOST_DIR"
    exit 1
  fi
  echo "Syncing Windows host changes from $HOST_DIR to $WSL_DIR..."
  rsync -av --delete \
    --exclude '.build' \
    --exclude '.git' \
    --exclude 'gui/node_modules' \
    --exclude '.swiftpm' \
    "$HOST_DIR/" "$WSL_DIR/"

  echo "Restoring native symlinks in WSL..."
  cd "$WSL_DIR"
  git checkout CLAUDE.md Vendor/Sparkle/ 2>/dev/null || true
  echo "WSL workspace sync complete!"

elif [ "$MODE" = "to-host" ]; then
  if [ ! -d "$HOST_DIR" ]; then
    echo "ERROR: Host directory not found at $HOST_DIR"
    exit 1
  fi
  echo "Syncing compiled React dist from $WSL_DIR/gui/dist/ to $HOST_DIR/gui/dist/..."
  rsync -av "$WSL_DIR/gui/dist/" "$HOST_DIR/gui/dist/"
  echo "Host sync complete!"
else
  echo "Unknown mode: $MODE"
  exit 1
fi
