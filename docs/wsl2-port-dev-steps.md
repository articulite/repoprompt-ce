# RepoPrompt CE: Windows 11 WSL 2 Hybrid Port Development Steps

This document tracks the required development steps, current progress, and remaining tasks for porting **RepoPrompt CE** to Windows 11 using the **Alternative B: WSL 2 Hybrid Architecture**. 

In this architecture, the Swift-based MCP daemon and CLI tools compile and run inside WSL 2 (Ubuntu 24.04), while a premium Tauri + React + Vite GUI runs on the Windows 11 host, communicating with the daemon via `wsl.exe` subprocess standard streams and local UNIX sockets.

---

## Progress Overview
- [x] Phase 1: Environment Setup & Target Configuration
- [ ] Phase 2: Core Headless Porting (CLI & Daemon Compilation)
- [ ] Phase 3: WSL Substrate Adapters
- [ ] Phase 4: Tauri Web GUI and Windows Integration

---

## Detailed Task Breakdown

### Phase 1: Environment Setup & Target Configuration
- [x] Configure a WSL 2 Ubuntu 24.04 environment on Windows 11 and install compile dependencies.
- [x] Install the Swift 6.x / 5.10 toolchain inside WSL using Swiftly.
- [x] Refactor [Package.swift](file:///c:/Users/kaika/BP/gitprojects/repoprompt-ce/Package.swift) to conditionalize target graphs:
  - Exclude macOS-only packages/dependencies (`Sparkle`, `KeyboardShortcuts`, `Neon`, `swift-markdown-ui`) on Linux.
  - Define and expose the new headless `RepoPromptDaemon` executable target for Linux.
- [x] Create the headless Linux daemon entry point at [Sources/RepoPromptDaemon/main.swift](file:///c:/Users/kaika/BP/gitprojects/repoprompt-ce/Sources/RepoPromptDaemon/main.swift) with a `dispatchMain()` runloop.
- [x] Create a path translation mapper at [Sources/RepoPromptShared/PathTranslator.swift](file:///c:/Users/kaika/BP/gitprojects/repoprompt-ce/Sources/RepoPromptShared/PathTranslator.swift) to map Windows paths (`C:\...`) to WSL mount paths (`/mnt/c/...`) bidirectionally.
- [x] Conditionalize POSIX descriptor socket options (import `Glibc` instead of `Darwin` on Linux) in [Sources/RepoPromptShared/MCP/POSIXDescriptorSupport.swift](file:///c:/Users/kaika/BP/gitprojects/repoprompt-ce/Sources/RepoPromptShared/MCP/POSIXDescriptorSupport.swift).

---

### Phase 2: Core Headless Porting (CLI & Daemon Compilation)
- [/] Port [Sources/RepoPromptMCP/main.swift](file:///c:/Users/kaika/BP/gitprojects/repoprompt-ce/Sources/RepoPromptMCP/main.swift) to compile and run on Linux:
  - [ ] Add conditional imports (`#if os(Linux) import Glibc` / `typealias Darwin = Glibc`).
  - [ ] Rewrite client process detection (`detectClientName()`) to read `/proc/<pid>/exe` instead of macOS `sysctl`.
  - [ ] Wrap `SO_NOSIGPIPE` socket configuration in `#if !os(Linux)` blocks.
- [ ] Conditionalize other occurrences of `SO_NOSIGPIPE` in the socket and transport codebases:
  - `BootstrapSocketServer.swift`
  - `UnixSocketMCPTransport.swift`
  - `InteractiveMCPClientSession.swift`
  - `BootstrapSocketMCPTransport.swift`
- [ ] Perform a test compilation of headless targets inside WSL 2:
  ```bash
  wsl -d Ubuntu bash -c "source ~/.local/share/swiftly/env.sh && swift build --product RepoPromptDaemon --product repoprompt-mcp"
  ```
- [ ] Run standalone CLI in WSL 2, verifying stdin/stdout MCP messaging loops.

---

### Phase 3: WSL Substrate Adapters
- [ ] Implement a Linux-based `FileSystemWatcher` service wrapper using the kernel's `inotify` interface to replace macOS `FSEvents`.
- [ ] Port the process launcher ([ProcessLauncher.swift](file:///c:/Users/kaika/BP/gitprojects/repoprompt-ce/Sources/RepoPrompt/Infrastructure/Process/ProcessLauncher.swift)) to support Linux standard library processes and POSIX spawns.
- [ ] Adapt keychain secure storage ([KeychainService.swift](file:///c:/Users/kaika/BP/gitprojects/repoprompt-ce/Sources/RepoPrompt/Infrastructure/Security/KeychainService.swift)) to use an encrypted flat-file or standard Linux credential service keyring.

---

### Phase 4: Tauri Web GUI and Windows Integration
- [ ] Bootstrap a new Tauri + React + Vite + TS project on the Windows 11 host.
- [ ] Build a premium user interface implementing a cohesive dark mode, glassmorphism, responsive panel resizing, and modern typography (Outfit/Inter).
- [ ] Integrate Monaco Editor + Shiki/Prism for syntax highlighting and markdown views.
- [ ] Write Tauri custom commands to invoke `wsl.exe` subprocesses for launching the MCP CLI and communicating over standard streams.
- [ ] Map file selection and workspace paths from Windows formats to WSL formats via path translation.
- [ ] Package and sign the Windows app as a self-contained MSIX installer.
