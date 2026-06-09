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

echo "Compiling React frontend natively in WSL..."
cd "$WSL_DIR/gui"
npm run build

if [ -d "$HOST_DIR" ]; then
  echo "Syncing built assets back to Windows host mount..."
  rsync -av "$WSL_DIR/gui/dist/" "$HOST_DIR/gui/dist/"
  echo "Hybrid build and synchronization complete!"
else
  echo "WARNING: Host directory not found. Built files are at $WSL_DIR/gui/dist/"
fi
