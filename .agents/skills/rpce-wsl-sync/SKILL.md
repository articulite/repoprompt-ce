---
name: rpce-wsl-sync
description: Sync workspace edits and build assets between the Windows host and native WSL workspace, preserving symlinks.
---

# WSL Workspace Sync Skill

This skill synchronizes file modifications and production build folders between the Windows host mount point and the native WSL workspace directory `~/repoprompt-ce/`.

## Syncing Host Edits to WSL

When you make changes to files in the Windows host editor, sync them to the native WSL workspace to compile, test, or lint:

```bash
.agents/skills/rpce-wsl-sync/scripts/sync.sh to-wsl
```

This script will:
1. Run `rsync` from the Windows host mount to `~/repoprompt-ce/`.
2. Automatically run `git checkout` on symlinked paths (`CLAUDE.md` and `Vendor/Sparkle/`) to fix typechanges caused by NTFS mount behavior.

## Syncing Build Assets to Host

After running a frontend build inside WSL (`npm run build` in `gui/`), sync the compiled static files back to the Windows host so the host application can package them:

```bash
.agents/skills/rpce-wsl-sync/scripts/sync.sh to-host
```
