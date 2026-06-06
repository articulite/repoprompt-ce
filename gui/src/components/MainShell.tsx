import React, { useState, useEffect } from "react";
import {
  FolderTree, MessageSquare, Terminal, Settings,
  ChevronDown, Plus, RefreshCw, LogOut, Code, GitBranch,
  HardDrive
} from "lucide-react";
import { mcpClient } from "../mcpClient";
import ChatPanel from "./ChatPanel";
import AgentModePanel from "./AgentModePanel";

interface MainShellProps {
  workspaceName: string;
  onExitWorkspace: () => void;
  isConnected: boolean;
}

export default function MainShell({ workspaceName, onExitWorkspace, isConnected }: MainShellProps) {
  const [activeTab, setActiveTab] = useState<"chat" | "agent" | "settings">("chat");
  const [fileTree, setFileTree] = useState<string>("Loading workspace directory...");
  const [treeMode, setTreeMode] = useState<"auto" | "full" | "folders">("auto");
  const [loadingTree, setLoadingTree] = useState(false);
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [showWSMenu, setShowWSMenu] = useState(false);
  const [gitBranch, setGitBranch] = useState<string>("main");
  const [showAddFolder, setShowAddFolder] = useState(false);
  const [newFolderPath, setNewFolderPath] = useState("");
  const [roots, setRoots] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isConnected) {
      loadWorkspaceContext();
      loadWorkspacesList();
    }
  }, [isConnected, workspaceName]);

  const loadWorkspaceContext = async () => {
    setLoadingTree(true);
    try {
      // Fetch file tree
      const treeRes = await mcpClient.callTool("get_file_tree", {
        type: "files",
        mode: treeMode
      });
      if (treeRes && !treeRes.isError && treeRes.content && treeRes.content[0]?.text) {
        setFileTree(treeRes.content[0].text);
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
        const parsed = JSON.parse(res.content[0].text);
        if (parsed.workspaces) {
          setWorkspaces(parsed.workspaces);
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

          {/* File Tree Pre-block */}
          <div className="file-tree-container">
            {loadingTree ? (
              <div className="tree-loading">
                <RefreshCw size={18} className="animate-spin text-muted" />
                <span>Reading directory tree...</span>
              </div>
            ) : (
              <pre className="file-tree-code">{fileTree}</pre>
            )}
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
          {activeTab === 'agent' && <AgentModePanel isConnected={isConnected} />}
          {activeTab === 'settings' && (
            <div className="settings-panel animate-fade-in">
              <div className="settings-card glass">
                <h2>System Settings</h2>
                <p className="text-secondary">Workspace environment diagnostics and engine configs.</p>

                <div className="settings-group">
                  <h3>Active Root Paths</h3>
                  <div className="roots-list">
                    {roots.map((r, i) => (
                      <div key={i} className="root-item">
                        <Code size={14} />
                        <code>{r}</code>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="settings-group">
                  <h3>WSL Environment Diagnostic Information</h3>
                  <div className="diag-grid">
                    <div className="diag-item">
                      <span className="label">OS Target</span>
                      <span className="value">Ubuntu (WSL 2)</span>
                    </div>
                    <div className="diag-item">
                      <span className="label">IPC Bridge Mode</span>
                      <span className="value">WebSocket JSON-RPC</span>
                    </div>
                    <div className="diag-item">
                      <span className="label">Local Port Bind</span>
                      <span className="value">0.0.0.0:5173</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
