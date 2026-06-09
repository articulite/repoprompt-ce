#!/usr/bin/env python
import sys
import json

def main():
    if len(sys.argv) < 4:
        print("Usage: python generate-prompts.py <feature_name> <swift_files_comma_separated> <react_files_comma_separated>")
        sys.exit(1)

    feature_name = sys.argv[1]
    swift_files = sys.argv[2].split(',')
    react_files = sys.argv[3].split(',')

    swift_files_list = "\n".join("- " + f.strip() for f in swift_files if f.strip())
    react_files_list = "\n".join("- " + f.strip() for f in react_files if f.strip())

    swift_prompt = (
        "You are a macOS GUI Analyst subagent. Your task is to analyze the SwiftUI layout, styling, modifiers, view models, and state bindings for the feature: {FEATURE}.\n\n"
        "Files to review:\n{FILES}\n\n"
        "Determine:\n"
        "1. Visual structure (stacks, paddings, lists, overlays, buttons, icons).\n"
        "2. State variables, publishers, and settings bindings.\n"
        "3. User interaction logic and triggers.\n\n"
        "Write a concise report detailing the layout structure and telemetry data. Do not modify files."
    ).format(FEATURE=feature_name, FILES=swift_files_list)

    react_prompt = (
        "You are a React GUI Analyst subagent. Your task is to analyze the React component structure, Tailwind/Vite components, state hooks, and CSS rules for the feature: {FEATURE}.\n\n"
        "Files to review:\n{FILES}\n- gui/src/index.css\n\n"
        "Determine:\n"
        "1. Existing layout structure and styling (CSS classes, margins, scrollbars).\n"
        "2. React state hooks (useState, useEffect) and WebSocket/MCP client messages.\n"
        "3. Unimplemented placeholders or differences from native layouts.\n\n"
        "Write a concise report detailing the current styling, DOM structure, and limitations. Do not modify files."
    ).format(FEATURE=feature_name, FILES=react_files_list)

    payload = {
        "Subagents": [
            {
                "TypeName": "research",
                "Role": "macOS GUI Analyst",
                "Prompt": swift_prompt
            },
            {
                "TypeName": "research",
                "Role": "React GUI Analyst",
                "Prompt": react_prompt
            }
        ]
    }

    print("\n--- Subagent Invocation JSON Payload ---")
    print(json.dumps(payload, indent=2))
    print("----------------------------------------\n")

if __name__ == "__main__":
    main()
