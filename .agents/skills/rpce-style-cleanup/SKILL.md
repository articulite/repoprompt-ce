---
name: rpce-style-cleanup
description: Automatically trim trailing whitespace, EOF blank lines, and clean up style formatting in modified files.
---

# Style Cleanup Skill

This skill automatically sanitizes formatting in modified files to prevent contribution preflight and SwiftFormat/SwiftLint checks from failing due to whitespace violations.

## Trimming Trailing Whitespace

Run this tool to automatically trim trailing spaces and EOF lines in all currently modified files:

```bash
.agents/skills/rpce-style-cleanup/scripts/clean-whitespace.py
```

This script will:
1. Parse `git status` to identify modified files in the checkout.
2. Read and strip trailing spaces from each line.
3. Remove redundant empty lines at the end of files, ensuring a single newline at EOF.
