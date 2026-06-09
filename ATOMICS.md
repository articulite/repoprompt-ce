# Agent Mode Parity Alignment: Atomic Gap Tracker

* **Baseline Commit:** `143eb7403e8c5257d704b51965a64cccfbbb3c17`

This document tracks each atomic discrepancy between the native macOS SwiftUI app and the Vite React frontend for all primary features.

---

## Gap Checklist

### 1. Agent Mode

#### `[ ]` ATOMIC-01: Auto-Scroll Pinning & Pin Detach UI
* **Source Ref:** [AgentModeView.swift:L1933](file:///c:/Users/kaika/BP/gitprojects/repoprompt-ce/Sources/RepoPrompt/Features/AgentMode/Views/AgentModeView.swift#L1933) (`agentTranscript.scrollToBottom`), [AgentModeView.swift:L2256](file:///c:/Users/kaika/BP/gitprojects/repoprompt-ce/Sources/RepoPrompt/Features/AgentMode/Views/AgentModeView.swift#L2256) (scroll engine pinning & sentinels)
* **Target Ref:** [AgentModePanel.tsx:L99-102](file:///c:/Users/kaika/BP/gitprojects/repoprompt-ce/gui/src/components/AgentModePanel.tsx#L99-102) (`transcriptEndRef` auto-scroll)
* **Description:** React currently performs a simple scroll-to-bottom on every log update. It lacks manual scroll-detach detection (grace zones), sentinels to stabilize layouts, and the floating Scroll to Bottom button overlay with accessibility identifier `agentTranscript.scrollToBottom`.
* **Action Required:**
  1. Add a custom scroll listener in `AgentModePanel` to detect when the viewport is manually scrolled up.
  2. Implement a floating **Scroll to Bottom** button overlay that appears when detached.
  3. Wire the button to snap focus back and re-pin autoscroll.
* **Status:** Pending

#### `[ ]` ATOMIC-02: Dashboard Welcome & Tips Empty State
* **Source Ref:** [AgentModeView.swift](file:///c:/Users/kaika/BP/gitprojects/repoprompt-ce/Sources/RepoPrompt/Features/AgentMode/Views/AgentModeView.swift) (Empty State with `AgentPaginatedWorkflowsView` and `AgentRotatingTipsView`)
* **Target Ref:** [AgentModePanel.tsx:L92-96](file:///c:/Users/kaika/BP/gitprojects/repoprompt-ce/gui/src/components/AgentModePanel.tsx#L92-96) (Rendering forms when `!activeSessionId`)
* **Description:** When starting a fresh session, React only renders basic layout inputs, missing the macOS "What are we building?" dashboard, interactive workflow suggestions, and sliding tips.
* **Action Required:** Build a welcoming splash page component for new/empty sessions that replicates the paginated workflow cards and tips widget.
* **Status:** Pending

#### `[ ]` ATOMIC-03: Max Height Constraints for Collapsed Clusters
* **Source Ref:** [AgentModeView.swift:L2596-2642](file:///c:/Users/kaika/BP/gitprojects/repoprompt-ce/Sources/RepoPrompt/Features/AgentMode/Views/AgentModeView.swift#L2596-2642) (`activityCluster` / `groupedHistory` capped heights)
* **Target Ref:** [AgentModePanel.tsx:L318-345](file:///c:/Users/kaika/BP/gitprojects/repoprompt-ce/gui/src/components/AgentModePanel.tsx#L318-345) (`groupedLogs` construction)
* **Description:** Collapsed log sections and activity clusters in React can expand without layout constraints, while the native macOS views restrict heights to 220px/260px and use nested scrolling.
* **Action Required:** Style collapsed/expanded cards with CSS height limits and `overflow-y: auto` to prevent large layout jumps.
* **Status:** Pending

#### `[ ]` ATOMIC-04: Polling to Stream/WebSocket Transition
* **Source Ref:** [AgentModeView.swift](file:///c:/Users/kaika/BP/gitprojects/repoprompt-ce/Sources/RepoPrompt/Features/AgentMode/Views/AgentModeView.swift) (`handleStreamResult` listener)
* **Target Ref:** [AgentModePanel.tsx:L118-130](file:///c:/Users/kaika/BP/gitprojects/repoprompt-ce/gui/src/components/AgentModePanel.tsx#L118-130) (`startPolling` interval)
* **Description:** React polls the daemon via MCP tool call every 2000ms. If the daemon backend MCP/WebSocket server supports event streams, React should use it for smooth, zero-latency log streaming.
* **Action Required:**
  1. Inspect `mcpClient.ts` for subscription or live event capability.
  2. Implement stream registration if supported, falling back cleanly to the 2s polling interval only if streams are unavailable.
* **Status:** Pending

#### `[ ]` ATOMIC-05: Workspace Context Integration (Pills)
* **Source Ref:** [AgentModeView.swift](file:///c:/Users/kaika/BP/gitprojects/repoprompt-ce/Sources/RepoPrompt/Features/AgentMode/Views/AgentModeView.swift) (Dynamic selected files count notification binding)
* **Target Ref:** [AgentModePanel.tsx](file:///c:/Users/kaika/BP/gitprojects/repoprompt-ce/gui/src/components/AgentModePanel.tsx) (Input and parameters container)
* **Description:** The native app registers notifications when the workspace file count or contexts change, modifying input status pills in real time. The React app runs in relative isolation.
* **Action Required:** Add state bindings or global hooks to read current active workspace file selections and show context pills near the input prompt bar.
* **Status:** Pending

#### `[ ]` ATOMIC-06: VCS / Diff Approval Operations Linkage
* **Source Ref:** [AgentModeView.swift](file:///c:/Users/kaika/BP/gitprojects/repoprompt-ce/Sources/RepoPrompt/Features/AgentMode/Views/AgentModeView.swift) (`submitApprovalDecision`)
* **Target Ref:** [AgentModePanel.tsx:L454](file:///c:/Users/kaika/BP/gitprojects/repoprompt-ce/gui/src/components/AgentModePanel.tsx#L454) (`setApprovalStates` stub checkbox)
* **Description:** Clicking the "Approve/Reject" toggles on unified diffs only edits local React state (`approvalStates`). It does not dispatch decisions to the daemon backend to allow the agent run to proceed.
* **Action Required:** Replace the local stub checkbox with callback triggers that call `mcpClient.callTool("agent_run", { op: "respond", ... })` or equivalent decision endpoint to synchronize state with the background daemon.
* **Status:** Pending

#### `[ ]` ATOMIC-07: Interactive Blocker/Wizard Cards Support
* **Source Ref:** [AgentModeView.swift:L2371-2487](file:///c:/Users/kaika/BP/gitprojects/repoprompt-ce/Sources/RepoPrompt/Features/AgentMode/Views/AgentModeView.swift#L2371-2487) (Blocker cards list)
* **Target Ref:** [AgentModePanel.tsx](file:///c:/Users/kaika/BP/gitprojects/repoprompt-ce/gui/src/components/AgentModePanel.tsx) (Execution timeline rendering)
* **Description:** Native macOS app renders specialized cards (e.g. merge reviews, elicitation prompts, wizard setups) to resolve blockages. React currently only supports text responses for basic `ask_user` questions.
* **Action Required:** Update the transcript compiler and timeline rendering to format and display dedicated cards for elicitation, merge conflict resolution, and edit reviews.
* **Status:** Pending

#### `[ ]` ATOMIC-08: Keyboard Focus & Expandable Card Controls (A11y)
* **Source Ref:** [AgentModeView.swift:L2596-2642](file:///c:/Users/kaika/BP/gitprojects/repoprompt-ce/Sources/RepoPrompt/Features/AgentMode/Views/AgentModeView.swift#L2596-2642) (Native button controls)
* **Target Ref:** [AgentModePanel.tsx](file:///c:/Users/kaika/BP/gitprojects/repoprompt-ce/gui/src/components/AgentModePanel.tsx) (Collapsible tool card headers)
* **Description:** Card headers (`.tool-card-header`) are clickable `div` tags. They cannot receive keyboard focus (`tabIndex={0}`), lack `role="button"`, and don't announce expansion state (`aria-expanded`).
* **Action Required:**
  1. Add `role="button"`, `tabIndex={0}`, and `aria-expanded` attributes.
  2. Implement an `onKeyDown` listener for `Space` and `Enter` keys to toggle expansion.
* **Status:** Pending

#### `[ ]` ATOMIC-09: Screen Reader Live Status Announcements (A11y)
* **Source Ref:** [AgentModeView.swift](file:///c:/Users/kaika/BP/gitprojects/repoprompt-ce/Sources/RepoPrompt/Features/AgentMode/Views/AgentModeView.swift) (`.accessibilityHidden(!shouldShowRunningIndicator)`)
* **Target Ref:** [AgentModePanel.tsx](file:///c:/Users/kaika/BP/gitprojects/repoprompt-ce/gui/src/components/AgentModePanel.tsx) (Visual-only status circles)
* **Description:** Agent status changes (success, failure, warning, thinking spinner) are purely color-coded, making them inaccessible to screen readers without textual alternatives or live announcers.
* **Action Required:**
  1. Wrap status indicators in `aria-live="polite"` containers or add hidden helper text describing the state.
  2. Apply `aria-hidden` or screen reader hide behaviors to transient thinking spinners when idle.
* **Status:** Pending

#### `[ ]` ATOMIC-10: E2E Testing Identifiers (`data-testid`)
* **Source Ref:** [AgentModeView.swift](file:///c:/Users/kaika/BP/gitprojects/repoprompt-ce/Sources/RepoPrompt/Features/AgentMode/Views/AgentModeView.swift) (Accessibility identifiers)
* **Target Ref:** [AgentModePanel.tsx](file:///c:/Users/kaika/BP/gitprojects/repoprompt-ce/gui/src/components/AgentModePanel.tsx) (No testing IDs)
* **Description:** React contains no `data-testid` attributes on inputs, buttons, or list blocks, which makes writing robust Cypress/Playwright integration tests extremely difficult.
* **Action Required:** Add `data-testid` tags to primary controls, including session cards, steering inputs, start/stop action triggers, and status panels.
* **Status:** Pending

---

### 2. Context Builder

#### `[ ]` ATOMIC-11: Async Streaming & Reasoning Preview
* **Source Ref:** [ContextBuilderAgentView.swift](file:///c:/Users/kaika/BP/gitprojects/repoprompt-ce/Sources/RepoPrompt/Features/ContextBuilder/Views/ContextBuilderAgentView.swift) (`backgroundPlanReasoningPreviewText` / `backgroundPlanResponsePreviewText`)
* **Target Ref:** [ContextBuilderPanel.tsx](file:///c:/Users/kaika/BP/gitprojects/repoprompt-ce/gui/src/components/ContextBuilderPanel.tsx)
* **Description:** React invokes a blocking tool call `context_builder` instead of supporting asynchronous background streaming of compilation tasks, reasoning text, and live cancel capability.
* **Action Required:** Transition the execution loop to asynchronous/detached modes (if supported by daemon) or implement a simulated progress loop, rendering dynamic generation steps and cancellation handles.
* **Status:** Pending

#### `[ ]` ATOMIC-12: Inline Selected Files Compiler Layout
* **Source Ref:** Native workspace file selection views.
* **Target Ref:** [ContextBuilderPanel.tsx](file:///c:/Users/kaika/BP/gitprojects/repoprompt-ce/gui/src/components/ContextBuilderPanel.tsx)
* **Description:** React features an inline selection compiler (file paths, sizes, reordering, and render modes FULL/SLICES/CODEMAP) that is absent from the macOS SwiftUI view.
* **Action Required:** Keep the React layout as a web-specific enhancement, but ensure path inputs validate against the current loaded repository paths.
* **Status:** Pending

#### `[ ]` ATOMIC-13: Prompts Pinning & UserDefaults Sync
* **Source Ref:** [ContextBuilderAgentView.swift](file:///c:/Users/kaika/BP/gitprojects/repoprompt-ce/Sources/RepoPrompt/Features/ContextBuilder/Views/ContextBuilderAgentView.swift) (`ContextBuilderPromptStorage` & `UserDefaults` pinning)
* **Target Ref:** [ContextBuilderPanel.tsx](file:///c:/Users/kaika/BP/gitprojects/repoprompt-ce/gui/src/components/ContextBuilderPanel.tsx)
* **Description:** React presets are global via `localStorage` and lack persistent tab-level isolation, pin status settings, or sync with local files (`ContextBuilderPrompts.json`).
* **Action Required:** Sync presets with local `ContextBuilderPrompts.json` through the daemon `app_settings` tool, and support pinning specific settings.
* **Status:** Pending

#### `[ ]` ATOMIC-14: Keyboard Modal Focus Trap & Shortcuts (A11y)
* **Source Ref:** [ContextBuilderAgentView.swift](file:///c:/Users/kaika/BP/gitprojects/repoprompt-ce/Sources/RepoPrompt/Features/ContextBuilder/Views/ContextBuilderAgentView.swift) (`Cmd + Return` shortcut)
* **Target Ref:** [ContextBuilderPanel.tsx](file:///c:/Users/kaika/BP/gitprojects/repoprompt-ce/gui/src/components/ContextBuilderPanel.tsx) (Modals)
* **Description:** Tab navigation leaks focus out of open modals to the background page, and the panel lacks keyboard shortcuts (`Cmd + Enter` / `Ctrl + Enter`) to compile prompts.
* **Action Required:** Implement a focus-trap wrapper on templates/prompts modals, and listen to key events to run/cancel compilation.
* **Status:** Pending

---

### 3. Settings Panel

#### `[ ]` ATOMIC-15: Real Workspace Approvals Layout & Client Revocation
* **Source Ref:** [PermissionsSettingsView.swift](file:///c:/Users/kaika/BP/gitprojects/repoprompt-ce/Sources/RepoPrompt/Features/Settings/Views/PermissionsSettingsView.swift) (`WorkspaceApprovalManager`)
* **Target Ref:** [SettingsPanel.tsx](file:///c:/Users/kaika/BP/gitprojects/repoprompt-ce/gui/src/components/SettingsPanel.tsx) (Workspace Approvals tab)
* **Description:** React's "Workspace Approvals" tab is a misnomer for file/root management. The native view manages global master approvals, per-operation auto-approvals, and trusted client (VS Code, Claude Code) lists with revocation triggers.
* **Action Required:** Rebuild the "Workspace Approvals" section to interface with the auto-approve configuration keys and list trusted clients. Move workspace folder addition inputs to the "Manage Workspaces" section.
* **Status:** Pending

#### `[ ]` ATOMIC-16: Connect Mock Views to Daemon API
* **Source Ref:** [SettingsView.swift](file:///c:/Users/kaika/BP/gitprojects/repoprompt-ce/Sources/RepoPrompt/Features/Settings/Views/SettingsView.swift)
* **Target Ref:** [SettingsPanel.tsx](file:///c:/Users/kaika/BP/gitprojects/repoprompt-ce/gui/src/components/SettingsPanel.tsx) (Updates, Benchmark, Shortcuts)
* **Description:** React simulates benchmarks, updates, and hotkeys using static local mock data (e.g. `v1.4.2-ce` current version, mock accuracy charts).
* **Action Required:** Hook up the updates checking to the daemon Sparkle endpoint, shortcuts to a browser window keybinder, and benchmark options to actual diagnostic scripts.
* **Status:** Pending

#### `[ ]` ATOMIC-17: Semantic Toggle Controls & Modals Focus Loop (A11y)
* **Source Ref:** [SettingsView.swift](file:///c:/Users/kaika/BP/gitprojects/repoprompt-ce/Sources/RepoPrompt/Features/Settings/Views/SettingsView.swift)
* **Target Ref:** [SettingsPanel.tsx](file:///c:/Users/kaika/BP/gitprojects/repoprompt-ce/gui/src/components/SettingsPanel.tsx)
* **Description:** Settings switches and toggles are hidden checkboxes with no ARIA states or focus indicators. Modal dialogs do not handle Escape keys or trap tabs.
* **Action Required:** Refactor checkboxes to use visible focus rings and explicit ARIA properties (`role="checkbox"`, `aria-checked`), and trap focus inside settings overlays.
* **Status:** Pending

#### `[ ]` ATOMIC-18: Dynamic Presets Configuration
* **Source Ref:** [ManagePresetsView.swift](file:///c:/Users/kaika/BP/gitprojects/repoprompt-ce/Sources/RepoPrompt/Features/Workspaces/Views/ManagePresetsView.swift)
* **Target Ref:** [SettingsPanel.tsx](file:///c:/Users/kaika/BP/gitprojects/repoprompt-ce/gui/src/components/SettingsPanel.tsx) (Preset picker)
* **Description:** React has a mockup static preset viewer, while macOS allows dynamic configuration of ignore directories, indexing filters, and parser overrides.
* **Action Required:** Connect the Preset panel to the workspace daemon configuration to support creating and editing presets.
* **Status:** Pending

---

### 4. Chat Panel

#### `[ ]` ATOMIC-19: Log Token Streaming & Reasoning Popovers
* **Source Ref:** [ChatMessagesView.swift](file:///c:/Users/kaika/BP/gitprojects/repoprompt-ce/Sources/RepoPrompt/Features/Chat/Views/ChatMessagesView.swift), [Bubbles.swift](file:///c:/Users/kaika/BP/gitprojects/repoprompt-ce/Sources/RepoPrompt/Features/Chat/Views/Bubbles.swift)
* **Target Ref:** [ChatPanel.tsx](file:///c:/Users/kaika/BP/gitprojects/repoprompt-ce/gui/src/components/ChatPanel.tsx)
* **Description:** React executes `agent_run` as a blocking synchronous call, which blocks token streaming. It also lacks the popover display for assistant reasoning blocks (`ReasoningButton`).
* **Action Required:** Transition the prompt submission call to an asynchronous workflow subscription and render streaming reasoning and assistant outputs incrementally.
* **Status:** Pending

#### `[ ]` ATOMIC-20: Bubble Actions (Edit, Delete, Fork)
* **Source Ref:** [Bubbles.swift](file:///c:/Users/kaika/BP/gitprojects/repoprompt-ce/Sources/RepoPrompt/Features/Chat/Views/Bubbles.swift) (Inline user text editor and message deletions)
* **Target Ref:** [ChatPanel.tsx](file:///c:/Users/kaika/BP/gitprojects/repoprompt-ce/gui/src/components/ChatPanel.tsx)
* **Description:** User bubbles in React cannot be edited or resubmitted, and messages cannot be deleted or forked/split into new chat sessions.
* **Action Required:** Implement user message inline editing (using `⌘Enter` / `Esc` listeners), bubble deletion commands, and a "Fork from message" button on assistant bubbles.
* **Status:** Pending

#### `[ ]` ATOMIC-21: Dynamic File Context Badge & Selection Restore
* **Source Ref:** [ChatMessagesView.swift](file:///c:/Users/kaika/BP/gitprojects/repoprompt-ce/Sources/RepoPrompt/Features/Chat/Views/ChatMessagesView.swift) (Dynamic selection indicator)
* **Target Ref:** [ChatPanel.tsx](file:///c:/Users/kaika/BP/gitprojects/repoprompt-ce/gui/src/components/ChatPanel.tsx)
* **Description:** React chat displays a static `0 files` context badge. It lacks the floating selector capsule to inspect, add, or restore historical file context attached to transcripts.
* **Action Required:** Connect the context badge to the global file selection store, and build a popover capsule showing active files.
* **Status:** Pending

#### `[ ]` ATOMIC-22: Autocomplete Mentions Listbox & Semantic ARIA (A11y)
* **Source Ref:** Autocomplete view in macOS app.
* **Target Ref:** [ChatPanel.tsx](file:///c:/Users/kaika/BP/gitprojects/repoprompt-ce/gui/src/components/ChatPanel.tsx) ( Mentions suggestions )
* **Description:** The autocomplete mentions popup lacks ARIA properties (`role="listbox"`, `aria-selected`, `aria-activedescendant`), which prevents screen readers from announcing selected files.
* **Action Required:** Refactor suggestion lists to follow standard accessibility designs for search menus.
* **Status:** Pending

#### `[ ]` ATOMIC-23: Message Height Capping & Floating Scroller
* **Source Ref:** [ChatMessagesView.swift](file:///c:/Users/kaika/BP/gitprojects/repoprompt-ce/Sources/RepoPrompt/Features/Chat/Views/ChatMessagesView.swift) (Autoscroll phase detection & bottom buttons)
* **Target Ref:** [ChatPanel.tsx](file:///c:/Users/kaika/BP/gitprojects/repoprompt-ce/gui/src/components/ChatPanel.tsx)
* **Description:** React lacks collapsible toggles for assistant messages > 10 lines and lacks autoscroll phase detection with a floating Scroll to Bottom overlay.
* **Action Required:** Add scroll listeners to toggle bottom-pinning visibility, and support a collapsible content view for long assistant bubbles.
* **Status:** Pending

---

### 5. Workspace Selection & Main App Shell

#### `[ ]` ATOMIC-24: Native Path Picker Input
* **Source Ref:** [WorkspaceSetupView.swift](file:///c:/Users/kaika/BP/gitprojects/repoprompt-ce/Sources/RepoPrompt/Features/Workspaces/Views/WorkspaceSetupView.swift) (`NSOpenPanel` folder picker)
* **Target Ref:** [WorkspaceEntryView.tsx](file:///c:/Users/kaika/BP/gitprojects/repoprompt-ce/gui/src/components/WorkspaceEntryView.tsx)
* **Description:** React requires typing or pasting folder paths manually, whereas macOS integrates native AppKit open folder panels.
* **Action Required:** Hook up a path picker dialog (via daemon file browser MCP tool or system dialog trigger) so users do not have to type paths manually.
* **Status:** Pending

#### `[ ]` ATOMIC-25: Multi-Folder Workspace Creation
* **Source Ref:** [WorkspaceSetupView.swift](file:///c:/Users/kaika/BP/gitprojects/repoprompt-ce/Sources/RepoPrompt/Features/Workspaces/Views/WorkspaceSetupView.swift)
* **Target Ref:** [WorkspaceEntryView.tsx](file:///c:/Users/kaika/BP/gitprojects/repoprompt-ce/gui/src/components/WorkspaceEntryView.tsx)
* **Description:** React only allows entering a single folder path during workspace creation, while the native view supports building a draft list containing multiple paths.
* **Action Required:** Update the workspace setup layout to support listing and adding multiple folder paths before creating the workspace.
* **Status:** Pending

#### `[ ]` ATOMIC-26: Workspace Rename & Visibility Actions
* **Source Ref:** [ManageWorkspacesView.swift](file:///c:/Users/kaika/BP/gitprojects/repoprompt-ce/Sources/RepoPrompt/Features/Workspaces/Views/ManageWorkspacesView.swift)
* **Target Ref:** [WorkspaceEntryView.tsx](file:///c:/Users/kaika/BP/gitprojects/repoprompt-ce/gui/src/components/WorkspaceEntryView.tsx)
* **Description:** React only supports deleting workspaces in the "Manage" view, missing the native Rename and Toggle Hide functions.
* **Action Required:** Add Rename Workspace modal inputs and visibility toggles, dispatching the operations to the `manage_workspaces` MCP tool.
* **Status:** Pending

#### `[ ]` ATOMIC-27: Duplicate Path Consolidator
* **Source Ref:** [WorkspaceSetupView.swift](file:///c:/Users/kaika/BP/gitprojects/repoprompt-ce/Sources/RepoPrompt/Features/Workspaces/Views/WorkspaceSetupView.swift)
* **Target Ref:** [WorkspaceEntryView.tsx](file:///c:/Users/kaika/BP/gitprojects/repoprompt-ce/gui/src/components/WorkspaceEntryView.tsx)
* **Description:** The native app automatically checks for overlapping paths and offers to consolidate duplicates. React has no warning.
* **Action Required:** Add overlapping path checking on path inputs and render warning consolidation buttons.
* **Status:** Pending

#### `[ ]` ATOMIC-28: Semantic Auto-Restore Toggle & Modal ESC Close (A11y)
* **Source Ref:** [WorkspaceLandingView.swift](file:///c:/Users/kaika/BP/gitprojects/repoprompt-ce/Sources/RepoPrompt/Features/Workspaces/Views/WorkspaceLandingView.swift)
* **Target Ref:** [WorkspaceEntryView.tsx](file:///c:/Users/kaika/BP/gitprojects/repoprompt-ce/gui/src/components/WorkspaceEntryView.tsx)
* **Description:** The auto-restore toggle checkbox is hidden from screen readers. Dialog modals lack Escape-key handlers and focus traps.
* **Action Required:** Refactor toggle elements to use accessible styled components with `aria-checked`, trap tab key focus inside modal backdrops, and close modals on Escape key presses.
* **Status:** Pending
