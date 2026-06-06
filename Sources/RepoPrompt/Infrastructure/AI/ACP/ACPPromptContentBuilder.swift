import Foundation
#if canImport(UniformTypeIdentifiers)
    import UniformTypeIdentifiers
#endif

enum ACPPromptContentBuilder {
    enum Error: LocalizedError, Equatable {
        case unreadableLocalImage(String)

        var errorDescription: String? {
            switch self {
            case let .unreadableLocalImage(path):
                "Unable to read image attachment at \(path)."
            }
        }
    }

    static func blocks(
        text: String,
        attachments: [AgentImageAttachment]
    ) throws -> [[String: Any]] {
        var blocks: [[String: Any]] = []
        if !text.isEmpty || attachments.isEmpty {
            blocks.append([
                "type": "text",
                "text": text
            ])
        }

        for attachment in attachments {
            if let block = try imageBlock(for: attachment) {
                blocks.append(block)
            }
        }

        return blocks
    }

    private static func imageBlock(for attachment: AgentImageAttachment) throws -> [String: Any]? {
        switch attachment.source {
        case let .localFile(rawPath):
            let path = rawPath.trimmingCharacters(in: .whitespacesAndNewlines)
            guard !path.isEmpty else { return nil }
            let url = URL(fileURLWithPath: path).standardizedFileURL
            let data: Data
            do {
                data = try Data(contentsOf: url)
            } catch {
                throw Error.unreadableLocalImage(path)
            }
            return [
                "type": "image",
                "mimeType": mimeType(forPathExtension: url.pathExtension, fallbackTitle: attachment.title),
                "data": data.base64EncodedString(),
                "uri": url.absoluteString
            ]
        case let .url(rawURL):
            let urlString = rawURL.trimmingCharacters(in: .whitespacesAndNewlines)
            guard !urlString.isEmpty else { return nil }
            let extensionCandidate = URL(string: urlString)?.pathExtension
            return [
                "type": "image",
                "mimeType": mimeType(forPathExtension: extensionCandidate, fallbackTitle: attachment.title),
                "uri": urlString
            ]
        }
    }

    private static func mimeType(forPathExtension pathExtension: String?, fallbackTitle: String?) -> String {
        let candidates = [pathExtension, fallbackTitle.flatMap { URL(fileURLWithPath: $0).pathExtension }]
        for candidate in candidates {
            let ext = candidate?.trimmingCharacters(in: CharacterSet(charactersIn: ".").union(.whitespacesAndNewlines)).lowercased() ?? ""
            guard !ext.isEmpty else { continue }
            switch ext {
            case "png":
                return "image/png"
            case "jpg", "jpeg":
                return "image/jpeg"
            case "gif":
                return "image/gif"
            case "webp":
                return "image/webp"
            case "heic":
                return "image/heic"
            case "heif":
                return "image/heif"
            default:
                break
            }
            #if canImport(UniformTypeIdentifiers)
                if let mimeType = UTType(filenameExtension: ext)?.preferredMIMEType,
                   mimeType.lowercased().hasPrefix("image/")
                {
                    return mimeType
                }
            #endif
        }
        return "image/png"
    }
}
