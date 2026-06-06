//
//  main.swift
//  RepoPromptDaemon
//
//  Created for Windows WSL 2 port.
//

import Foundation
import Dispatch
import Logging
import RepoPromptShared
import RepoPrompt

#if os(Linux)
import Glibc
#else
import Darwin
#endif

print("[RepoPromptDaemon] Starting background services...")

// Avoid process-killing SIGPIPE when connection pipes close
signal(SIGPIPE, SIG_IGN)

// Initialize and register MCP services headlessly
Task { @MainActor in
    print("[RepoPromptDaemon] Initializing headless services...")
    RepoPromptDaemonInitializer.initializeServices()

    print("[RepoPromptDaemon] Launching ServerController listener...")
    await ServerController.shared.startServer()
    print("[RepoPromptDaemon] Listener successfully launched and active.")
}

// Keep the main thread alive inside the daemon dispatch queue
dispatchMain()
