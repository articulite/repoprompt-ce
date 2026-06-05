# WSL 2 Developer Setup Guide for RepoPrompt Windows Port

This guide documents the setup steps required to compile and run the RepoPrompt core engine inside a Windows Subsystem for Linux (WSL 2) Ubuntu 24.04 environment.

---

## 1. WSL 2 Host Requirements
* **OS**: Windows 11 (Build 22000+)
* **Distribution**: Ubuntu 24.04 LTS (Noble Numbat)
  * Verify via: `cat /etc/os-release`

---

## 2. System Dependency Installation
To compile Swift's C/C++ targets (like tree-sitter grammars and PCRE2), run the following command in the WSL Ubuntu terminal:

```bash
sudo apt-get update && sudo apt-get install -y \
  binutils git gnupg2 libc6-dev libcurl4-openssl-dev libedit2 \
  libgcc-13-dev libncurses-dev libpython3-dev libsqlite3-0 \
  libstdc++-13-dev libxml2-dev libz3-dev pkg-config tzdata \
  unzip zlib1g-dev clang curl
```

---

## 3. Swift Toolchain Installation (via Swiftly)
We use the official Swift version manager **Swiftly** to install Swift 6.2 inside the user's home directory (no `sudo` required):

1. **Download and initialize Swiftly**:
   ```bash
   curl -O https://download.swift.org/swiftly/linux/swiftly-1.0.1-$(uname -m).tar.gz
   tar -zxf swiftly-1.0.1-$(uname -m).tar.gz
   ./swiftly init
   ```
2. **Apply environment paths**:
   ```bash
   source ~/.local/share/swiftly/env.sh
   hash -r
   ```
3. **Install Swift 6.2**:
   ```bash
   swiftly install 6.2
   ```
4. **Verify Installation**:
   ```bash
   swift --version
   ```

---

## 4. Compilation & Verification
Once the toolchain is active, the headless CLI can be built using SwiftPM from the repository root:

```bash
swift build --product repoprompt-mcp
```
