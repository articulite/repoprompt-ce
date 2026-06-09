---
name: rpce-gui-parity-planner
description: Spawn two specialized subagents to analyze the SwiftUI macOS code and React web code, identify design/behavioral differences, and generate a unified implementation plan.
---

# GUI Parity Planner Skill

This skill guides the main agent to delegate the research of macOS SwiftUI views and React Vite components to two parallel subagents, resolving layout and logic mismatches.

## Spawning the Subagents

When tasking parity analysis, invoke two `research` subagents simultaneously.

### Subagent 1: macOS SwiftUI Analyst
* **Role:** macOS GUI Analyst
* **Prompt Template:**
  ```text
  You are a macOS GUI Analyst subagent. Your task is to analyze the SwiftUI layout, styling, modifiers, view models, state bindings, and accessibility setup for the feature: {FEATURE_NAME}.

  Files to review:
  - {SWIFT_FILES_LIST}

  Determine:
  1. Visual structure (stacks, paddings, lists, overlays, buttons, icons).
  2. State variables, publishers, and settings bindings.
  3. User interaction logic, entry points, and triggers for key workflows (e.g., how the view reaches interactive states like clarifying questions or wizard cards, and whether these run as synchronous blocking actions or asynchronous state listening via WebSockets/publishers).
  4. Accessibility elements, identifiers (e.g. `accessibilityIdentifier`, `accessibilityLabel`), and accessibility tree structure.

  Write a concise report detailing the layout structure, telemetry data, accessibility tree details, and workflow trigger paths. Do not modify files.
  ```

### Subagent 2: React Web Analyst
* **Role:** React GUI Analyst
* **Prompt Template:**
  ```text
  You are a React GUI Analyst subagent. Your task is to analyze the React component structure, Tailwind/Vite components, state hooks, CSS rules, and accessibility attributes for the feature: {FEATURE_NAME}.

  Files to review:
  - {REACT_FILES_LIST}
  - gui/src/index.css

  Determine:
  1. Existing layout structure and styling (CSS classes, margins, scrollbars).
  2. React state hooks (`useState`, `useEffect`) and WebSocket/MCP client messages.
  3. Unimplemented placeholders or differences from native layouts, especially around workflow execution and triggers (e.g., whether calls are synchronous blocking MCP tools or asynchronous WebSocket event handlers, and how interactive sub-flows are reached).
  4. Accessibility elements, ARIA attributes/roles, test IDs (`data-testid`), and semantic HTML structure.

  Write a concise report detailing the current styling, DOM structure, accessibility trees, workflow trigger paths, and limitations. Do not modify files.
  ```

## Parity Plan Synthesis

Once both subagents report back:
1. Compare their findings to identify missing elements, layout differences, accessibility/ARIA gaps, workflow/trigger flow discrepancies, or state/event-loop discrepancies.
2. Compile a markdown comparison report (e.g. `macos_vs_vite_comparison.md`).
3. Generate a structured `implementation_plan.md` to outline the exact file updates required to achieve 100% visual, functional, and accessibility parity.
