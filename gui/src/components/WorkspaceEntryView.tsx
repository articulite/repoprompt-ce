import React, { useState, useEffect } from "react";
import { FolderOpen, History, Sparkles, AlertCircle, ArrowRight, Play, Loader2 } from "lucide-react";
import { mcpClient } from "../mcpClient";

interface WorkspaceSummary {
  id: string;
  name: string;
  allRepoPaths: string[];
  showingWindowIDs: number[];
  isHidden: boolean;
}

interface WorkspaceEntryViewProps {
  onWorkspaceSelected: (workspaceName: string, windowId?: number) => void;
  isConnected: boolean;
}

export default function WorkspaceEntryView({ onWorkspaceSelected, isConnected }: WorkspaceEntryViewProps) {
  const [folderPath, setFolderPath] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [recents, setRecents] = useState<WorkspaceSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isConnected) {
      fetchRecents();
    }
  }, [isConnected]);

  const fetchRecents = async () => {
    try {
      setError(null);
      const res = await mcpClient.callTool("manage_workspaces", { action: "list" });
      if (res && !res.isError && res.content && res.content[0]?.text) {
        const parsed = JSON.parse(res.content[0].text);
        if (parsed.workspaces) {
          setRecents(parsed.workspaces);
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
      // Create or switch to workspace
      const nameToUse = workspaceName.trim() || folderPath.split(/[/\\]/).pop() || "New Workspace";
      const res = await mcpClient.callTool("manage_workspaces", {
        action: "create",
        name: nameToUse,
        folder_path: folderPath.trim(),
        switch_to_created: true,
      });

      if (res.isError) {
        const errMsg = res.content?.[0]?.text || "Failed to load workspace";
        setError(errMsg);
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

  return (
    <div className="landing-layout">
      <div className="landing-card glass animate-fade-in">
        {/* Glow Header */}
        <div className="landing-header">
          <div className="logo-glow">
            <Sparkles className="logo-icon" size={32} />
          </div>
          <h1>RepoPrompt CE</h1>
          <p className="subtitle">WSL 2 Hybrid Environment Compiler Engine</p>
        </div>

        {/* Connection Diagnostics Banner */}
        {!isConnected ? (
          <div className="banner danger-banner animate-fade-in">
            <Loader2 className="animate-spin" size={16} />
            <span>Connecting to WSL Swift Daemon WebSocket Bridge...</span>
          </div>
        ) : error ? (
          <div className="banner error-banner animate-fade-in">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        ) : null}

        {/* Action Options Grid */}
        <div className="landing-grid">
          {/* Section: Open Directory */}
          <div className="grid-section">
            <h2>
              <FolderOpen size={18} /> Open Workspace
            </h2>
            <form onSubmit={handleOpenWorkspace} className="workspace-form">
              <div className="form-group">
                <label htmlFor="folderPath">Absolute Windows Folder Path</label>
                <input
                  id="folderPath"
                  type="text"
                  className="input"
                  placeholder="e.g. C:\Users\kaika\Projects\my-app"
                  value={folderPath}
                  onChange={(e) => setFolderPath(e.target.value)}
                  disabled={!isConnected || loading}
                />
                <span className="helper-text">
                  Supports host paths (e.g. C:\...). Resolved as /mnt/c/... internally.
                </span>
              </div>

              <div className="form-group">
                <label htmlFor="workspaceName">Workspace Name (Optional)</label>
                <input
                  id="workspaceName"
                  type="text"
                  className="input"
                  placeholder="Defaults to folder name"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  disabled={!isConnected || loading}
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-full"
                disabled={!isConnected || loading || !folderPath.trim()}
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={16} /> Loading...
                  </>
                ) : (
                  <>
                    Open Workspace <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Section: Recents List */}
          <div className="grid-section border-left">
            <h2>
              <History size={18} /> Recent Workspaces
            </h2>
            <div className="recents-list">
              {recents.length === 0 ? (
                <div className="empty-recents">
                  <p>No recent workspaces found on disk.</p>
                  <span className="helper-text">Open a folder to start coding.</span>
                </div>
              ) : (
                recents.map((ws) => (
                  <button
                    key={ws.id}
                    className="recent-item"
                    onClick={() => handleSelectRecent(ws)}
                    disabled={!isConnected || loading}
                  >
                    <div className="recent-info">
                      <span className="recent-name">{ws.name}</span>
                      <span className="recent-path" title={ws.allRepoPaths.join(", ")}>
                        {ws.allRepoPaths[0] || "No folders"}
                      </span>
                    </div>
                    <Play className="play-icon" size={14} />
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
