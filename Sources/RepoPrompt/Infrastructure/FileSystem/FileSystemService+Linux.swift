#if os(Linux)
    #if canImport(Combine)
        import Combine
    #endif
    import Foundation
    import RepoPromptShared

    extension FileSystemService {
        // MARK: - Public watchers API

        /// Returns ordered publications whenever changes or watcher progress are detected.
        func publisherForChanges() -> AnyPublisher<FileSystemDeltaPublication, Never> {
            changePublisher.eraseToAnyPublisher()
        }

        /// Request to stop watching for changes.
        func stopWatchingForChanges() {
            // No-op on Linux
        }

        /// (Re)start the watcher stream if needed.
        func startWatchingForChanges() {
            // No-op on Linux
        }

        func fileExistsOnDisk(relativePath: String) -> Bool {
            let absolutePath = fullPath(forRelativePath: relativePath)
            return fm.fileExists(atPath: absolutePath, isDirectory: nil)
        }

        func regularFileExistsOnDisk(relativePath rawRelativePath: String) -> Bool {
            let lifecycleCorrelation = EditFlowPerf.currentLifecycleCorrelation
            EditFlowPerf.lifecycleEvent(
                EditFlowPerf.Lifecycle.Search.contentFreshnessRootEntered,
                correlation: lifecycleCorrelation,
                EditFlowPerf.Dimensions(rootToken: diagnosticRootToken.uuidString)
            )
            let validationState = EditFlowPerf.begin(EditFlowPerf.Stage.Search.contentFreshnessValidationRootActorBody)
            var outcome = "missing"
            defer {
                EditFlowPerf.end(
                    EditFlowPerf.Stage.Search.contentFreshnessValidationRootActorBody,
                    validationState,
                    EditFlowPerf.Dimensions(outcome: outcome, rootToken: diagnosticRootToken.uuidString)
                )
                EditFlowPerf.lifecycleEvent(
                    EditFlowPerf.Lifecycle.Search.contentFreshnessRootReturned,
                    correlation: lifecycleCorrelation,
                    EditFlowPerf.Dimensions(outcome: outcome, rootToken: diagnosticRootToken.uuidString)
                )
            }
            let relativePath = (rawRelativePath as NSString).standardizingPath.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
            guard !relativePath.isEmpty, !relativePath.hasPrefix("../"), relativePath != ".." else { return false }
            let absolutePath = fullPath(forRelativePath: relativePath)
            let standardizedAbsolutePath = (absolutePath as NSString).standardizingPath
            let rootPrefix = standardizedRootPath.hasSuffix("/") ? standardizedRootPath : standardizedRootPath + "/"
            guard standardizedAbsolutePath == standardizedRootPath || standardizedAbsolutePath.hasPrefix(rootPrefix) else { return false }

            var isDirectory = ObjCBool(false)
            guard fm.fileExists(atPath: standardizedAbsolutePath, isDirectory: &isDirectory), !isDirectory.boolValue else { return false }
            if let values = try? URL(fileURLWithPath: standardizedAbsolutePath).resourceValues(forKeys: [.isRegularFileKey, .isSymbolicLinkKey]) {
                if values.isSymbolicLink == true { return false }
                if values.isRegularFile == false { return false }
            }
            if skipSymlinks, pathContainsSymlinkComponent(relativePath: relativePath) { return false }
            outcome = "current"
            return true
        }

        func catalogEligibleRegularFileExists(relativePath rawRelativePath: String) async -> Bool {
            await catalogRegularFileEligibility(relativePath: rawRelativePath).isEligible
        }

        func catalogFolderIsDiscoverable(relativePath rawRelativePath: String) async -> Bool {
            let relativePath = (rawRelativePath as NSString).standardizingPath.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
            guard !relativePath.isEmpty, relativePath != "..", !relativePath.hasPrefix("../") else { return false }
            let absolutePath = fullPath(forRelativePath: relativePath)
            let standardizedAbsolutePath = (absolutePath as NSString).standardizingPath
            let rootPrefix = standardizedRootPath.hasSuffix("/") ? standardizedRootPath : standardizedRootPath + "/"
            guard standardizedAbsolutePath.hasPrefix(rootPrefix) else { return false }

            var isDirectory = ObjCBool(false)
            guard fm.fileExists(atPath: standardizedAbsolutePath, isDirectory: &isDirectory), isDirectory.boolValue else { return false }
            if skipSymlinks && pathContainsSymlinkComponent(relativePath: relativePath) { return false }
            let canonicalPath = URL(fileURLWithPath: standardizedAbsolutePath).resolvingSymlinksInPath().path
            let canonicalPrefix = canonicalRootPath.hasSuffix("/") ? canonicalRootPath : canonicalRootPath + "/"
            guard canonicalPath == canonicalRootPath || canonicalPath.hasPrefix(canonicalPrefix) else { return false }

            if enableHierarchicalIgnores {
                return await !(isIgnoredHierarchical(relativePath: relativePath, isDirectory: true) || isIgnoredPrefixCheck(relativePath: relativePath, isDirectory: true))
            }
            return !isIgnoredPrefixCheck(relativePath: relativePath, isDirectory: true)
        }

        func catalogRegularFileEligibility(relativePath rawRelativePath: String) async -> CatalogRegularFileEligibility {
            let relativePath = (rawRelativePath as NSString).standardizingPath.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
            guard !relativePath.isEmpty, !relativePath.hasPrefix("../"), relativePath != ".." else {
                return .ineligible(.invalidRelativePath)
            }
            let absolutePath = fullPath(forRelativePath: relativePath)
            let standardizedAbsolutePath = (absolutePath as NSString).standardizingPath
            let rootPrefix = standardizedRootPath.hasSuffix("/") ? standardizedRootPath : standardizedRootPath + "/"
            guard standardizedAbsolutePath.hasPrefix(rootPrefix) else { return .ineligible(.outsideRoot) }

            var isDirectory = ObjCBool(false)
            guard fm.fileExists(atPath: standardizedAbsolutePath, isDirectory: &isDirectory), !isDirectory.boolValue else {
                return .ineligible(.missingOrDirectory)
            }
            let url = URL(fileURLWithPath: standardizedAbsolutePath)
            if let values = try? url.resourceValues(forKeys: [.isRegularFileKey, .isSymbolicLinkKey]) {
                if values.isSymbolicLink == true { return .ineligible(.symbolicLink) }
                if values.isRegularFile == false { return .ineligible(.nonRegularFile) }
            }
            if skipSymlinks && pathContainsSymlinkComponent(relativePath: relativePath) {
                return .ineligible(.symlinkComponent)
            }

            let canonicalPath = url.resolvingSymlinksInPath().path
            let canonicalPrefix = canonicalRootPath.hasSuffix("/") ? canonicalRootPath : canonicalRootPath + "/"
            guard canonicalPath == canonicalRootPath || canonicalPath.hasPrefix(canonicalPrefix) else {
                return .ineligible(.outsideCanonicalRoot)
            }

            let isIgnored: Bool = if enableHierarchicalIgnores {
                await isIgnoredHierarchical(relativePath: relativePath, isDirectory: false) || isIgnoredPrefixCheck(relativePath: relativePath)
            } else {
                isIgnoredPrefixCheck(relativePath: relativePath)
            }
            return isIgnored ? .ineligible(.ignored) : .eligible
        }

        func registerExplicitlyManagedRegularFile(relativePath rawRelativePath: String) async -> CatalogRegularFileEligibility {
            let eligibility = await catalogRegularFileEligibility(relativePath: rawRelativePath)
            switch eligibility {
            case .eligible, .ineligible(.ignored):
                let relativePath = (rawRelativePath as NSString).standardizingPath.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
                visitedPaths.insert(relativePath)
                visitedItems[relativePath] = false
            case .ineligible:
                break
            }
            return eligibility
        }

        func pathContainsSymlinkComponent(relativePath: String) -> Bool {
            var current = rootURL
            for component in relativePath.split(separator: "/") {
                current.appendPathComponent(String(component))
                if ((try? current.resourceValues(forKeys: [.isSymbolicLinkKey]).isSymbolicLink) ?? false) == true {
                    return true
                }
            }
            return false
        }

        nonisolated func captureAcceptedWatcherWatermark() -> FileSystemWatcherIngressMailbox.Watermark {
            watcherIngressMailbox.captureAcceptedWatermark()
        }

        func flushPendingEventsNow() async {
            _ = await flushPendingEventsNow(throughAcceptedWatcherWatermark: captureAcceptedWatcherWatermark())
        }

        func flushPendingEventsNow(
            throughAcceptedWatcherWatermark target: FileSystemWatcherIngressMailbox.Watermark
        ) async -> UInt64 {
            // No-op on Linux
            lastServicePublicationSequence
        }
    }
#endif
