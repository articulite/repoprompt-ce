#if DEBUG || !canImport(Security)
    import Foundation

    /// Debug-build-only in-memory secure storage used when local app signing cannot safely use Keychain.
    final class EphemeralSecureKeyValueStore: SecureKeyValueStorageBackend {
        static let shared = EphemeralSecureKeyValueStore()

        let persistsValuesAcrossLaunches = false

        private var entries: [String: Data] = [:]
        private let lock = NSRecursiveLock()

        init() {}

        func save(
            _ value: String,
            for key: String,
            accessMode: KeychainAccessMode
        ) throws {
            guard let data = value.data(using: .utf8) else {
                throw KeychainService.KeychainError.invalidData
            }

            withLock {
                entries[key] = data
            }
        }

        func get(
            for key: String,
            accessMode: KeychainAccessMode
        ) throws -> String {
            if let data = withLock({ entries[key] }) {
                guard let value = String(data: data, encoding: .utf8) else {
                    throw KeychainService.KeychainError.invalidData
                }
                return value
            }

            if let envVar = envVarName(for: key),
               let envValue = ProcessInfo.processInfo.environment[envVar],
               !envValue.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                return envValue
            }

            throw KeychainService.KeychainError.itemNotFound
        }

        private func envVarName(for key: String) -> String? {
            switch key {
            case "AnthropicAPI": return "ANTHROPIC_API_KEY"
            case "OpenAIAPI": return "OPENAI_API_KEY"
            case "GeminiAPI": return "GEMINI_API_KEY"
            case "OpenRouterAPI": return "OPENROUTER_API_KEY"
            case "OllamaURL": return "OLLAMA_URL"
            case "AzureAPI": return "AZURE_API_KEY"
            case "DeepSeekAPI": return "DEEPSEEK_API_KEY"
            case "CustomProviderAPI": return "CUSTOM_PROVIDER_API_KEY"
            case "FireworksAPI": return "FIREWORKS_API_KEY"
            case "GrokAPI": return "GROK_API_KEY"
            case "GroqAPI": return "GROQ_API_KEY"
            case "ClaudeCodeAPI": return "CLAUDE_CODE_API_KEY"
            case "ZAIAPI": return "ZAI_API_KEY"
            default: return nil
            }
        }

        func delete(
            for key: String,
            accessMode: KeychainAccessMode
        ) throws {
            _ = withLock {
                entries.removeValue(forKey: key)
            }
        }

        private func withLock<T>(_ body: () throws -> T) rethrows -> T {
            lock.lock()
            defer { lock.unlock() }
            return try body()
        }
    }
#endif
