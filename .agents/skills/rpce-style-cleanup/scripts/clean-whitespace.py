#!/usr/bin/env python
import os
import subprocess
import sys

def get_modified_files():
    try:
        output = subprocess.check_output(["git", "status", "--porcelain"])
        lines = output.decode("utf-8").splitlines()
        files = []
        for line in lines:
            status = line[:2]
            filepath = line[3:].strip()
            if " -> " in filepath:
                filepath = filepath.split(" -> ")[-1]
            filepath = filepath.strip('"')
            if os.path.isfile(filepath):
                files.append(filepath)
        return files
    except Exception as e:
        print("Error getting git modified files: " + str(e))
        return []

def main():
    files = get_modified_files()
    if not files:
        print("No modified files found to clean.")
        return

    valid_exts = {".swift", ".tsx", ".ts", ".css", ".html", ".js", ".json", ".md", ".sh"}

    for rel_path in files:
        ext = os.path.splitext(rel_path)[1]
        if ext not in valid_exts:
            continue

        abs_path = os.path.abspath(rel_path)
        if not os.path.exists(abs_path):
            continue

        try:
            with open(abs_path, 'rb') as f:
                content = f.read()

            text = content.decode('utf-8')
            lines = text.splitlines()
            trimmed_lines = [line.rstrip() for line in lines]

            newline = '\r\n' if '\r\n' in text else '\n'
            new_text = newline.join(trimmed_lines).rstrip() + '\n'

            if new_text.encode('utf-8') != content:
                with open(abs_path, 'wb') as f:
                    f.write(new_text.encode('utf-8'))
                print("Trimmed whitespace in: " + rel_path)
            else:
                print("No changes needed in: " + rel_path)
        except Exception as e:
            print("Failed to clean " + rel_path + ": " + str(e))

if __name__ == "__main__":
    main()
