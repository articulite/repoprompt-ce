//
//  PathTranslator.swift
//  RepoPromptShared
//
//  Created for Windows WSL 2 port.
//

import Foundation

public enum PathTranslator {
    /// Translates a Windows host path (e.g. "C:\Users\name\projects", "C:/Users/name", or "\\\wsl.localhost\Ubuntu\home\name")
    /// into a WSL 2 mount path (e.g. "/mnt/c/Users/name/projects" or "/home/name").
    public static func toWSLPath(_ windowsPath: String) -> String {
        let normalized = windowsPath.replacingOccurrences(of: "\\", with: "/")

        // Match WSL UNC paths: e.g. //wsl.localhost/Ubuntu/home/user or //wsl$/Ubuntu/home/user
        let uncPattern = "^//wsl(?:\\.localhost|\\$)/[^/]+/(.*)$"
        if let uncRegex = try? NSRegularExpression(pattern: uncPattern, options: []),
           let match = uncRegex.firstMatch(in: normalized, options: [], range: NSRange(location: 0, length: (normalized as NSString).length))
        {
            let nsStr = normalized as NSString
            let remaining = nsStr.substring(with: match.range(at: 1))
            return "/" + remaining
        }

        // Match drive letters, e.g. "C:" or "c:" at the start of the path
        let pattern = "^([A-Za-z]):"
        guard let regex = try? NSRegularExpression(pattern: pattern, options: []) else {
            return normalized
        }

        let nsString = normalized as NSString
        let range = NSRange(location: 0, length: nsString.length)

        if let match = regex.firstMatch(in: normalized, options: [], range: range) {
            let driveLetter = nsString.substring(with: match.range(at: 1)).lowercased()
            let remainingPath = nsString.substring(from: match.range.location + match.range.length)
            return "/mnt/\(driveLetter)\(remainingPath)"
        }

        return normalized
    }

    /// Translates a WSL 2 mount path (e.g. "/mnt/c/Users/name/projects" or "/home/name")
    /// back into a standard Windows host path with backslashes (e.g. "C:\Users\name\projects" or "\\\wsl.localhost\Ubuntu\home\name").
    public static func toWindowsPath(_ wslPath: String) -> String {
        let pattern = "^/mnt/([A-Za-z])"
        if let regex = try? NSRegularExpression(pattern: pattern, options: []) {
            let nsString = wslPath as NSString
            let range = NSRange(location: 0, length: nsString.length)

            if let match = regex.firstMatch(in: wslPath, options: [], range: range) {
                let driveLetter = nsString.substring(with: match.range(at: 1)).uppercased()
                let remainingPath = nsString.substring(from: match.range.location + match.range.length)
                let winPathWithForwardSlashes = "\(driveLetter):\(remainingPath)"
                return winPathWithForwardSlashes.replacingOccurrences(of: "/", with: "\\")
            }
        }

        // Handle WSL native paths: e.g. /home/user/project -> \\wsl.localhost\Ubuntu\home\user\project
        if wslPath.hasPrefix("/") {
            let cleanPath = wslPath.hasSuffix("/") && wslPath.count > 1 ? String(wslPath.dropLast()) : wslPath
            return "\\\\wsl.localhost\\Ubuntu" + cleanPath.replacingOccurrences(of: "/", with: "\\")
        }

        return wslPath.replacingOccurrences(of: "/", with: "\\")
    }
}
