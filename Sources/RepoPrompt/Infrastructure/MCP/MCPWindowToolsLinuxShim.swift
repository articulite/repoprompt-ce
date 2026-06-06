#if os(Linux)
import Foundation
import MCP
import RepoPromptShared

@MainActor
enum MCPWindowToolsLinuxCoordinator {
    static func createHeadlessDependencies(window: WindowState) -> MCPWindowToolDependencies {
        let store = window.workspaceFileContextStore
        let searchService = window.workspaceSearchService
        let workspaceManager = window.workspaceManager
        let promptVM = window.promptManager

        return MCPWindowToolDependencies(
            executeOracleUtils: { _ in throw MCPError.invalidParams("Oracle utils not supported on Linux") },
            executeAskOracle: { _ in throw MCPError.invalidParams("Oracle not supported on Linux") },
            executeOracleSend: { _ in throw MCPError.invalidParams("Oracle not supported on Linux") },
            executeOracleChatLog: { _ in throw MCPError.invalidParams("Oracle log not supported on Linux") },
            executeAgentExplore: { _ in throw MCPError.invalidParams("Agent mode not supported on Linux") },
            executeAgentRun: { _ in throw MCPError.invalidParams("Agent mode not supported on Linux") },
            executeAgentManage: { _ in throw MCPError.invalidParams("Agent mode not supported on Linux") },
            requireTargetWindow: { window },
            requireCurrentTabContext: { _ in throw MCPError.invalidParams("Tabs not supported on Linux") },
            requireAgentModeConnection: { _ in throw MCPError.invalidParams("Agent connection not supported on Linux") },
            resolveAgentModeTabID: { _, _ in throw MCPError.invalidParams("Agent tab not supported on Linux") },
            resolveContextBuilderTab: { _, _, _ in throw MCPError.invalidParams("Context builder tab not supported on Linux") },
            bindTabForConnection: { _, _, _, _, _ in },
            buildTabSelectionReply: { _, _, _, _ in throw MCPError.invalidParams("Tab selection not supported on Linux") },
            sendStageProgress: { _, _, _, _ in },
            makeOracleExportDestination: { _, _, _ in throw MCPError.invalidParams("Oracle export not supported on Linux") },
            resolveDefaultOracleExportPath: { _, _, _ in throw MCPError.invalidParams("Oracle export path not supported on Linux") },
            writeGeneratedOracleExportFile: { _, _, _ in throw MCPError.invalidParams("Oracle export write not supported on Linux") },
            runMCPPlanOrQuestion: { _, _, _, _, _ in throw MCPError.invalidParams("MCP plans not supported on Linux") },
            windowID: window.windowID,
            promptVM: promptVM,
            workspaceManager: workspaceManager,
            selectionCoordinator: nil,
            applyEditsApprovalStore: ApplyEditsApprovalStore.shared,
            captureRequestMetadata: {
                MCPServerViewModel.RequestMetadata(
                    connectionID: UUID(),
                    clientName: "headless-linux",
                    windowID: window.windowID,
                    isClientAgentModeAnalogue: false,
                    isClientSystemWorkspaceAnalogue: false,
                    isClientWorkspaceDiagnosticsAnalogue: false,
                    clientAppID: nil
                )
            },
            resolveTabContextSnapshot: { _, _, _ in
                throw MCPError.invalidParams("Tabs not supported on Linux")
            },
            updateCurrentTabContext: { _, _ in },
            selectedRecordsForCurrentTabContext: { [] },
            boundTabID: { _ in nil as UUID? },
            mapFileManagerErrorToMCP: { error, action, path in
                MCPError.internalError("\(action) failed: \(error)")
            },
            ensureGitDataRootLoaded: { _, _ in },
            logDebug: { msg in print("[MCPDebug] \(msg)") },
            addPrimaryGitDiffArtifactsToSelection: { existing, _ in (existing, []) },
            workspaceSearch: { pattern, mode, isRegex, caseInsensitive, maxPaths, maxMatches, paths, includeExtensions, excludePatterns, contextLines, wholeWord, countOnly, fuzzySpaceMatching, rootScope in
                try await StoreBackedWorkspaceSearch.search(
                    pattern: pattern,
                    mode: mode,
                    isRegex: isRegex,
                    caseInsensitive: caseInsensitive,
                    maxPaths: maxPaths,
                    maxMatches: maxMatches,
                    paths: paths,
                    includeExtensions: includeExtensions,
                    excludePatterns: excludePatterns,
                    contextLines: contextLines,
                    wholeWord: wholeWord,
                    countOnly: countOnly,
                    fuzzySpaceMatching: fuzzySpaceMatching,
                    rootScope: rootScope,
                    store: store,
                    searchService: searchService,
                    workspaceManager: workspaceManager
                )
            },
            parseManageSelectionInputs: { _, _ in
                MCPServerViewModel.ManageSelectionInputs(paths: [], slices: [], errors: [:])
            },
            resolveFileToolLookupContext: { _ in
                WorkspaceLookupContext(
                    rootScope: .visibleWorkspace,
                    bindingProjection: nil
                )
            },
            stabilizedVirtualSelection: { _ in StoredSelection() },
            buildCurrentSelectionReply: { _, _, _, _, _ in
                ToolResultDTOs.SelectionReply(files: [], totalTokens: 0, status: "ok", invalidPaths: [])
            },
            buildSelectionPreviewReply: { _, _, _, _, _, _, _ in
                ToolResultDTOs.SelectionReply(files: [], totalTokens: 0, status: "ok", invalidPaths: [])
            },
            buildSelectionMutationReply: { _, _, _, _, _, _, _ in
                ToolResultDTOs.SelectionReply(files: [], totalTokens: 0, status: "ok", invalidPaths: [])
            },
            buildManageSelectionSetSelection: { _, _, _, _ in
                MCPServerViewModel.BuildStoredSelectionResult(selection: StoredSelection(), invalidPaths: [], warnings: [:], successPaths: [])
            },
            addStoredSelectionPaths: { _, _, _, _, _ in
                MCPServerViewModel.AddStoredSelectionResult(selection: StoredSelection(), invalidPaths: [], warnings: [:], successPaths: [], codeMapAddedPaths: [])
            },
            removeStoredSelectionPaths: { _, _, _, _, _ in
                (StoredSelection(), [], [:], false)
            },
            promoteStoredSelectionPaths: { _, _, _, _, _ in
                (StoredSelection(), [], false)
            },
            demoteStoredSelectionPaths: { _, _, _, _, _ in
                MCPServerViewModel.DemoteStoredSelectionResult(selection: StoredSelection(), invalidPaths: [], warnings: [:], successPaths: [], codeMapRemovedPaths: [])
            },
            computeSelectionSlicesVirtual: { _, _, _, _ in
                (StoredSelection(), MCPServerViewModel.MCPSelectionSlicesMutationResult(successEntries: [], invalidPaths: [], warnings: [:]), false)
            },
            persistResolvedTabContextSnapshot: { _, _, _ in },
            makeSelectionHintError: { _, _, _ in "" },
            performFileAction: { action, path, content, newPath, ifExists in
                let mutationService = WorkspaceFileMutationService(store: store)
                let lowercaseAction = action.lowercased()

                if lowercaseAction == "write" || lowercaseAction == "create" {
                    guard let content = content else {
                        throw MCPError.invalidParams("Missing content for write action")
                    }
                    if let existingFile = await mutationService.exactExistingFile(path, rootScope: .visibleWorkspace) {
                        try await mutationService.overwrite(file: existingFile, content: content)
                    } else {
                        _ = try await mutationService.createFile(userPath: path, content: content, rootScope: .visibleWorkspace)
                    }
                } else if lowercaseAction == "delete" {
                    if let existingFile = await mutationService.exactExistingFile(path, rootScope: .visibleWorkspace) {
                        try await store.moveItemToTrash(rootID: existingFile.rootID, relativePath: existingFile.standardizedRelativePath)
                    } else {
                        let translatedPath = PathTranslator.toWSLPath(path)
                        if FileManager.default.fileExists(atPath: translatedPath) {
                            try FileManager.default.removeItem(atPath: translatedPath)
                        } else {
                            throw MCPError.invalidParams("File not found to delete: \(path)")
                        }
                    }
                } else if lowercaseAction == "move" || lowercaseAction == "rename" {
                    guard let rawNewPath = newPath else {
                        throw MCPError.invalidParams("Missing newPath for move action")
                    }
                    let source = try await mutationService.resolveExactExistingFileForMutation(path, rootScope: .visibleWorkspace)
                    guard let sourceRoot = await store.rootRefs(scope: .allLoaded).first(where: { $0.id == source.rootID }) else {
                        throw MCPError.invalidParams("Cannot resolve source root for '\(path)'.")
                    }
                    let visibleRoots = await store.rootRefs(scope: .visibleWorkspace)
                    let newRelativePath = try MovePathResolver.resolveRelativePathInRoot(
                        userPath: rawNewPath,
                        sourceRoot: sourceRoot,
                        visibleRoots: visibleRoots
                    )
                    try await store.moveFile(rootID: source.rootID, from: source.standardizedRelativePath, to: newRelativePath)
                } else {
                    throw MCPError.invalidParams("Unsupported file action: \(action)")
                }
            },
            buildCodeStructureDTO: { files, maxResults, includeUnmapped, projection in
                ToolResultDTOs.SelectedCodeStructureDTO(
                    fileCount: 0,
                    content: ""
                )
            },
            resolveFilesForCodeStructure: { paths, lookupRootScope in
                let directFiles = await store.lookupFiles(
                    atPaths: paths,
                    profile: .mcpRead,
                    rootScope: lookupRootScope
                )
                var resolved: [WorkspaceFileRecord] = []
                var seenPaths = Set<String>()

                for path in paths {
                    if let file = directFiles[path], seenPaths.insert(file.standardizedFullPath).inserted {
                        resolved.append(file)
                    }
                }

                let dirCandidates = paths.filter { !directFiles.keys.contains($0) }
                for raw in dirCandidates {
                    let folderResolution = await store.expandFolderInputToFiles(raw, rootScope: lookupRootScope, profile: .mcpSelection)
                    guard folderResolution.handled else { continue }
                    for file in folderResolution.files where seenPaths.insert(file.standardizedFullPath).inserted {
                        resolved.append(file)
                    }
                }

                return resolved
            },
            buildStoreBackedFileTreeResult: { mode, maxDepth, startPath, lookupContext in
                let snapshotMode: WorkspaceFileTreeSnapshotMode
                switch mode.lowercased() {
                case "selected": snapshotMode = .selected
                case "full": snapshotMode = .full
                case "folders": snapshotMode = .folders
                case "auto": snapshotMode = .auto
                default: throw MCPError.invalidParams("invalid mode: \(mode)")
                }

                let filePathDisplay = await MainActor.run { window.promptManager.filePathDisplayOption }
                let showCodeMapMarkers = await MainActor.run { !window.promptManager.codeMapsGloballyDisabled }
                let rawSnapshot = await store.makeFileTreeSelectionSnapshot(
                    selection: StoredSelection(),
                    request: WorkspaceFileTreeSnapshotRequest(
                        mode: snapshotMode,
                        filePathDisplay: filePathDisplay,
                        onlyIncludeRootsWithSelectedFiles: false,
                        includeLegend: false,
                        showCodeMapMarkers: showCodeMapMarkers,
                        rootScope: lookupContext.rootScope,
                        startPath: startPath.map { PathTranslator.toWSLPath($0) },
                        maxDepth: maxDepth
                    ),
                    profile: .mcpRead
                )

                if rawSnapshot.roots.isEmpty {
                    let hasStartPath = startPath?.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty == false
                    return (FileTreeResult(
                        tree: hasStartPath ? "Requested path is outside the loaded roots" : "No workspace loaded",
                        usedSelectedMarker: false,
                        usedCodeMapMarker: false,
                        wasTruncated: false,
                        note: hasStartPath ? "Requested path is outside the loaded roots" : "No workspace loaded"
                    ), 0)
                }

                let tree = CodeMapExtractor.generateFileTree(using: rawSnapshot)
                return (FileTreeResult(
                    tree: tree,
                    usedSelectedMarker: tree.contains(" *"),
                    usedCodeMapMarker: showCodeMapMarkers && tree.contains(" +"),
                    wasTruncated: false,
                    note: nil
                ), rawSnapshot.roots.count)
            },
            readFile: { path, startLine1Based, lineCount, lookupRootScope in
                let wslPath = PathTranslator.toWSLPath(path)
                let readableService = WorkspaceReadableFileService(store: store)
                await readableService.awaitFreshnessForExplicitRequest(wslPath, fallbackScope: lookupRootScope)

                guard let readableFile = await readableService.resolveReadableFile(wslPath, profile: .mcpRead, rootScope: lookupRootScope) else {
                    let msg = "Cannot read '\(path)'."
                    throw MCPError.invalidParams(msg)
                }

                let full: String
                let displayPath: String
                let shouldAutoSelect: Bool

                switch readableFile {
                case let .workspace(file):
                    guard let workspaceContent = try await store.readContent(
                        rootID: file.rootID,
                        relativePath: file.standardizedRelativePath,
                        workloadClass: .interactiveRead
                    ) else {
                        throw MCPError.internalError("content unavailable")
                    }
                    full = workspaceContent
                    let roots = await store.rootRefs(scope: lookupRootScope)
                    displayPath = ClientPathFormatter.displayAbsolutePath(fullPath: file.standardizedFullPath, visibleRoots: roots)
                    shouldAutoSelect = true
                case let .external(externalFile):
                    do {
                        full = try await readableService.readAlwaysReadableExternalFile(externalFile)
                    } catch {
                        throw MCPError.invalidParams("Cannot read '\(externalFile.displayPath)': \(error.localizedDescription)")
                    }
                    displayPath = externalFile.displayPath
                    shouldAutoSelect = false
                }

                let pairs = String.splitContentPreservingAllLineEndings(full)
                let total = pairs.count

                if let s1 = startLine1Based {
                    if s1 < 0, lineCount != nil {
                        throw MCPError.invalidParams("limit parameter is not allowed with negative start_line. Use start_line=-N to read the last N lines.")
                    }
                    if s1 == 0 {
                        throw MCPError.invalidParams("start_line must be positive (1-based) or negative (tail-like behavior)")
                    }
                }

                let (first, lastExclusive): (Int, Int) = {
                    if let s1 = startLine1Based, s1 < 0 {
                        let linesToRead = abs(s1)
                        let start = max(0, total - linesToRead)
                        return (start, total)
                    }
                    let s1 = startLine1Based ?? 1
                    let start0 = max(0, s1 - 1)
                    let end = (lineCount != nil && lineCount! >= 0)
                        ? min(total, start0 + lineCount!)
                        : total
                    return (start0, end)
                }()

                if !(first < total || total == 0) {
                    let winDisplayPath = PathTranslator.toWindowsPath(displayPath)
                    return (
                        ToolResultDTOs.ReadFileReply(
                            content: "",
                            totalLines: total,
                            firstLine: max(1, first + 1),
                            lastLine: total,
                            message: "Requested start_line exceeds file length.",
                            displayPath: winDisplayPath
                        ),
                        shouldAutoSelect
                    )
                }

                let contentSlice: String = {
                    if total == 0 { return "" }
                    let slice = pairs[first ..< lastExclusive]
                    return slice.map { $0.line + $0.ending }.joined()
                }()

                let shownFirst = total == 0 ? 0 : (first + 1)
                let shownLast = total == 0 ? 0 : lastExclusive
                let winDisplayPath = PathTranslator.toWindowsPath(displayPath)

                return (
                    ToolResultDTOs.ReadFileReply(
                        content: contentSlice,
                        totalLines: total,
                        firstLine: shownFirst,
                        lastLine: shownLast,
                        message: nil,
                        displayPath: winDisplayPath
                    ),
                    shouldAutoSelect
                )
            },
            enqueueReadFileAutoSelection: { _, _, _ in },
            drainReadFileAutoSelection: { _, _ in },
            enqueueFileSearchAutoSelection: { _, _, _, _ in },
            workspaceContextMessage: { _, _ in "" },
            parseCopyPresetSelector: { _ in nil as MCPServerViewModel.CopyPresetSelector? },
            resolveCopyPreset: { _ in nil as CopyPreset? },
            buildTabWorkspaceContext: { _, _, _, _, _ in
                ToolResultDTOs.PromptContextDTO(
                    prompt: "",
                    selection: nil,
                    fileBlocks: nil,
                    codeStructure: nil,
                    fileTree: nil,
                    tokenStats: nil,
                    userTokenStats: nil,
                    tokenStatsNote: nil,
                    copyPreset: nil,
                    copyPresets: nil,
                    worktreeScope: nil
                )
            },
            selectedFilesWithStats: { _ in
                ToolResultDTOs.SelectedFilesReply(files: [], totalTokens: 0, fileSlices: nil, summary: nil, codeMapUsage: nil)
            },
            selectionCollectionsForCurrentTabContext: {
                MCPServerViewModel.SelectionReplyAssembler.SelectionCollections(
                    selected: [],
                    codemap: [],
                    codemapAutoEnabled: false,
                    codeMapUsage: .none,
                    invalid: [],
                    codemapSnapshots: [:]
                )
            },
            buildCopyPresetContextDTO: { _, _ in
                let desc = ToolResultDTOs.CopyPresetDescriptorDTO(id: UUID().uuidString, name: "Headless", kind: "standard", isBuiltIn: true)
                return ToolResultDTOs.CopyPresetContextDTO(active: desc, effective: desc, isOverridden: false)
            },
            buildCopyPresetsListDTO: { [] },
            copyPresetDescriptorDTO: { _ in
                ToolResultDTOs.CopyPresetDescriptorDTO(id: UUID().uuidString, name: "Headless", kind: "standard", isBuiltIn: true)
            },
            buildExportSelectedFileInfos: { _, _, _, _ in [] },
            buildTabClipboardContent: { _, _ in "" },
            writePromptExportFile: { _, _ in "" },
            latestTokenBreakdown: {
                TokenCountingViewModel.TokenBreakdown(total: 0, files: 0, prompt: 0, meta: 0, fileTree: 0, git: 0, other: 0)
            }
        )
    }

    static func registerHeadlessMCPWindowTools(window: WindowState) {
        let deps = createHeadlessDependencies(window: window)
        let runtime = MCPWindowToolRuntime(windowID: window.windowID) { name, freshnessPolicy, timeoutSeconds, args, implementation in
            let context = MCPWindowToolContext(toolName: name, windowID: window.windowID)
            return try await implementation(context, args)
        }

        let providers: [any MCPWindowToolProviding] = [
            MCPSelectionToolProvider(runtime: runtime, dependencies: deps),
            MCPFileToolProvider(runtime: runtime, dependencies: deps),
            MCPPromptContextToolProvider(runtime: runtime, dependencies: deps),
            MCPApplyEditsToolProvider(runtime: runtime, dependencies: deps),
            MCPOracleToolProvider(runtime: runtime, dependencies: deps),
            MCPGitToolProvider(runtime: runtime, dependencies: deps),
            MCPWorktreeToolProvider(runtime: runtime, dependencies: deps),
            MCPContextBuilderToolProvider(runtime: runtime, dependencies: deps),
            MCPAskUserToolProvider(runtime: runtime, dependencies: deps),
            MCPAgentControlToolProvider(runtime: runtime, dependencies: deps),
            MCPAgentSessionControlToolProvider(runtime: runtime, dependencies: deps)
        ]

        let catalogService = MCPWindowToolCatalogService(windowID: window.windowID, providers: providers)
        ServiceRegistry.register(catalogService)
        print("[HeadlessWindowTools] Successfully registered MCPWindowToolCatalogService with window ID \(window.windowID)")
    }
}
#endif
