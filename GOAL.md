# Goal: Port macOS app GUI to Vite React

This document outlines the high-level roadmap, core pillars, and constraints for porting the native macOS SwiftUI app interface of RepoPrompt CE to the React/Vite web application frontend.

---

## 1. Objective
Achieve 100% functional, visual, and accessibility parity between the native macOS SwiftUI application views and the web-based React Vite client, running within the RepoPrompt CE workspace architecture.

---

## 2. Core Pillars

### I. Aesthetic Excellence
* Maintain a premium glassmorphic dark-theme visual design.
* Use curated CSS variables (`--bg-primary`, `--accent-color`, etc.) in `gui/src/index.css` for system-wide light/dark mode adaptation.
* Implement micro-animations, transitions on hover, and live badge pulses for active sessions.

### II. Dynamic Scrolling & Snapping
* Implement scroll anchors (sentinels) and detaching logic.
* Render a floating **Scroll to Bottom** control when the user manually scrolls up, allowing them to snap back to the running execution log.
* Limit log heights and support nested scrolling for collapsed activity/history clusters.

### III. Dynamic Execution & Interaction
* Bridge the local-state stubs (e.g. unified diff approval buttons) with real daemon-facing MCP tool operations.
* Support rendering specialized interactive blocker/wizard cards at the bottom of the transcript timeline when execution requires user review (e.g., merge conflicts, edits review, input requests).

### IV. Universal Accessibility & Testing
* Ensure every interactive button and panel is focusable (`tabIndex={0}`) and accessible via keyboard navigation (`Enter` and `Space` triggers).
* Bind form inputs and fields programmatically to descriptive text labels.
* Annotate primary elements with stable `data-testid` attributes to allow robust automated end-to-end integration testing.

---

## 3. Host and WSL execution boundaries
* All package builds, linting checks, and formatting must run natively inside the WSL distribution environment.
* Keep files in sync between the Windows host and WSL workspace using `rpce-wsl-sync`.
