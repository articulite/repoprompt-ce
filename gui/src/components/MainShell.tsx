import React, { useState, useEffect } from "react";
import {
  Settings, ChevronDown, Plus, LogOut, GitBranch,
  HardDrive, Folder, Search, Edit3, Clock
} from "lucide-react";
import { mcpClient } from "../mcpClient";
import { safeParseJSON } from "../utils";
import ChatPanel from "./ChatPanel";
import ContextBuilderPanel from "./ContextBuilderPanel";
import AgentModePanel from "./AgentModePanel";
import SettingsPanel from "./SettingsPanel";

interface ChatSession {
  id: string;
  title: string;
  timestamp: string;
  status?: string;
  messages: any[];
}

interface MainShellProps {
  workspaceName: string;
  onExitWorkspace: () => void;
  isConnected: boolean;
}

export default function MainShell({ workspaceName, onExitWorkspace, isConnected }: MainShellProps) {
  const [activeTab, setActiveTab] = useState<"chat" | "agent" | "context" | "settings">("chat");
  const [sessions, setSessions] = useState<ChatSession[]>([
    {
      id: "session-1",
      title: "New Session",
      timestamp: "Today",
      messages: []
    }
  ]);
  const [activeSessionId, setActiveSessionId] = useState<string>("session-1");
  const [sessionSearchQuery, setSessionSearchQuery] = useState("");
  const [settingsSection, setSettingsSection] = useState<string>("agent_mode");
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

  // Automatically switch tab to chat when a prompt is injected
  useEffect(() => {
    const handlePromptInjected = () => {
      setActiveTab("chat");
    };
    window.addEventListener("injectPromptIntoChat", handlePromptInjected);
    return () => window.removeEventListener("injectPromptIntoChat", handlePromptInjected);
  }, []);

  const loadWorkspaceContext = async () => {
    try {
      // Fetch active workspace context (roots, git branch etc.)
      const contextRes = await mcpClient.callTool("workspace_context", {});
      if (contextRes && !contextRes.isError && contextRes.content && contextRes.content[0]?.text) {
        const text = contextRes.content[0].text;

        // Try parsing as JSON first since raw JSON might be requested/returned
        let parsed: any = null;
        try {
          parsed = JSON.parse(text);
        } catch (e) {
          // not JSON
        }

        if (parsed) {
          if (parsed.git_branch) {
            setGitBranch(parsed.git_branch);
          } else if (parsed.gitBranch) {
            setGitBranch(parsed.gitBranch);
          }
          if (Array.isArray(parsed.roots)) {
            setRoots(parsed.roots);
          }
        } else {
          // Try parsing context details
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
      }
    } catch (err) {
      console.error("Failed to load workspace context", err);
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

  const handleNewSession = () => {
    const newId = `session-${Date.now()}`;
    const newSess: ChatSession = {
      id: newId,
      title: "New Session",
      timestamp: "Today",
      messages: []
    };
    setSessions(prev => [newSess, ...prev]);
    setActiveSessionId(newId);
    setActiveTab("chat");
  };

  const handleSelectSession = (id: string) => {
    setActiveSessionId(id);
    setActiveTab("chat");
  };

  const handleSettingsClick = (section: string) => {
    setSettingsSection(section);
    setActiveTab("settings");
  };

  const handleMessagesChange = (newMsgs: any[]) => {
    setSessions(prev => prev.map(s => {
      if (s.id === activeSessionId) {
        let title = s.title;
        if (s.title === "New Session" && newMsgs.length > 0) {
          const firstUserMsg = newMsgs.find(m => m.role === "user");
          if (firstUserMsg) {
            title = firstUserMsg.text.slice(0, 30) + (firstUserMsg.text.length > 30 ? "..." : "");
          }
        }
        return { ...s, title, messages: newMsgs };
      }
      return s;
    }));
  };

  const filteredSessions = sessions.filter(sess =>
    sess.title.toLowerCase().includes(sessionSearchQuery.toLowerCase())
  );

  const sessionsByGroup: Record<string, ChatSession[]> = {};
  filteredSessions.forEach(sess => {
    const group = sess.timestamp;
    if (!sessionsByGroup[group]) {
      sessionsByGroup[group] = [];
    }
    sessionsByGroup[group].push(sess);
  });

  return (
    <div className="app-container animate-fade-in">
      {/* Sidebar navigation */}
      <aside className="sidebar glass" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '12px' }}>
        {/* Top search & compose bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={14} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search"
              className="input input-small"
              style={{ paddingLeft: '28px', width: '100%', borderRadius: '6px' }}
              value={sessionSearchQuery}
              onChange={(e) => setSessionSearchQuery(e.target.value)}
            />
          </div>
          <button className="btn-compose" title="New Session" onClick={handleNewSession}>
            <Edit3 size={14} />
          </button>
        </div>

        {/* Sessions list */}
        <div className="sessions-list-scroll">
          {Object.keys(sessionsByGroup).length === 0 ? (
            <div style={{ padding: '12px', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>
              No sessions found
            </div>
          ) : (
            Object.keys(sessionsByGroup).map(groupName => (
              <div key={groupName} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <div className="session-group-header">{groupName}</div>
                {sessionsByGroup[groupName].map(sess => (
                  <div
                    key={sess.id}
                    className={`session-list-item ${activeSessionId === sess.id ? 'active' : ''}`}
                    onClick={() => handleSelectSession(sess.id)}
                  >
                    {sess.status === "T2" ? (
                      <span className="session-status-badge font-mono text-[9px] px-1 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">T2</span>
                    ) : (
                      activeSessionId === sess.id ? (
                        <span className="session-status-icon"></span>
                      ) : (
                        <Clock size={12} className="text-muted" style={{ width: '12px', height: '12px' }} />
                      )
                    )}
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                      {sess.title}
                    </span>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>

        {/* Bottom Workspace Card */}
        <div className="workspace-bottom-card">
          <div className="workspace-bottom-label">WORKSPACE</div>

          <div className="workspace-selector-row">
            <button className="workspace-dropdown-btn" onClick={() => setShowWSMenu(!showWSMenu)}>
              <HardDrive size={13} className="text-muted" />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100px' }}>
                {workspaceName}
              </span>
              <ChevronDown size={12} />
            </button>
            <button className="btn-exit-workspace" onClick={onExitWorkspace}>
              <LogOut size={12} /> Exit
            </button>

            {showWSMenu && (
              <div className="workspace-dropdown glass animate-fade-in" style={{ bottom: '100%', top: 'auto', marginBottom: '8px' }}>
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
              </div>
            )}
          </div>

          <div className="workspace-folders-list">
            {roots.length === 0 ? (
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', padding: '2px 0' }}>No folders loaded</div>
            ) : (
              roots.map((root, index) => {
                const parts = root.split(" → ");
                const name = parts[1] || parts[0].split(/[/\\]/).pop() || parts[0];
                return (
                  <div key={index} className="workspace-folder-row" title={root}>
                    <Folder size={12} className="text-muted" style={{ flexShrink: 0 }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                  </div>
                );
              })
            )}
            <button className="btn-add-folder-sidebar" onClick={() => setShowAddFolder(!showAddFolder)}>
              <Plus size={12} /> Add Folder
            </button>
          </div>

          {showAddFolder && (
            <form onSubmit={handleAddFolder} className="add-folder-form animate-fade-in" style={{ marginTop: '4px' }}>
              <input
                type="text"
                className="input input-small"
                placeholder="C:\..."
                value={newFolderPath}
                onChange={(e) => setNewFolderPath(e.target.value)}
                autoFocus
              />
              <div className="form-actions" style={{ marginTop: '4px' }}>
                <button type="submit" className="btn btn-primary btn-small">Add</button>
                <button
                  type="button"
                  className="btn btn-secondary btn-small"
                  onClick={() => setShowAddFolder(false)}
                >
                  Cancel
                </button>
              </div>
              {error && <span className="error-text" style={{ fontSize: '10px' }}>{error}</span>}
            </form>
          )}

          <div className="sidebar-bottom-actions-row">
            <button className="btn-sidebar-footer-action" onClick={() => handleSettingsClick("agent_models")}>
              Models
            </button>
            <button className="btn-sidebar-footer-action" onClick={() => handleSettingsClick("agent_permissions")}>
              Permissions
            </button>
            <button className="btn-sidebar-gear" onClick={() => handleSettingsClick("agent_mode")}>
              <Settings size={14} />
            </button>
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
          {activeTab === 'chat' && (() => {
            const activeSession = sessions.find(s => s.id === activeSessionId);
            return (
              <ChatPanel
                isConnected={isConnected}
                messages={activeSession ? activeSession.messages : []}
                onMessagesChange={handleMessagesChange}
              />
            );
          })()}
          {activeTab === 'context' && <ContextBuilderPanel isConnected={isConnected} />}
          {activeTab === 'agent' && <AgentModePanel isConnected={isConnected} />}
          {activeTab === 'settings' && (
            <SettingsPanel
              isConnected={isConnected}
              roots={roots}
              onRefreshRoots={loadWorkspaceContext}
              initialSection={settingsSection}
            />
          )}
        </div>
      </main>
    </div>
  );
}
