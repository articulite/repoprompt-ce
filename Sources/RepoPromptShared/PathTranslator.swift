//
//  PathTranslator.swift
//  RepoPromptShared
//
//  Created for Windows WSL 2 port.
//

import Foundation

public enum PathTranslator {
    /// Translates a Windows host path (e.g. "C:\Users\name\projects" or "C:/Users/name")
    /// into a WSL 2 mount path (e.g. "/mnt/c/Users/name/projects").
    public static func toWSLPath(_ windowsPath: String) -> String {
        let normalized = windowsPath.replacingOccurrences(of: "\\", with: "/")

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

    /// Translates a WSL 2 mount path (e.g. "/mnt/c/Users/name/projects")
    /// back into a standard Windows host path with backslashes (e.g. "C:\Users\name\projects").
    public static func toWindowsPath(_ wslPath: String) -> String {
        let pattern = "^/mnt/([A-Za-z])"
        guard let regex = try? NSRegularExpression(pattern: pattern, options: []) else {
            return wslPath.replacingOccurrences(of: "/", with: "\\")
        }

        let nsString = wslPath as NSString
        let range = NSRange(location: 0, length: nsString.length)

        if let match = regex.firstMatch(in: wslPath, options: [], range: range) {
            let driveLetter = nsString.substring(with: match.range(at: 1)).uppercased()
            let remainingPath = nsString.substring(from: match.range.location + match.range.length)
            let winPathWithForwardSlashes = "\(driveLetter):\(remainingPath)"
            return winPathWithForwardSlashes.replacingOccurrences(of: "/", with: "\\")
        }

        return wslPath.replacingOccurrences(of: "/", with: "\\")
    }
}
