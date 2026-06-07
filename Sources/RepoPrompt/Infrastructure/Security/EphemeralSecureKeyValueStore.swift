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
               !envValue.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
            {
                return envValue
            }

            throw KeychainService.KeychainError.itemNotFound
        }

        private func envVarName(for key: String) -> String? {
            switch key {
            case "AnthropicAPI": "ANTHROPIC_API_KEY"
            case "OpenAIAPI": "OPENAI_API_KEY"
            case "GeminiAPI": "GEMINI_API_KEY"
            case "OpenRouterAPI": "OPENROUTER_API_KEY"
            case "OllamaURL": "OLLAMA_URL"
            case "AzureAPI": "AZURE_API_KEY"
            case "DeepSeekAPI": "DEEPSEEK_API_KEY"
            case "CustomProviderAPI": "CUSTOM_PROVIDER_API_KEY"
            case "FireworksAPI": "FIREWORKS_API_KEY"
            case "GrokAPI": "GROK_API_KEY"
            case "GroqAPI": "GROQ_API_KEY"
            case "ClaudeCodeAPI": "CLAUDE_CODE_API_KEY"
            case "ZAIAPI": "ZAI_API_KEY"
            default: nil
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
