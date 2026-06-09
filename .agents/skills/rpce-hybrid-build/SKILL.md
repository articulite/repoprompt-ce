---
name: rpce-hybrid-build
description: Automatically build the frontend inside WSL and sync the production package back to the Windows host mount point.
---

# Hybrid Build Skill

This skill builds the React Vite application in the native WSL environment and synchronizes the built assets back to the Windows host mount directory.

## Running the Build

Run this tool to compile the frontend and synchronize it back to Windows in a single step:

```bash
.agents/skills/rpce-hybrid-build/scripts/build.sh
```

This script will:
1. Compile the React typescript frontend natively inside the WSL Ubuntu environment.
2. Synchronize the resulting `gui/dist/` assets folder back to the Windows host mount point, making it ready for host packaging.
