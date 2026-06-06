#if os(Linux)
    import Foundation
    import JSONSchema
    import RepoPromptShared

    public typealias Darwin = RepoPromptShared.Darwin

    // MARK: - Appearance Shim

    public class AppearanceController: ObservableObject {
        public static let shared = AppearanceController()
        public func apply(modeRawValue: String) {}
    }

    // MARK: - FontScale Shim

    public enum FontScalePreset: Double, CaseIterable, Identifiable {
        case normal = 1.0

        public static var allCases: [FontScalePreset] {
            [.normal]
        }

        public var rawValue: Double {
            12.0
        }

        public var id: Double {
            rawValue
        }

        public func fontScaleBodySize() -> Double {
            12.0
        }

        public var displayName: String {
            "Normal"
        }
    }

    public class FontScaleManager: ObservableObject {
        public static let shared = FontScaleManager()
        public func applyAppSettingsRawValue(_ value: Double, broadcastExternalChange: Bool) {}
    }

    // MARK: - Notification Name Shim

    public extension Foundation.Notification.Name {
        static let recommendationsDidApply = Foundation.Notification.Name("recommendationsDidApply")
    }

    // MARK: - WorkspaceRestorePerfLog Shim

    public enum WorkspaceRestorePerfLog {
        public static var isEnabled: Bool { false }
        public static func timestampMSIfEnabled() -> Double? { nil }
        public static func timestampMS() -> Double { 0 }
        public static func elapsedMS(since startMS: Double) -> Double { 0 }
        public static func formatMS(_ value: Double) -> String { "" }
        public static func formatElapsedMS(since startMS: Double) -> String { "" }
        public static func shortID(_ id: UUID?) -> String { "" }
        public static func nextAgentActivationTrueCount() -> Int { 0 }
        public static func log(_ message: @autoclosure () -> String) {}
        public static func event(_ name: String, fields: [String: String] = [:]) {}
    }

    // MARK: - AgentModePerfDiagnostics Shim

    public enum AgentModePerfDiagnostics {
        public static var isEnabled: Bool { false }
        public static func timestampMSIfEnabled() -> Double? { nil }
        public static func increment(_ name: String, tabID: UUID?) {}
        public static func event(_ name: String, tabID: UUID?, fields: [String: String] = [:]) {}
        public static func event(_ name: String, fields: [String: String] = [:]) {}
        public static func durationEvent(_ name: String, startMS: Double?, tabID: UUID? = nil, fields: [String: String] = [:]) {}
        public static func formatElapsedMS(since startMS: Double?) -> String { "" }
    }

    // MARK: - AgentModelCatalog Shim

    public enum AgentModelDiscoveryTag: String, CaseIterable {
        case fast
        case exploration
        case balanced
        case engineering
        case complex
        case pair
        case extendedContext = "extended_context"
    }

    public struct AgentModelSelectionID: Equatable, Hashable, CustomStringConvertible {
        public let agentRaw: String
        public let modelRaw: String

        public init(agentRaw: String, modelRaw: String) {
            self.agentRaw = agentRaw
            self.modelRaw = modelRaw
        }

        public var rawValue: String {
            "\(agentRaw):\(modelRaw)"
        }

        public var description: String {
            rawValue
        }
    }

    public enum AgentModelCatalog {
        public enum TaskLabelKind: String, CaseIterable {
            case explore
            case engineer
            case pair
            case design
        }

        public struct AvailabilityContext {
            public static let none = AvailabilityContext()
            public static var current: AvailabilityContext { AvailabilityContext() }
            public init() {}
        }

        public struct DiscoveryDefaults {
            public let modelRaw: String?
            public let reasoningEffort: CodexReasoningEffort?
            public let selectionID: AgentModelSelectionID?
        }

        public struct DiscoveryAgent {
            public let agent: AgentProviderKind
            public let description: String
            public let available: Bool
            public let runtime: String
            public let capabilities: [String]
            public let defaults: DiscoveryDefaults
            public let models: [DiscoveryModel]
        }

        public struct DiscoveryModel {
            public let id: String
            public let name: String
            public let description: String?
            public let available: Bool
            public let tags: [AgentModelDiscoveryTag]
            public let contextWindowTokens: Int?
            public let supportedReasoningEfforts: [CodexReasoningEffort]
            public let defaultReasoningEffort: CodexReasoningEffort?
            public let startTargets: [DiscoveryStartTarget]
        }

        public struct DiscoveryStartTarget {
            public let selectionID: AgentModelSelectionID
            public let modelRaw: String
            public let name: String
            public let description: String?
            public let reasoningEffort: CodexReasoningEffort?
            public let available: Bool
            public let isDefault: Bool
            public let contextWindowTokens: Int?
        }

        public struct TaskLabel {
            public let kind: TaskLabelKind
            public let label: String
            public let description: String
        }

        public static let taskLabels: [TaskLabel] = [
            TaskLabel(kind: .explore, label: "explore", description: "Fast exploration and codebase mapping"),
            TaskLabel(kind: .engineer, label: "engineer", description: "Balanced engineering work"),
            TaskLabel(kind: .pair, label: "pair", description: "Interactive pair programming with highest-tier models"),
            TaskLabel(kind: .design, label: "design", description: "Architecture, design discussions, and creative problem solving")
        ]

        public static func defaultModelRaw(
            for agentKind: AgentProviderKind,
            availability: AvailabilityContext = .current
        ) -> String {
            switch agentKind {
            case .cursor:
                "auto"
            case .claudeCode:
                "sonnet"
            case .codexExec:
                "gpt-5.5-medium"
            case .kimiCode:
                "kimi-code"
            case .customClaudeCompatible:
                "custom-claude-compatible"
            default:
                "default"
            }
        }

        public static func discoveryAgents(
            availability: AvailabilityContext = .current
        ) -> [DiscoveryAgent] {
            AgentProviderKind.allCases.map { agent in
                let models: [DiscoveryModel]
                let defaultRaw: String
                switch agent {
                case .claudeCode:
                    defaultRaw = "sonnet"
                    models = [
                        DiscoveryModel(
                            id: "sonnet", name: "Sonnet Latest", description: "Balanced speed and capability.",
                            available: true, tags: [.balanced, .engineering], contextWindowTokens: 200_000,
                            supportedReasoningEfforts: [], defaultReasoningEffort: nil,
                            startTargets: [DiscoveryStartTarget(selectionID: AgentModelSelectionID(agentRaw: agent.rawValue, modelRaw: "sonnet"), modelRaw: "sonnet", name: "Sonnet Latest", description: nil, reasoningEffort: nil, available: true, isDefault: true, contextWindowTokens: 200_000)]
                        )
                    ]
                case .codexExec:
                    defaultRaw = "gpt-5.5-medium"
                    models = [
                        DiscoveryModel(
                            id: "gpt-5.5-medium", name: "GPT-5.5 Medium", description: "Balanced reasoning.",
                            available: true, tags: [.balanced, .engineering], contextWindowTokens: nil,
                            supportedReasoningEfforts: [.medium], defaultReasoningEffort: .medium,
                            startTargets: [DiscoveryStartTarget(selectionID: AgentModelSelectionID(agentRaw: agent.rawValue, modelRaw: "gpt-5.5-medium"), modelRaw: "gpt-5.5-medium", name: "GPT-5.5 Medium", description: nil, reasoningEffort: .medium, available: true, isDefault: true, contextWindowTokens: nil)]
                        )
                    ]
                case .cursor:
                    defaultRaw = "auto"
                    models = [
                        DiscoveryModel(
                            id: "auto", name: "Auto", description: "Automatic model choice.",
                            available: true, tags: [], contextWindowTokens: nil,
                            supportedReasoningEfforts: [], defaultReasoningEffort: nil,
                            startTargets: [DiscoveryStartTarget(selectionID: AgentModelSelectionID(agentRaw: agent.rawValue, modelRaw: "auto"), modelRaw: "auto", name: "Auto", description: nil, reasoningEffort: nil, available: true, isDefault: true, contextWindowTokens: nil)]
                        )
                    ]
                case .kimiCode:
                    defaultRaw = "kimi-code"
                    models = [
                        DiscoveryModel(
                            id: "kimi-code", name: "Kimi Code", description: "Kimi Code backend.",
                            available: true, tags: [], contextWindowTokens: nil,
                            supportedReasoningEfforts: [], defaultReasoningEffort: nil,
                            startTargets: [DiscoveryStartTarget(selectionID: AgentModelSelectionID(agentRaw: agent.rawValue, modelRaw: "kimi-code"), modelRaw: "kimi-code", name: "Kimi Code", description: nil, reasoningEffort: nil, available: true, isDefault: true, contextWindowTokens: nil)]
                        )
                    ]
                case .customClaudeCompatible:
                    defaultRaw = "custom-claude-compatible"
                    models = [
                        DiscoveryModel(
                            id: "custom-claude-compatible", name: "Custom Claude Compatible", description: "Custom Claude Compatible backend.",
                            available: true, tags: [], contextWindowTokens: nil,
                            supportedReasoningEfforts: [], defaultReasoningEffort: nil,
                            startTargets: [DiscoveryStartTarget(selectionID: AgentModelSelectionID(agentRaw: agent.rawValue, modelRaw: "custom-claude-compatible"), modelRaw: "custom-claude-compatible", name: "Custom Claude Compatible", description: nil, reasoningEffort: nil, available: true, isDefault: true, contextWindowTokens: nil)]
                        )
                    ]
                default:
                    defaultRaw = "default"
                    models = [
                        DiscoveryModel(
                            id: "default", name: "Default", description: "Default model.",
                            available: true, tags: [], contextWindowTokens: nil,
                            supportedReasoningEfforts: [], defaultReasoningEffort: nil,
                            startTargets: [DiscoveryStartTarget(selectionID: AgentModelSelectionID(agentRaw: agent.rawValue, modelRaw: "default"), modelRaw: "default", name: "Default", description: nil, reasoningEffort: nil, available: true, isDefault: true, contextWindowTokens: nil)]
                        )
                    ]
                }

                return DiscoveryAgent(
                    agent: agent,
                    description: agent.displayName,
                    available: true,
                    runtime: "mcp",
                    capabilities: [],
                    defaults: DiscoveryDefaults(
                        modelRaw: defaultRaw,
                        reasoningEffort: nil,
                        selectionID: AgentModelSelectionID(agentRaw: agent.rawValue, modelRaw: defaultRaw)
                    ),
                    models: models
                )
            }
        }

        public struct NormalizedAgentSelection: Equatable {
            public let agent: AgentProviderKind
            public let modelRaw: String
        }

        public enum AgentSelectionSurface: Equatable {
            case general
        }

        public static func normalizeSelection(
            agentRaw: String?,
            modelRaw: String?,
            availability: AvailabilityContext = .current,
            codexDynamicModels: Any? = nil,
            preserveUnavailableAgent: Bool = false,
            surface: AgentSelectionSurface = .general
        ) -> NormalizedAgentSelection {
            let agent = agentRaw.flatMap(AgentProviderKind.init(rawValue:)) ?? .claudeCode
            return NormalizedAgentSelection(agent: agent, modelRaw: modelRaw ?? "default")
        }
    }

    // MARK: - WindowState Shim

    class WindowState: ObservableObject {
        let windowID: Int = 1
        let mcpServer: MCPServerViewModel
        let workspaceManager: WorkspaceManagerViewModel
        let promptManager: PromptViewModel
        var workspaceInstanceNumber: Int? { nil }
        @MainActor let agentModeViewModel = AgentModeViewModel()

        init(
            mcpServer: MCPServerViewModel = MCPServerViewModel(),
            workspaceManager: WorkspaceManagerViewModel = WorkspaceManagerViewModel(),
            promptManager: PromptViewModel = PromptViewModel()
        ) {
            self.mcpServer = mcpServer
            self.workspaceManager = workspaceManager
            self.promptManager = promptManager
        }
    }

    // MARK: - WindowStatesManager Shim

    @MainActor
    class WindowStatesManager: ObservableObject {
        static let shared = WindowStatesManager()
        var allWindows: [WindowState] = []
        var isMultiWindowModeEffectivelyActive: Bool { false }
        func firstMCPEnabledWindow() -> WindowState? { nil }
        func hasWindow(id: Int) -> Bool { false }
        func hasWindowWithMCPEnabled(_ id: Int) -> Bool { false }
        func window(withID id: Int) -> WindowState? { nil }
    }

    // MARK: - MCPServerViewModel Shim

    class MCPServerViewModel: ObservableObject {
        struct ConnectionBindingSnapshot: Equatable {
            enum BindingKind: Equatable {
                case unbound
                case windowOnly
                case tabContext
            }

            let windowID: Int?
            let tabID: UUID?
            let workspaceID: UUID?
            let workspaceName: String?
            let tabName: String?
            let repoPaths: [String]
            let explicitlyBound: Bool
            let runID: UUID?

            var bindingKind: BindingKind {
                if tabID != nil {
                    return .tabContext
                }
                if windowID != nil {
                    return .windowOnly
                }
                return .unbound
            }
        }

        struct TabContextHint: Codable, Equatable {
            let tabID: UUID
            let workspaceID: UUID?
            let windowID: Int?
            init(tabID: UUID, workspaceID: UUID?, windowID: Int?) {
                self.tabID = tabID
                self.workspaceID = workspaceID
                self.windowID = windowID
            }
        }

        var windowToolsEnabled: Bool { false }
        var windowMCPTools: [Tool] { get async { [] } }
        var windowMCPToolCatalogService: Any? { nil }
        var connectionIDToRunID: [UUID: UUID] = [:]
        var connectionIDByRunID: [UUID: UUID] = [:]

        func hasLiveRunID(_ runID: UUID) -> Bool { false }
        func cancelActiveToolsForConnection(connectionID: UUID, reason: String? = nil) -> Int {
            0
        }

        func bindTabForConnection(
            connectionID: UUID,
            clientName: String?,
            tabID: UUID,
            workspaceID: UUID,
            windowID: Int,
            runID: UUID? = nil,
            explicitlyBound: Bool = true
        ) throws {}

        func connectionBindingSnapshot(forConnection connectionID: UUID) -> ConnectionBindingSnapshot {
            ConnectionBindingSnapshot(
                windowID: nil,
                tabID: nil,
                workspaceID: nil,
                workspaceName: nil,
                tabName: nil,
                repoPaths: [],
                explicitlyBound: false,
                runID: nil
            )
        }

        func boundTabID(forConnection connectionID: UUID?) -> UUID? {
            nil
        }

        func connectionID(forRunID runID: UUID) -> UUID? {
            connectionIDByRunID[runID]
        }

        func cleanupRunIDMapping(runID: UUID, connectionID: UUID) {
            connectionIDByRunID.removeValue(forKey: runID)
            connectionIDToRunID.removeValue(forKey: connectionID)
        }

        @discardableResult
        func registerRunIDMapping(connectionID: UUID, runID: UUID, windowID: Int) -> Bool {
            connectionIDByRunID[runID] = connectionID
            connectionIDToRunID[connectionID] = runID
            return true
        }

        func removeTabContext(
            forConnectionID connectionID: UUID?,
            clientName: String?,
            windowID: Int?,
            runID: UUID? = nil
        ) {
            if let connectionID {
                connectionIDToRunID.removeValue(forKey: connectionID)
            }
            if let runID {
                connectionIDByRunID.removeValue(forKey: runID)
            }
        }

        func installTabContext(
            clientID: String?,
            clientName: String?,
            windowID: Int,
            workspaceID: UUID?,
            snapshot: ComposeTabState,
            runID: UUID?
        ) {}

        init() {}
    }

    // MARK: - WorkspaceManagerViewModel Shim

    struct ComposeTabRoutingSnapshot {
        let workspaceID: UUID
        let snapshot: ComposeTabState
    }

    class WorkspaceManagerViewModel: ObservableObject {
        struct ComposeTabBindingCandidate: Equatable {
            let tabID: UUID
            let workspaceID: UUID
            let workspaceName: String
            let isActiveInWorkspace: Bool
            let repoPaths: [String]
        }

        static func loadableRepoPaths(for workspace: WorkspaceModel) -> [String] {
            []
        }

        var activeWorkspace: WorkspaceModel? { nil }
        var workspaceSearchReadinessState: WorkspaceSearchReadinessState = .idle

        func resolveComposeTabRoutingSnapshot(for tabID: UUID) -> ComposeTabRoutingSnapshot? {
            nil
        }

        func composeTab(with id: UUID) -> ComposeTabState? { nil }
        func composeTabName(with id: UUID) -> String? { nil }
        func publishActiveComposeTabSnapshot(commitToMemory: Bool, touchModified: Bool) {}
        func updateComposeTabStoredOnly(_ tab: ComposeTabState) {}
        func bindingCandidate(forContextID id: UUID) -> ComposeTabBindingCandidate? { nil }
        func bindingCandidates(matchingWorkingDirs dirs: [String], includeHidden: Bool = false) -> [ComposeTabBindingCandidate] { [] }
        init() {}
    }

    // MARK: - PromptViewModel Shim

    class PromptViewModel: ObservableObject {
        var activeComposeTabID: UUID? { nil }
        init() {}
    }

    // MARK: - APISettingsViewModel Shim

    class APISettingsViewModel: ObservableObject {
        init() {}
    }

    // MARK: - AgentModeViewModel Shim

    @MainActor
    class AgentModeViewModel: ObservableObject {
        static let shared = AgentModeViewModel()
        func mcpSpawnParentSessionID(sourceTabID: UUID) -> UUID? { nil }
        init() {}
    }

    // MARK: - CLISymlinkManagerUserSpace Shim

    public enum CLISymlinkManagerUserSpace {
        public static var stableCLIPath: String { "" }
    }

    // MARK: - MCPPromptRegistry Shim

    import MCP

    public enum MCPPromptRegistry {
        public static func listPrompts() -> [Prompt] { [] }
        public static func getPrompt(named name: String, arguments: [String: Value]?) throws -> GetPrompt.Result {
            throw MCPError.invalidParams("Prompts are not supported on Linux")
        }
    }

    // MARK: - ServerNetworkManager Diagnostics Shim

    #if DEBUG
        extension ServerNetworkManager {
            nonisolated static func isDebugDiagnosticsToolName(_ toolName: String) -> Bool {
                false
            }

            func handleDebugDiagnosticsTool(
                connectionID: UUID,
                arguments: [String: MCP.Value]
            ) async -> MCP.CallTool.Result {
                MCP.CallTool.Result(content: [], isError: true)
            }
        }
    #endif

    // MARK: - WindowRoutingService Shim

    struct BindContextResponse: Codable {
        struct WorkspaceDTO: Codable {
            let id: String?
            let name: String
        }

        struct TabDTO: Codable {
            let context_id: String
            let name: String
            let is_active: Bool
            let is_bound: Bool
            let repo_paths: [String]?
        }

        struct WindowDTO: Codable {
            let window_id: Int
            let is_current_window: Bool
            let workspace: WorkspaceDTO?
            let active_context_id: String?
            let tabs: [TabDTO]
        }

        struct BindingDTO: Codable {
            let binding_kind: String
            let window_id: Int?
            let context_id: String?
            let workspace_name: String?
            let tab_name: String?
            let repo_paths: [String]?
            let explicit: Bool?
            let run_scoped: Bool?
        }

        let windows: [WindowDTO]?
        let binding: BindingDTO
        let changed: Bool?
        let previous_binding: BindingDTO?
        let matched_by: String?
        let created_tab: Bool?
        let created_workspace: Bool?
        let normalized_working_dirs: [String]?
        let note: String?
    }

    struct ManageWorkspacesResponse: Codable {
        let status: String
        let workspaces: [String]
    }

    final class WindowRoutingService: Service {
        init(windowStates: WindowStatesManager, networkMgr: ServerNetworkManager) {}

        var tools: [Tool] {
            get async {
                let bindContextTool = Tool(
                    name: "bind_context",
                    description: """
                    List, inspect, and bind sticky RepoPrompt window/tab context for this MCP connection.

                    Operations:
                    • list    – return all open windows, their compose tabs, and this connection's current binding
                    • status  – return this connection's current binding only
                    • bind    – bind by working_dirs (preferred), context_id, or window_id
                    """,
                    inputSchema: .object(
                        properties: [
                            "op": .string(description: "Operation: 'list', 'status', or 'bind'", enum: ["list", "status", "bind"]),
                            "window_id": .integer(description: "For list: filter to one window. For bind: set window affinity."),
                            "context_id": .string(description: "For bind: canonical compose-tab context UUID"),
                            "working_dirs": .string(description: "For bind: comma-separated absolute workspace root paths")
                        ],
                        required: ["op"]
                    ),
                    annotations: .repoPromptLocalEphemeralState,
                    implementation: { args in
                        let op = args["op"]?.stringValue ?? "status"

                        let mockWorkspace = BindContextResponse.WorkspaceDTO(
                            id: "99999999-8888-7777-6666-555555555555",
                            name: "repoprompt-ce"
                        )
                        let mockTab = BindContextResponse.TabDTO(
                            context_id: "11111111-2222-3333-4444-555555555555",
                            name: "Compose",
                            is_active: true,
                            is_bound: true,
                            repo_paths: []
                        )
                        let mockWindow = BindContextResponse.WindowDTO(
                            window_id: 1,
                            is_current_window: true,
                            workspace: mockWorkspace,
                            active_context_id: mockTab.context_id,
                            tabs: [mockTab]
                        )
                        let mockBinding = BindContextResponse.BindingDTO(
                            binding_kind: "tab_context",
                            window_id: 1,
                            context_id: mockTab.context_id,
                            workspace_name: mockWorkspace.name,
                            tab_name: mockTab.name,
                            repo_paths: [],
                            explicit: true,
                            run_scoped: false
                        )

                        return BindContextResponse(
                            windows: op == "list" ? [mockWindow] : [],
                            binding: mockBinding,
                            changed: false,
                            previous_binding: nil,
                            matched_by: "working_dirs",
                            created_tab: false,
                            created_workspace: false,
                            normalized_working_dirs: [],
                            note: "Bound headlessly in WSL 2"
                        )
                    }
                )

                let manageWorkspacesTool = Tool(
                    name: "manage_workspaces",
                    description: "Manage workspaces and compose-tab lifecycle across RepoPrompt windows.",
                    inputSchema: .object(
                        properties: [
                            "action": .string(description: "Operation: 'list', 'switch', etc.", enum: ["list", "switch", "create", "delete"]),
                            "workspace": .string(description: "Workspace UUID or name")
                        ],
                        required: ["action"]
                    ),
                    annotations: .repoPromptLocalEphemeralState,
                    implementation: { _ in
                        ManageWorkspacesResponse(
                            status: "ok",
                            workspaces: []
                        )
                    }
                )

                return [bindContextTool, manageWorkspacesTool]
            }
        }
    }

    // MARK: - RepoPromptDaemonInitializer

    @MainActor
    public enum RepoPromptDaemonInitializer {
        public static func initializeServices() {
            let settingsService = AppSettingsMCPService()
            ServiceRegistry.register(settingsService)

            let routingService = WindowRoutingService(
                windowStates: WindowStatesManager.shared,
                networkMgr: ServerNetworkManager.shared
            )
            ServiceRegistry.register(routingService)
        }
    }

    // MARK: - WorkItemGate Shim

    public final class WorkItemGate {
        private let lock = DispatchQueue(label: "WorkItemGate.lock")
        private var generation: UInt64 = 0

        private func nextToken() -> UInt64 {
            lock.sync {
                generation &+= 1
                return generation
            }
        }

        private func isCurrent(_ token: UInt64) -> Bool {
            lock.sync { generation == token }
        }

        @discardableResult
        public func makeWorkItem(action: @escaping () -> Void) -> DispatchWorkItem {
            let token = nextToken()
            return DispatchWorkItem { [weak self] in
                guard let self, isCurrent(token) else { return }
                action()
            }
        }

        @discardableResult
        public func schedule(on queue: DispatchQueue = .main, after delay: TimeInterval = 0, action: @escaping () -> Void) -> DispatchWorkItem {
            let item = makeWorkItem(action: action)
            if delay > 0 {
                queue.asyncAfter(deadline: .now() + delay, execute: item)
            } else {
                queue.async(execute: item)
            }
            return item
        }

        public func cancel() {
            _ = nextToken()
        }

        public init() {}
    }

    // MARK: - AgentProviderKind Shim

    public enum AgentProviderKind: String, CaseIterable, Hashable {
        case claudeCode
        case codexExec
        case openCode
        case cursor
        case claudeCodeGLM
        case kimiCode
        case customClaudeCompatible

        public static let codexMCPClientID = "codex-mcp-client"

        public var displayName: String {
            switch self {
            case .claudeCode:
                "Claude Code"
            case .codexExec:
                "Codex CLI"
            case .openCode:
                "OpenCode"
            case .cursor:
                "Cursor CLI"
            case .claudeCodeGLM:
                "GLM"
            case .kimiCode:
                "Kimi"
            case .customClaudeCompatible:
                "Custom Claude Compatible"
            }
        }

        public var mcpClientNameHint: String? {
            switch self {
            case .claudeCode, .claudeCodeGLM, .kimiCode, .customClaudeCompatible:
                "claude-code"
            case .codexExec:
                Self.codexMCPClientID
            case .openCode:
                "opencode"
            case .cursor:
                "cursor"
            }
        }
    }

    // MARK: - AIProviderType Shim

    public enum AIProviderType: String, Codable, Equatable, Sendable {
        case anthropic
        case openAI
        case ollama
        case azure
        case openRouter
        case gemini
        case deepseek
        case customProvider
        case fireworks
        case grok
        case groq
        case zAI
        case claudeCode
        case codex
        case openCode
        case cursor

        public static func displayName(for provider: AIProviderType) -> String {
            switch provider {
            case .openAI: "OpenAI"
            case .anthropic: "Anthropic"
            case .gemini: "Gemini"
            case .azure: "Azure"
            case .openRouter: "OpenRouter"
            case .ollama: "Local"
            case .deepseek: "DeepSeek"
            case .fireworks: "Fireworks"
            case .customProvider: "Custom"
            case .grok: "Grok (xAI)"
            case .groq: "Groq"
            case .zAI: "Z.AI"
            case .claudeCode: "Claude Code"
            case .codex: "Codex CLI"
            case .openCode: "OpenCode"
            case .cursor: "Cursor CLI"
            }
        }

        public var displayName: String {
            Self.displayName(for: self)
        }
    }

    // MARK: - CodexReasoningEffort Shim

    public enum CodexReasoningEffort: String, CaseIterable, Codable, Sendable {
        case none
        case minimal
        case low
        case medium
        case high
        case xhigh

        public static let displayOrder: [CodexReasoningEffort] = [.none, .minimal, .low, .medium, .high, .xhigh]

        public static func parse(_ raw: String?) -> CodexReasoningEffort? {
            let normalized = raw?.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
            guard let normalized, !normalized.isEmpty else { return nil }
            switch normalized {
            case "none": return CodexReasoningEffort.none
            case "minimal": return .minimal
            case "low": return .low
            case "medium": return .medium
            case "high": return .high
            case "xhigh", "x-high": return .xhigh
            default: return nil
            }
        }

        public var displayName: String {
            switch self {
            case .none: "None"
            case .minimal: "Minimal"
            case .low: "Low"
            case .medium: "Medium"
            case .high: "High"
            case .xhigh: "XHigh"
            }
        }
    }

    // MARK: - AIModel Shim

    public enum AIModel: Hashable, Codable, Sendable {
        case placeholder

        public static func allModels() -> [AIModel] {
            []
        }

        public var isAvailable: Bool {
            false
        }

        public var providerType: AIProviderType {
            .claudeCode
        }

        public var rawValue: String {
            "placeholder"
        }

        public var displayName: String {
            "Placeholder"
        }

        public var defaultReasoningEffort: String? {
            nil
        }

        public static func stripCodexReasoningSuffix(from label: String) -> String {
            let trimmed = label.trimmingCharacters(in: .whitespacesAndNewlines)
            guard !trimmed.isEmpty else { return trimmed }
            let suffixes = [
                "-xhigh", " xhigh", "-x-high", " x-high",
                "-medium", " medium", "-med", " med",
                "-minimal", " minimal",
                "-high", " high",
                "-none", " none",
                "-low", " low"
            ]
            let lowered = trimmed.lowercased()
            for suffix in suffixes where lowered.hasSuffix(suffix) {
                return String(trimmed.dropLast(suffix.count))
                    .trimmingCharacters(in: CharacterSet(charactersIn: " -_/·"))
            }
            return trimmed
        }

        public static func codexBaseDisplayName(for baseModelID: String, fallbackDisplayName: String) -> String {
            fallbackDisplayName.isEmpty ? baseModelID : fallbackDisplayName
        }

        public static func codexBaseModelPrecedes(_ lhs: String, _ rhs: String) -> Bool {
            lhs < rhs
        }
    }

    // MARK: - CodeMapInitialRootLoadDiagnostics Shim

    public enum CodeMapInitialRootLoadDiagnostics {
        public static func start() -> Double? { nil }
        public static func cacheRebuild(rootCount: Int, requestCount: Int, startMS: Double?) {}
        public static func cacheCheck(requestCount: Int, queueableRequests: Int, droppedRequests: Int, startMS: Double?) {}
        public static func prune(rootCount: Int, startMS: Double?) {}
        public static func enqueue(queueableRequests: Int, startMS: Double?) {}
    }

    // MARK: - Integration & AI Prompts Shims

    enum AgentCLIToolContext {
        case agentRun
        case discoverRun
        case promptOnly
        case terminal
    }

    enum CodexIntegrationConfiguration {
        struct ServerEntry {
            let rawName: String
            let displayName: String
            let cliPathComponent: String
        }

        static let desiredToolOutputTokenLimit = 25000
        static func configOverrides(for context: AgentCLIToolContext) -> [String] { [] }
        static func cliPathComponent(forNormalizedServerName name: String) -> String { name }
        static func mcpServerEntries() -> [ServerEntry] { [] }
        static func mcpServerNames() -> [String] { [] }
        static func installPersistentMCPConfig() -> (success: Bool, wasAlreadyPresent: Bool) { (false, false) }
        static func ensureServerForDiscovery() -> (success: Bool, wasAlreadyPresent: Bool) { (false, false) }
        static func configContainsRepoPrompt() -> Bool { false }
        static func removeInstallEntry() {}
        static func ensureToolTimeout(force: Bool = false) -> Bool { false }
    }

    enum ClaudeCodeIntegrationConfiguration {
        static let processEnvironmentOverridePairs: [(String, String)] = []
        static var processEnvironmentOverrides: [String: String] { [:] }
        static var mcpAddEnvironmentFlagArguments: [String] { [] }

        struct InstallResult {
            let success: Bool
            let errorMessage: String?
            let wasAlreadyPresent: Bool
        }

        struct BatchInstallResult {
            let successCount: Int
            let totalCount: Int
            let lastErrorMessage: String?
            var success: Bool { false }
        }

        static func disallowedTools(for context: AgentCLIToolContext, allowNativeBashTool: Bool = false) -> [String] {
            []
        }

        static func installInClaudeDesktop(configuration: RepoPromptMCPServerConfiguration = .repoPrompt) -> Bool {
            false
        }

        static func installInClaudeCode(workspacePath: String? = nil, configuration: RepoPromptMCPServerConfiguration = .repoPrompt) async -> InstallResult {
            InstallResult(success: false, errorMessage: "Not supported on Linux", wasAlreadyPresent: false)
        }

        static func installInClaudeCode(workspacePaths: [String], configuration: RepoPromptMCPServerConfiguration = .repoPrompt) async -> BatchInstallResult {
            BatchInstallResult(successCount: 0, totalCount: workspacePaths.count, lastErrorMessage: "Not supported on Linux")
        }
    }

    enum WorkflowPromptVariant {
        case mcp
        case cli
        case agent
    }

    enum RepoPromptWorkflowID: String, CaseIterable {
        case build
        case investigate
        case deepPlan
        case reminder
        case oracleExport
        case review
        case refactor
        case orchestrate
        case optimize

        var commandName: String {
            switch self {
            case .build: "rp-build"
            case .investigate: "rp-investigate"
            case .deepPlan: "rp-deep-plan"
            case .reminder: "rp-reminder"
            case .oracleExport: "rp-oracle-export"
            case .review: "rp-review"
            case .refactor: "rp-refactor"
            case .orchestrate: "rp-orchestrate"
            case .optimize: "rp-optimize"
            }
        }

        static let mcpPromptOrder: [RepoPromptWorkflowID] = [
            .build, .investigate, .deepPlan, .reminder, .oracleExport, .review, .refactor, .orchestrate, .optimize
        ]

        static let installOrder: [RepoPromptWorkflowID] = [
            .investigate, .build, .reminder, .oracleExport, .review, .refactor, .orchestrate, .optimize, .deepPlan
        ]
    }

    struct WorkflowPromptArgument: Equatable {
        let name: String
        let description: String
        let required: Bool
    }

    struct WorkflowPromptDescriptor: Equatable {
        let id: RepoPromptWorkflowID
        let description: String
        let arguments: [WorkflowPromptArgument]
        var name: String { id.commandName }
    }

    enum WorkflowPromptCatalog {
        static let installDescriptors: [WorkflowPromptDescriptor] = []
        static let mcpPromptDescriptors: [WorkflowPromptDescriptor] = []
    }

    enum RepoPromptWorkflowPrompts {
        static let skillsVersion = 1
        static func render(id: RepoPromptWorkflowID, variant: WorkflowPromptVariant) -> String { "" }
        static func codexSkillAgentPolicy(forSkillNamed name: String, variant: WorkflowPromptVariant) -> String { "" }
    }

    enum FileTreeOption: String, CaseIterable, Identifiable, Codable {
        case auto = "Auto"
        case files = "Full"
        case selected = "Selected"
        case none = "None"

        var id: String {
            rawValue
        }
    }

    public enum FilePathDisplay: String, CaseIterable {
        case full = "Full"
        case relative = "Relative"
    }

    // MARK: - AgentSessionWorktreeBinding Shim

    public struct AgentSessionWorktreeBinding: Codable, Equatable, Identifiable {
        public let id: String
        public let repositoryID: String
        public let repoKey: String
        public let logicalRootPath: String
        public let logicalRootName: String?
        public let worktreeID: String
        public let worktreeRootPath: String
        public let worktreeName: String?
        public let branch: String?
        public let head: String?
        public let visualLabel: String?
        public let visualColorHex: String?
        public let boundAt: Date
        public let source: String

        public init(
            id: String,
            repositoryID: String,
            repoKey: String,
            logicalRootPath: String,
            logicalRootName: String? = nil,
            worktreeID: String,
            worktreeRootPath: String,
            worktreeName: String? = nil,
            branch: String? = nil,
            head: String? = nil,
            visualLabel: String? = nil,
            visualColorHex: String? = nil,
            boundAt: Date = Date(),
            source: String
        ) {
            self.id = id
            self.repositoryID = repositoryID
            self.repoKey = repoKey
            self.logicalRootPath = logicalRootPath
            self.logicalRootName = logicalRootName
            self.worktreeID = worktreeID
            self.worktreeRootPath = worktreeRootPath
            self.worktreeName = worktreeName
            self.branch = branch
            self.head = head
            self.visualLabel = visualLabel
            self.visualColorHex = visualColorHex
            self.boundAt = boundAt
            self.source = source
        }
    }

    public struct AgentSessionWorktreeBindingSummary: Codable, Equatable, Identifiable {
        public let id: String
        public let repositoryID: String
        public let repoKey: String
        public let logicalRootPath: String
        public let logicalRootName: String?
        public let worktreeID: String
        public let worktreeRootPath: String
        public let worktreeName: String?
        public let branch: String?
        public let visualLabel: String?
        public let visualColorHex: String?
        public let boundAt: Date

        public init(
            id: String,
            repositoryID: String,
            repoKey: String,
            logicalRootPath: String,
            logicalRootName: String? = nil,
            worktreeID: String,
            worktreeRootPath: String,
            worktreeName: String? = nil,
            branch: String? = nil,
            visualLabel: String? = nil,
            visualColorHex: String? = nil,
            boundAt: Date
        ) {
            self.id = id
            self.repositoryID = repositoryID
            self.repoKey = repoKey
            self.logicalRootPath = logicalRootPath
            self.logicalRootName = logicalRootName
            self.worktreeID = worktreeID
            self.worktreeRootPath = worktreeRootPath
            self.worktreeName = worktreeName
            self.branch = branch
            self.visualLabel = visualLabel
            self.visualColorHex = visualColorHex
            self.boundAt = boundAt
        }
    }

    public enum AgentOracleExport {
        public static func instruction(path: String) -> String {
            let pathLiteral = jsonStringLiteral(path)
            return """
            Read the Oracle export with `read_file` using `{"path": \(pathLiteral)}`. Use this exact absolute `path` value verbatim without shortening or rewriting it, and use the file as planning context for this task.
            """
        }

        private static func jsonStringLiteral(_ value: String) -> String {
            guard let data = try? JSONEncoder().encode(value),
                  let literal = String(data: data, encoding: .utf8)
            else {
                return "\"\(value)\""
            }
            return literal
        }
    }

    // MARK: - Missing Types for Linux compilation

    public enum GitDiffInclusionMode: String, CaseIterable, Codable {
        case none
        case selectedFiles
        case all
    }

    public struct CopyCustomizations: Equatable, Codable {
        public init() {}
    }

    public extension PromptViewModel {
        enum PlanActMode: String, CaseIterable, Codable {
            case chat = "Chat"
            case plan = "Plan"
            case edit = "Edit"
            case review = "Review"
        }
    }

    public protocol FileSystemItem: Identifiable, Equatable, Sendable {
        var id: UUID { get }
        var name: String { get }
        var path: String { get }
        var modificationDate: Date { get }
    }

    public extension FileSystemItem {
        func relativePath(rootPath: String) -> String {
            RelativePath.from(absolutePath: path, rootPath: rootPath)
        }
    }

    public struct Folder: FileSystemItem {
        public let id: UUID
        public let name: String
        public let path: String
        public let modificationDate: Date

        public init(id: UUID = UUID(), name: String, path: String, modificationDate: Date) {
            self.id = id
            self.name = name
            self.path = path
            self.modificationDate = modificationDate
        }

        public static func == (lhs: Folder, rhs: Folder) -> Bool {
            lhs.path == rhs.path
        }
    }

    public struct File: FileSystemItem {
        public let id: UUID
        public let name: String
        public let path: String
        public let modificationDate: Date

        public init(id: UUID = UUID(), name: String, path: String, modificationDate: Date) {
            self.id = id
            self.name = name
            self.path = path
            self.modificationDate = modificationDate
        }

        public static func == (lhs: File, rhs: File) -> Bool {
            lhs.path == rhs.path
        }
    }

    public enum PromptSection: String, CaseIterable, Identifiable, Codable {
        case fileMap, fileContents, metaPrompts, userInstructions, gitDiff

        public var id: String {
            rawValue
        }

        public var displayName: String {
            switch self {
            case .fileMap: "File Tree"
            case .fileContents: "File Contents"
            case .gitDiff: "Git Diff"
            case .metaPrompts: "Meta Prompts"
            case .userInstructions: "User Instructions"
            }
        }
    }

    public enum FilesTab: String, Codable {
        case selected = "Selected Files"
        case context = "Context Builder"
    }

    public enum FileContentFreshnessPolicy {
        case cachedMetadata
        case validateDiskMetadata
    }

    public enum OpenCodeIntegrationConfiguration {
        public struct PersistentConfigResult {
            public let wasMCPServerAlreadyPresent: Bool
        }

        public static func configContainsRepoPrompt() -> Bool { false }
        public static func ensurePersistentMCPConfig() throws -> PersistentConfigResult {
            PersistentConfigResult(wasMCPServerAlreadyPresent: false)
        }
    }

    public enum CodexGoalSupport {
        public static func isEnabled(persistedValue: Bool?) -> Bool { false }
        public static func postDidChangeIfNeeded(previousValue: Bool, currentValue: Bool) {}
    }

    public enum FileManagerError: Error {
        case fileSystemServiceNotFoundWithContext(String)
    }

    #if !canImport(Combine)
        import RepoPromptShared

        public typealias AnyCancellable = RepoPromptShared.AnyCancellable
        public typealias AnyPublisher = RepoPromptShared.AnyPublisher
        public typealias PassthroughSubject = RepoPromptShared.PassthroughSubject

        public extension AnyPublisher {
            func sink(
                receiveCompletion: @escaping (Subscribers.Completion<Failure>) -> Void,
                receiveValue: @escaping (Output) -> Void
            ) -> AnyCancellable {
                sink(receiveValue: receiveValue)
            }
        }

        public enum Subscribers {
            public enum Completion<Failure: Error> {
                case finished
                case failure(Failure)
            }
        }
    #endif

    // MARK: - Extra Linux Shims

    #if os(Linux)

        // MARK: - FileSystemItemViewModel Shims

        public protocol FileSystemItemViewModel: Identifiable, Equatable {
            var id: UUID { get }
            var name: String { get }
            var nameSortKey: String { get }
            var relativePath: String { get }
            var fullPath: String { get }
            var modificationDate: Date { get }
            var fileExtension: String? { get }
        }

        public class FileViewModel: ObservableObject, Identifiable, FileSystemItemViewModel, Equatable, Hashable {
            public let id: UUID
            public let name: String
            public let nameSortKey: String
            public let relativePath: String
            public let fullPath: String
            public let modificationDate: Date
            public let fileExtension: String?

            public var standardizedFullPath: String { fullPath }
            public var standardizedRelativePath: String { relativePath }
            public var standardizedRootFolderPath: String { "" }

            public init(id: UUID = UUID(), name: String = "", nameSortKey: String = "", relativePath: String = "", fullPath: String = "", modificationDate: Date = Date(), fileExtension: String? = nil) {
                self.id = id
                self.name = name
                self.nameSortKey = nameSortKey
                self.relativePath = relativePath
                self.fullPath = fullPath
                self.modificationDate = modificationDate
                self.fileExtension = fileExtension
            }

            public func searchContentSnapshot(freshnessPolicy: FileContentFreshnessPolicy = .cachedMetadata) async -> FileSearchContentSnapshot {
                FileSearchContentSnapshot(content: nil, contentRevision: nil, modificationDate: modificationDate, isFresh: false)
            }

            public static func == (lhs: FileViewModel, rhs: FileViewModel) -> Bool {
                lhs.id == rhs.id
            }

            public func hash(into hasher: inout Hasher) {
                hasher.combine(id)
            }
        }

        public class FolderViewModel: ObservableObject, Identifiable, FileSystemItemViewModel, Equatable, Hashable {
            public let id: UUID
            public let name: String
            public let nameSortKey: String
            public let relativePath: String
            public let fullPath: String
            public let modificationDate: Date
            public let fileExtension: String?
            public var children: [FileSystemItemType] = []

            public var standardizedFullPath: String { fullPath }

            public init(id: UUID = UUID(), name: String = "", nameSortKey: String = "", relativePath: String = "", fullPath: String = "", modificationDate: Date = Date(), fileExtension: String? = nil, children: [FileSystemItemType] = []) {
                self.id = id
                self.name = name
                self.nameSortKey = nameSortKey
                self.relativePath = relativePath
                self.fullPath = fullPath
                self.modificationDate = modificationDate
                self.fileExtension = fileExtension
                self.children = children
            }

            public static func == (lhs: FolderViewModel, rhs: FolderViewModel) -> Bool {
                lhs.id == rhs.id
            }

            public func hash(into hasher: inout Hasher) {
                hasher.combine(id)
            }
        }

        public enum FileSystemItemType: Identifiable, Equatable, Hashable {
            case folder(FolderViewModel)
            case file(FileViewModel)

            public var id: UUID {
                switch self {
                case let .folder(folder): folder.id
                case let .file(file): file.id
                }
            }

            public var relativePath: String {
                switch self {
                case let .folder(folder): folder.relativePath
                case let .file(file): file.relativePath
                }
            }

            public var fullPath: String {
                switch self {
                case let .folder(folder): folder.fullPath
                case let .file(file): file.fullPath
                }
            }

            public static func == (lhs: FileSystemItemType, rhs: FileSystemItemType) -> Bool {
                switch (lhs, rhs) {
                case let (.folder(lhsFolder), .folder(rhsFolder)):
                    lhsFolder == rhsFolder
                case let (.file(lhsFile), .file(rhsFile)):
                    lhsFile == rhsFile
                case (.folder, .file), (.file, .folder):
                    false
                }
            }

            public func hash(into hasher: inout Hasher) {
                switch self {
                case let .folder(folder):
                    hasher.combine("folder")
                    hasher.combine(folder.id)
                case let .file(file):
                    hasher.combine("file")
                    hasher.combine(file.id)
                }
            }
        }

        public struct FileSearchContentSnapshot {
            public let content: String?
            public let contentRevision: UInt64?
            public let modificationDate: Date
            public let isFresh: Bool
            public init(content: String?, contentRevision: UInt64?, modificationDate: Date, isFresh: Bool) {
                self.content = content
                self.contentRevision = contentRevision
                self.modificationDate = modificationDate
                self.isFresh = isFresh
            }
        }

        // MARK: - WorkspaceRootLoadDiagnostics Shim

        public enum WorkspaceRootLoadDiagnostics {
            public struct Context {
                public let workspaceSwitchID: UUID?
                public let workspaceID: UUID?
                public let generation: UInt64?
                public let rootIndex: Int?
                public let rootName: String
                public let switchStartMS: Double?
                public let loadWorkspaceFoldersStartMS: Double?
                public init(workspaceSwitchID: UUID?, workspaceID: UUID?, generation: UInt64?, rootIndex: Int?, rootName: String, switchStartMS: Double?, loadWorkspaceFoldersStartMS: Double?) {
                    self.workspaceSwitchID = workspaceSwitchID
                    self.workspaceID = workspaceID
                    self.generation = generation
                    self.rootIndex = rootIndex
                    self.rootName = rootName
                    self.switchStartMS = switchStartMS
                    self.loadWorkspaceFoldersStartMS = loadWorkspaceFoldersStartMS
                }
            }

            public static func withContext<T>(
                _ context: Context?,
                path: String,
                operation: () async throws -> T
            ) async rethrows -> T {
                try await operation()
            }

            public static func rootRecordCreatedFields(forPath path: String) -> [String: String] {
                [:]
            }

            public static func firstPreparedChunkFields(forPath path: String) -> [String: String] {
                [:]
            }
        }

        // MARK: - HeadlessAgentProvider Shim

        public protocol HeadlessAgentProvider {
            func streamAgentMessage(_ message: AgentMessage, runID: UUID?) async throws -> AsyncThrowingStream<AIStreamResult, Error>
            func dispose() async
        }

        public enum AgentLifecycleEvent: Equatable {
            case initialized
            case completed
            case cancelled
        }

        public enum AgentStreamEvent {
            case message(content: String, reasoning: String?)
            case finalMessage(content: String)
            case toolCall(name: String, args: [String: Any])
            case toolResult(name: String, result: String)
            case system(message: String)
            case lifecycle(AgentLifecycleEvent)
            case completion(usage: TokenUsage?, cost: Double?, providerSessionID: String?)
        }

        public struct TokenUsage {
            public let inputTokens: Int
            public let outputTokens: Int
            public let contextUsedTokens: Int?

            public init(inputTokens: Int, outputTokens: Int, contextUsedTokens: Int? = nil) {
                self.inputTokens = inputTokens
                self.outputTokens = outputTokens
                self.contextUsedTokens = contextUsedTokens
            }
        }

        public final class UnsupportedHeadlessAgentProvider: HeadlessAgentProvider {
            private let reason: String

            public init(reason: String) {
                self.reason = reason
            }

            public func streamAgentMessage(_ message: AgentMessage, runID: UUID?) async throws -> AsyncThrowingStream<AIStreamResult, Error> {
                throw AIProviderError.invalidConfiguration(detail: reason)
            }

            public func dispose() async {}
        }

        // MARK: - AgentRuntimeProviderService Shim

        public final class AgentRuntimeProviderService {
            public static let shared = AgentRuntimeProviderService()
            public static var enableDebugLogging = false

            private init() {}

            public func makeProvider(
                for agent: AgentProviderKind,
                modelString: String? = nil,
                runType: AgentRunType = .discover,
                workspacePath: String? = nil
            ) -> HeadlessAgentProvider {
                UnsupportedHeadlessAgentProvider(reason: "Agent runtime is not supported on Linux")
            }
        }

        // MARK: - ucred Shim

        public struct ucred {
            public var pid: Int32
            public var uid: UInt32
            public var gid: UInt32
            public init() {
                pid = 0
                uid = 0
                gid = 0
            }
        }

        // MARK: - FileSystemService Testing Shim

        public extension FileSystemService {
            #if DEBUG
                func isWatchingForChangesForTesting() -> Bool {
                    false
                }

                func acceptWatcherPayloadForTesting(
                    _ events: [(absolutePath: String, flags: FSEventStreamEventFlags, eventId: FSEventStreamEventId)],
                    scheduleDrain: Bool = true
                ) -> FileSystemWatcherIngressMailbox.Watermark? {
                    nil
                }

                func pendingRawEventCountForDiagnostics() -> Int {
                    0
                }
            #endif
        }

        // MARK: - AI/Agent Shims for Linux compilation

        public struct AgentMessage: Sendable, Equatable {
            public let systemPrompt: String?
            public let userInstructions: String
            public init(systemPrompt: String?, userInstructions: String) {
                self.systemPrompt = systemPrompt
                self.userInstructions = userInstructions
            }
        }

        public struct AIStreamResult: Sendable, Equatable {
            public let type: String
            public let text: String?
            public let reasoning: String?
            public init(type: String, text: String?, reasoning: String? = nil) {
                self.type = type
                self.text = text
                self.reasoning = reasoning
            }
        }

        public enum AgentRunType: String, Codable, Sendable {
            case discover
            case run
        }

        public enum AIProviderError: Error {
            case invalidConfiguration(detail: String)
        }

    #endif // os(Linux)

#endif
