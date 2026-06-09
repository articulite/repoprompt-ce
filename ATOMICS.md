# Agent Mode Parity Alignment: Atomic Gap Tracker

* **Baseline Commit:** `143eb7403e8c5257d704b51965a64cccfbbb3c17`

This document tracks each atomic discrepancy between the native macOS SwiftUI app and the Vite React frontend for the **Agent Mode** feature.

---

## Gap Checklist

### 1. Visual & Layout Parity

#### `[ ]` ATOMIC-01: Auto-Scroll Pinning & Pin Detach UI
* **Source Ref:** [AgentModeView.swift:L1933](file:///c:/Users/kaika/BP/gitprojects/repoprompt-ce/Sources/RepoPrompt/Features/AgentMode/Views/AgentModeView.swift#L1933) (`agentTranscript.scrollToBottom`), [AgentModeView.swift:L2256](file:///c:/Users/kaika/BP/gitprojects/repoprompt-ce/Sources/RepoPrompt/Features/AgentMode/Views/AgentModeView.swift#L2256) (scroll engine pinning & sentinels)
* **Target Ref:** [AgentModePanel.tsx:L99-102](file:///c:/Users/kaika/BP/gitprojects/repoprompt-ce/gui/src/components/AgentModePanel.tsx#L99-102) (`transcriptEndRef` auto-scroll)
* **Description:** React currently performs a simple scroll-to-bottom on every log update. It lacks manual scroll-detach detection (grace zones), sentinels to stabilize layouts, and the floating Scroll to Bottom button overlay with accessibility identifier `agentTranscript.scrollToBottom`.
* **Action Required:**
  1. Add a custom scroll listener in `AgentModePanel` to detect when the viewport is manually scrolled up.
  2. Implement a floating **Scroll to Bottom** button overlays that appears when detached.
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

---

### 2. State & Stream Parity

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

---

### 3. Functional Parity & Interaction

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

---

### 4. Accessibility & Testability (A11y/QA)

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
