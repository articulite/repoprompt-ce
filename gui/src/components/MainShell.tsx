import React, { useState, useEffect } from "react";
import {
  FolderTree, MessageSquare, Terminal, Settings, Cpu,
  ChevronDown, Plus, RefreshCw, LogOut, GitBranch,
  HardDrive, Folder, FolderOpen, File, FileText, FileCode,
  ChevronRight
} from "lucide-react";
import { mcpClient } from "../mcpClient";
import { safeParseJSON } from "../utils";
import ChatPanel from "./ChatPanel";
import ContextBuilderPanel from "./ContextBuilderPanel";
import AgentModePanel from "./AgentModePanel";
import SettingsPanel from "./SettingsPanel";

interface TreeNode {
  id: string;
  name: string;
  depth: number;
  isFolder: boolean;
  rawLine: string;
  isSelected?: boolean;
  hasCodeMap?: boolean;
}

interface MainShellProps {
  workspaceName: string;
  onExitWorkspace: () => void;
  isConnected: boolean;
}

export default function MainShell({ workspaceName, onExitWorkspace, isConnected }: MainShellProps) {
  const [activeTab, setActiveTab] = useState<"chat" | "agent" | "context" | "settings">("chat");
  const [fileTree, setFileTree] = useState<string>("Loading workspace directory...");
  const [treeMode, setTreeMode] = useState<"auto" | "full" | "folders">("auto");
  const [loadingTree, setLoadingTree] = useState(false);
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [showWSMenu, setShowWSMenu] = useState(false);
  const [gitBranch, setGitBranch] = useState<string>("main");
  const [showAddFolder, setShowAddFolder] = useState(false);
  const [newFolderPath, setNewFolderPath] = useState("");
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());
  const [roots, setRoots] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isConnected) {
      loadWorkspaceContext();
      loadWorkspacesList();
    }
  }, [isConnected, workspaceName]);

  // Automatically switch tab to chat when a prompt is injected
  useEffect(() => {
    const handlePromptInjected = () => {
      setActiveTab("chat");
    };
    window.addEventListener("injectPromptIntoChat", handlePromptInjected);
    return () => window.removeEventListener("injectPromptIntoChat", handlePromptInjected);
  }, []);

  const loadWorkspaceContext = async () => {
    setLoadingTree(true);
    try {
      // Fetch file tree
      const treeRes = await mcpClient.callTool("get_file_tree", {
        type: "files",
        mode: treeMode
      });
      if (treeRes && !treeRes.isError && treeRes.content && treeRes.content[0]?.text) {
        const text = treeRes.content[0].text;
        const parsed = safeParseJSON(text);
        if (parsed && parsed.tree) {
          setFileTree(parsed.tree);
        } else {
          setFileTree(text);
        }
      } else {
        setFileTree("Failed to fetch directory tree.");
      }

      // Fetch active workspace context (roots, git branch etc.)
      const contextRes = await mcpClient.callTool("workspace_context", {});
      if (contextRes && !contextRes.isError && contextRes.content && contextRes.content[0]?.text) {
        // Try parsing context details
        const text = contextRes.content[0].text;
        // Search for branch or path details
        const branchMatch = text.match(/branch:\s*([^\s\n]+)/i) || text.match(/on branch\s*([^\s\n]+)/i);
        if (branchMatch) {
          setGitBranch(branchMatch[1]);
        }

        // Extract loaded roots
        const rootsList: string[] = [];
        const lines = text.split("\n");
        lines.forEach(line => {
          if (line.includes("→")) {
            rootsList.push(line.trim());
          }
        });
        setRoots(rootsList);
      }
    } catch (err) {
      console.error("Failed to load workspace context", err);
      setFileTree("Error connecting to workspace files.");
    } finally {
      setLoadingTree(false);
    }
  };

  const loadWorkspacesList = async () => {
    try {
      const res = await mcpClient.callTool("manage_workspaces", { action: "list" });
      if (res && !res.isError && res.content && res.content[0]?.text) {
        const parsed = safeParseJSON(res.content[0].text);
        if (parsed?.workspaces) {
          const normalized = parsed.workspaces.map((ws: any) => {
            if (typeof ws === "string") {
              return {
                id: ws,
                name: ws,
                allRepoPaths: [],
                showingWindowIDs: [],
                isHidden: false
              };
            }
            return ws;
          });
          setWorkspaces(normalized);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSwitchWorkspace = async (wsId: string, _wsName: string) => {
    setShowWSMenu(false);
    setLoadingTree(true);
    try {
      const res = await mcpClient.callTool("manage_workspaces", {
        action: "switch",
        workspace: wsId
      });
      if (res && res.isError) {
        alert("Switch failed: " + (res.content?.[0]?.text || "Unknown error"));
      } else {
        // Reload context under new workspace
        window.location.reload(); // Refresh to clean states cleanly
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderPath.trim()) return;
    setError(null);
    try {
      const res = await mcpClient.callTool("manage_workspaces", {
        action: "add_folder",
        folder_path: newFolderPath.trim()
      });
      if (res && res.isError) {
        setError(res.content?.[0]?.text || "Failed to add folder");
      } else {
        setNewFolderPath("");
        setShowAddFolder(false);
        loadWorkspaceContext();
      }
    } catch (err: any) {
      setError(err.message || "Failed to add folder");
    }
  };

  return (
    <div className="app-container animate-fade-in">
      {/* Sidebar navigation */}
      <aside className="sidebar glass">
        {/* Workspace Dropdown Header */}
        <div className="sidebar-header">
          <div className="workspace-selector" onClick={() => setShowWSMenu(!showWSMenu)}>
            <div className="workspace-info">
              <span className="ws-label">ACTIVE WORKSPACE</span>
              <span className="ws-name">{workspaceName}</span>
            </div>
            <ChevronDown size={16} className={`transition-transform ${showWSMenu ? 'rotate-180' : ''}`} />
          </div>

          {showWSMenu && (
            <div className="workspace-dropdown glass animate-fade-in">
              <div className="dropdown-title">Switch Workspace</div>
              <div className="dropdown-list">
                {workspaces.map((ws) => (
                  <button
                    key={ws.id}
                    className={`dropdown-item ${ws.name === workspaceName ? 'active' : ''}`}
                    onClick={() => handleSwitchWorkspace(ws.id, ws.name)}
                  >
                    <span>{ws.name}</span>
                  </button>
                ))}
              </div>
              <div className="dropdown-divider"></div>
              <button className="dropdown-item exit-btn" onClick={onExitWorkspace}>
                <LogOut size={14} /> Exit Workspace
              </button>
            </div>
          )}
        </div>

        {/* Tab Selection */}
        <nav className="sidebar-nav">
          <button
            className={`nav-tab ${activeTab === 'chat' ? 'active' : ''}`}
            onClick={() => setActiveTab('chat')}
          >
            <MessageSquare size={16} /> Chat Workspace
          </button>
          <button
            className={`nav-tab ${activeTab === 'context' ? 'active' : ''}`}
            onClick={() => setActiveTab('context')}
          >
            <Cpu size={16} /> Context Builder
          </button>
          <button
            className={`nav-tab ${activeTab === 'agent' ? 'active' : ''}`}
            onClick={() => setActiveTab('agent')}
          >
            <Terminal size={16} /> Agent Execution
          </button>
          <button
            className={`nav-tab ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <Settings size={16} /> Configuration
          </button>
        </nav>

        {/* File Explorer Section */}
        <div className="explorer-section">
          <div className="explorer-header">
            <h3>
              <FolderTree size={14} /> EXPLORER
            </h3>
            <div className="explorer-actions">
              <button
                className="btn-icon-small"
                title="Add Folder to Workspace"
                onClick={() => setShowAddFolder(!showAddFolder)}
              >
                <Plus size={14} />
              </button>
              <button
                className="btn-icon-small"
                title="Refresh File Tree"
                onClick={loadWorkspaceContext}
                disabled={loadingTree}
              >
                <RefreshCw size={14} className={loadingTree ? "animate-spin" : ""} />
              </button>
            </div>
          </div>

          {showAddFolder && (
            <form onSubmit={handleAddFolder} className="add-folder-form animate-fade-in">
              <input
                type="text"
                className="input input-small"
                placeholder="Windows absolute path C:\..."
                value={newFolderPath}
                onChange={(e) => setNewFolderPath(e.target.value)}
                autoFocus
              />
              <div className="form-actions">
                <button type="submit" className="btn btn-primary btn-small">Add</button>
                <button
                  type="button"
                  className="btn btn-secondary btn-small"
                  onClick={() => setShowAddFolder(false)}
                >
                  Cancel
                </button>
              </div>
              {error && <span className="error-text">{error}</span>}
            </form>
          )}

          {/* Tree Mode Selector */}
          <div className="tree-modes">
            <button
              className={treeMode === 'auto' ? 'active' : ''}
              onClick={() => { setTreeMode('auto'); setTimeout(loadWorkspaceContext, 50); }}
            >
              Auto
            </button>
            <button
              className={treeMode === 'full' ? 'active' : ''}
              onClick={() => { setTreeMode('full'); setTimeout(loadWorkspaceContext, 50); }}
            >
              Full
            </button>
            <button
              className={treeMode === 'folders' ? 'active' : ''}
              onClick={() => { setTreeMode('folders'); setTimeout(loadWorkspaceContext, 50); }}
            >
              Folders
            </button>
          </div>

          {/* File Tree Container */}
          <div className="file-tree-container">
            {loadingTree ? (
              <div className="tree-loading">
                <RefreshCw size={18} className="animate-spin text-muted" />
                <span>Reading directory tree...</span>
              </div>
            ) : (() => {
              // Parse the ASCII tree
              const parseAsciiTree = (treeStr: string): TreeNode[] => {
                if (!treeStr) return [];
                const lines = treeStr.split("\n");
                const nodes: TreeNode[] = [];

                for (let i = 0; i < lines.length; i++) {
                  const line = lines[i];
                  if (!line.trim()) continue;

                  const match = line.match(/^([│├└─┌\s]*)(.*)$/);
                  if (!match) continue;

                  const prefix = match[1];
                  let name = match[2].trim();
                  if (!name) continue;

                  const depth = prefix ? Math.floor(prefix.length / 4) : 0;

                  let isSelected = false;
                  let hasCodeMap = false;
                  if (name.endsWith(" *")) {
                    name = name.slice(0, -2);
                    isSelected = true;
                  }
                  if (name.endsWith(" +")) {
                    name = name.slice(0, -2);
                    hasCodeMap = true;
                  }

                  nodes.push({
                    id: `${i}-${name}`,
                    name,
                    depth,
                    isFolder: false,
                    rawLine: line,
                    isSelected,
                    hasCodeMap
                  });
                }

                for (let i = 0; i < nodes.length; i++) {
                  const node = nodes[i];
                  const nextNode = nodes[i + 1];
                  node.isFolder = nextNode ? nextNode.depth > node.depth : false;
                }

                return nodes;
              };

              const getFileIcon = (name: string, isFolder: boolean, isOpen: boolean) => {
                if (isFolder) {
                  return isOpen ? (
                    <FolderOpen size={13} className="folder-icon open" />
                  ) : (
                    <Folder size={13} className="folder-icon closed" />
                  );
                }

                const ext = name.split(".").pop()?.toLowerCase();
                switch (ext) {
                  case "swift":
                    return <FileCode size={13} className="file-icon swift" />;
                  case "tsx":
                  case "ts":
                  case "jsx":
                  case "js":
                    return <FileCode size={13} className="file-icon js" />;
                  case "css":
                  case "html":
                    return <FileCode size={13} className="file-icon html" />;
                  case "json":
                  case "yml":
                  case "yaml":
                  case "toml":
                    return <FileText size={13} className="file-icon config" />;
                  case "md":
                  case "txt":
                    return <FileText size={13} className="file-icon doc" />;
                  default:
                    return <File size={13} className="file-icon default" />;
                }
              };

              const handleFolderToggle = (nodeId: string, e: React.MouseEvent) => {
                e.stopPropagation();
                setCollapsedNodes(prev => {
                  const next = new Set(prev);
                  if (next.has(nodeId)) {
                    next.delete(nodeId);
                  } else {
                    next.add(nodeId);
                  }
                  return next;
                });
              };

              const handleFileClick = (node: TreeNode) => {
                navigator.clipboard.writeText(node.name);
                // Dispatch a custom event to notify listeners (e.g. ChatPanel or AgentModePanel)
                // that a file was clicked to allow autocomplete injection.
                const event = new CustomEvent("fileClickedInExplorer", { detail: { name: node.name } });
                window.dispatchEvent(event);
              };

              const allNodes = parseAsciiTree(fileTree);
              const visibleNodes: TreeNode[] = [];
              let currentCollapsedDepth = -1;

              for (const node of allNodes) {
                if (currentCollapsedDepth !== -1) {
                  if (node.depth > currentCollapsedDepth) {
                    continue;
                  } else {
                    currentCollapsedDepth = -1;
                  }
                }

                visibleNodes.push(node);

                if (node.isFolder && collapsedNodes.has(node.id)) {
                  currentCollapsedDepth = node.depth;
                }
              }

              if (visibleNodes.length === 0) {
                return <div className="tree-empty">Workspace is empty.</div>;
              }

              return (
                <div className="interactive-tree">
                  {visibleNodes.map((node) => {
                    const isCollapsed = collapsedNodes.has(node.id);
                    const isOpen = node.isFolder && !isCollapsed;

                    return (
                      <div
                        key={node.id}
                        className={`tree-row ${node.isSelected ? 'selected' : ''}`}
                        style={{ paddingLeft: `${node.depth * 10 + 4}px` }}
                        onClick={() => node.isFolder ? null : handleFileClick(node)}
                      >
                        {node.isFolder ? (
                          <button
                            type="button"
                            className="chevron-btn"
                            onClick={(e) => handleFolderToggle(node.id, e)}
                          >
                            {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                          </button>
                        ) : (
                          <span className="chevron-placeholder" />
                        )}

                        <span className="node-icon" onClick={(e) => node.isFolder ? handleFolderToggle(node.id, e) : null}>
                          {getFileIcon(node.name, node.isFolder, isOpen)}
                        </span>

                        <span className="node-name" onClick={(e) => node.isFolder ? handleFolderToggle(node.id, e) : null}>
                          {node.name}
                        </span>

                        {node.isSelected && <span className="badge-selected">★</span>}
                        {node.hasCodeMap && <span className="badge-codemap" title="Codemap indexed">CM</span>}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      </aside>

      {/* Main panel */}
      <main className="main-content">
        <header className="main-header glass">
          <div className="header-meta">
            <div className="git-indicator">
              <GitBranch size={14} />
              <span>{gitBranch}</span>
            </div>
            <div className="divider-vertical"></div>
            <div className="roots-indicator">
              <HardDrive size={14} />
              <span>{roots.length} Root{roots.length !== 1 ? 's' : ''} Loaded</span>
            </div>
          </div>
          <div className="connection-status">
            <span className={`status-dot ${isConnected ? 'online' : 'offline'}`}></span>
            <span className="status-label">{isConnected ? 'WSL Connected' : 'Disconnected'}</span>
          </div>
        </header>

        <div className="tab-viewport">
          {activeTab === 'chat' && <ChatPanel isConnected={isConnected} />}
          {activeTab === 'context' && <ContextBuilderPanel isConnected={isConnected} />}
          {activeTab === 'agent' && <AgentModePanel isConnected={isConnected} />}
          {activeTab === 'settings' && (
            <SettingsPanel
              isConnected={isConnected}
              roots={roots}
              onRefreshRoots={loadWorkspaceContext}
            />
          )}
        </div>
      </main>
    </div>
  );
}
