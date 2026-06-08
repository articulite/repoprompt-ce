import React, { useState, useEffect } from "react";
import {
  Sparkles, AlertCircle, Play, Loader2,
  Book, MessageSquare, List, FolderPlus, Sliders, Trash2
} from "lucide-react";
import { mcpClient } from "../mcpClient";
import { safeParseJSON } from "../utils";

interface WorkspaceSummary {
  id: string;
  name: string;
  allRepoPaths?: string[];
  showingWindowIDs?: number[];
  isHidden?: boolean;
}

interface WorkspaceEntryViewProps {
  onWorkspaceSelected: (workspaceName: string) => void;
  isConnected: boolean;
}

export default function WorkspaceEntryView({ onWorkspaceSelected, isConnected }: WorkspaceEntryViewProps) {
  const [folderPath, setFolderPath] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [recents, setRecents] = useState<WorkspaceSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRestore, setAutoRestore] = useState(true);
  const [showManageModal, setShowManageModal] = useState(false);

  // Load settings on mount
  useEffect(() => {
    const storedAuto = localStorage.getItem("autoRestoreWorkspaces");
    if (storedAuto !== null) {
      setAutoRestore(storedAuto === "true");
    }
  }, []);

  useEffect(() => {
    if (isConnected) {
      fetchRecentsAndCheckRestore();
    }
  }, [isConnected]);

  const fetchRecentsAndCheckRestore = async () => {
    try {
      setError(null);
      const res = await mcpClient.callTool("manage_workspaces", { action: "list" });
      if (res && !res.isError && res.content && res.content[0]?.text) {
        const parsed = safeParseJSON(res.content[0].text);
        if (parsed?.workspaces) {
          const normalized: WorkspaceSummary[] = parsed.workspaces.map((ws: any) => {
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
          setRecents(normalized);

          // If autoRestore is enabled, check if daemon already has active workspace loaded
          const storedAuto = localStorage.getItem("autoRestoreWorkspaces") !== "false";
          const hasExplicitExit = sessionStorage.getItem("explicitExit") === "true";
          if (storedAuto && !hasExplicitExit) {
            const contextRes = await mcpClient.callTool("workspace_context", {});
            if (contextRes && !contextRes.isError && contextRes.content && contextRes.content[0]?.text) {
              const text = contextRes.content[0].text;

              let hasRoots = false;
              try {
                const parsed = JSON.parse(text);
                hasRoots = Array.isArray(parsed.roots) && parsed.roots.length > 0;
              } catch (e) {
                hasRoots = text.includes("Loaded roots:") && !text.includes("No workspace is currently loaded");
              }

              if (hasRoots) {
                // Determine active workspace name
                const activeWs = normalized.find(ws => ws.showingWindowIDs && ws.showingWindowIDs.length > 0)
                  || normalized[0];
                if (activeWs) {
                  onWorkspaceSelected(activeWs.name);
                }
              }
            }
          }
        }
      }
    } catch (err: any) {
      console.error("Failed to list workspaces", err);
      setError("Unable to load recent workspaces from daemon.");
    }
  };

  const handleOpenWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderPath.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const nameToUse = workspaceName.trim() || folderPath.split(/[/\\]/).pop() || "New Workspace";
      const res = await mcpClient.callTool("manage_workspaces", {
        action: "create",
        name: nameToUse,
        folder_path: folderPath.trim(),
        switch_to_created: true,
      });

      if (res.isError) {
        setError(res.content?.[0]?.text || "Failed to load workspace");
      } else {
        onWorkspaceSelected(nameToUse);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to connect and open workspace.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRecent = async (ws: WorkspaceSummary) => {
    setLoading(true);
    setError(null);

    try {
      const res = await mcpClient.callTool("manage_workspaces", {
        action: "switch",
        workspace: ws.id,
      });

      if (res.isError) {
        setError(res.content?.[0]?.text || "Failed to switch workspace");
      } else {
        onWorkspaceSelected(ws.name);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to switch workspace.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteWorkspace = async (wsId: string) => {
    if (!confirm("Are you sure you want to delete this workspace context?")) return;
    try {
      const res = await mcpClient.callTool("manage_workspaces", {
        action: "delete",
        workspace: wsId
      });
      if (res && res.isError) {
        alert("Failed to delete workspace: " + (res.content?.[0]?.text || "Unknown error"));
      } else {
        fetchRecentsAndCheckRestore();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const toggleAutoRestore = (checked: boolean) => {
    setAutoRestore(checked);
    localStorage.setItem("autoRestoreWorkspaces", String(checked));
  };

  const abbreviatePath = (path: string) => {
    if (!path) return "";
    let clean = path;
    // Format C:\Users\name or /home/name to ~
    clean = clean.replace(/^[a-zA-Z]:\\Users\\[^\\]+/, "~");
    clean = clean.replace(/^\/home\/[^/]+/, "~");
    return clean;
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="landing-layout">
      <div className="landing-card-expanded glass animate-fade-in">

        {/* Glow Header */}
        <div className="landing-header">
          <div className="logo-glow">
            <Sparkles className="logo-icon animate-pulse" size={28} />
          </div>
          <h1>RepoPrompt CE</h1>
          <p className="subtitle">WSL 2 Hybrid Environment Compiler Engine</p>
        </div>

        {/* Diagnostics Connection Alert */}
        {!isConnected ? (
          <div className="banner danger-banner animate-fade-in">
            <Loader2 className="animate-spin" size={14} />
            <span>Connecting to WSL Swift Daemon WebSocket Bridge...</span>
          </div>
        ) : error ? (
          <div className="banner error-banner animate-fade-in">
            <AlertCircle size={14} />
            <span>{error}</span>
          </div>
        ) : null}

        {/* Top Section: Open Folder & Documentation Links */}
        <div className="new-workspace-section glass">
          <div className="welcome-and-open">
            <h2>{getGreeting()}</h2>
            <p className="description-text">Open a folder to create or load a workspace project.</p>

            <form onSubmit={handleOpenWorkspace} className="workspace-open-inline-form">
              <div className="form-row">
                <input
                  type="text"
                  className="input"
                  placeholder="Windows absolute path e.g. C:\Projects\my-app"
                  value={folderPath}
                  onChange={(e) => setFolderPath(e.target.value)}
                  disabled={!isConnected || loading}
                />
                <input
                  type="text"
                  className="input input-name"
                  placeholder="Workspace Name (Optional)"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  disabled={!isConnected || loading}
                />
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={!isConnected || loading || !folderPath.trim()}
                >
                  {loading ? (
                    <Loader2 className="animate-spin" size={16} />
                  ) : (
                    <>
                      Open Folder <FolderPlus size={16} />
                    </>
                  )}
                </button>
              </div>
            </form>
            <span className="helper-text">
              Supports host directories (C:\...). Paths resolve to WSL /mnt/c/... natively.
            </span>
          </div>

          <div className="links-column border-left">
            <a href="https://repoprompt.com/docs" target="_blank" rel="noreferrer" className="help-link">
              <Book size={14} /> Setup Guide
            </a>
            <a href="https://repoprompt.com/docs" target="_blank" rel="noreferrer" className="help-link">
              <Book size={14} /> Documentation
            </a>
            <a href="https://discord.gg/NtbFDAJPGM" target="_blank" rel="noreferrer" className="help-link">
              <MessageSquare size={14} /> Discord Server
            </a>
            <a href="https://repoprompt.com/docs#s=changelog" target="_blank" rel="noreferrer" className="help-link">
              <List size={14} /> Changelog
            </a>
            <span className="version-tag">v1.2.0-CE</span>
          </div>
        </div>

        {/* Bottom Section: Recent Workspaces & Controls */}
        <div className="recent-workspaces-section">
          <div className="recent-section-header">
            <h3>Recent Workspaces</h3>

            <div className="recent-header-actions">
              {/* Toggle Chip for Auto Restore */}
              <label className="restore-toggle-chip">
                <input
                  type="checkbox"
                  checked={autoRestore}
                  onChange={(e) => toggleAutoRestore(e.target.checked)}
                />
                <span className="toggle-label-text">Auto restore on app launch</span>
              </label>

              {/* Manage Workspaces Switch Button */}
              <button
                type="button"
                className="btn btn-secondary btn-small"
                onClick={() => setShowManageModal(true)}
              >
                <Sliders size={12} /> Manage
              </button>
            </div>
          </div>

          {recents.length === 0 ? (
            <div className="empty-recents-grid glass">
              <p>No recent workspaces found on disk.</p>
              <span className="helper-text">Open a Windows absolute path above to compile.</span>
            </div>
          ) : (
            <div className="recent-workspaces-grid">
              {recents.slice(0, 6).map((ws) => (
                <div key={ws.id} className="workspace-card glass" onClick={() => handleSelectRecent(ws)}>
                  <div className="card-info">
                    <span className="name">{ws.name}</span>
                    <span className="path" title={ws.allRepoPaths?.[0] || ""}>
                      {abbreviatePath(ws.allRepoPaths?.[0] || "")}
                    </span>
                  </div>
                  <button className="play-btn-circle">
                    <Play size={10} fill="currentColor" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Manage Workspaces Dialog Modal */}
      {showManageModal && (
        <div className="modal-overlay animate-fade-in" onClick={() => setShowManageModal(false)}>
          <div className="modal-content glass" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header border-bottom">
              <h3>Manage Workspaces</h3>
              <button className="close-btn" onClick={() => setShowManageModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              {recents.length === 0 ? (
                <p className="text-secondary text-center">No workspaces listed.</p>
              ) : (
                <div className="manage-list">
                  {recents.map((ws) => (
                    <div key={ws.id} className="manage-item border-bottom">
                      <div className="info">
                        <span className="title">{ws.name}</span>
                        <code className="path">{ws.allRepoPaths?.[0]}</code>
                      </div>
                      <div className="actions">
                        <button
                          className="btn-delete"
                          title="Delete workspace context"
                          onClick={() => handleDeleteWorkspace(ws.id)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
