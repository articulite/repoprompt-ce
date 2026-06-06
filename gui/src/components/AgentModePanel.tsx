import React, { useState, useEffect, useRef } from "react";
import {
  Square, RefreshCw, Layers, Terminal, MessageSquare,
  ChevronRight, ChevronDown, CheckCircle, XCircle,
  HelpCircle, Send, ArrowRight, Loader2, List
} from "lucide-react";
import { mcpClient } from "../mcpClient";
import { safeParseJSON } from "../utils";

interface Session {
  session_id: string;
  name: string;
  last_modified: string;
  item_count: number;
  agent?: string;
  model?: string;
  run_state?: string;
  is_live: boolean;
  parent_session_id?: string;
  is_mcp_originated: boolean;
}

interface LogItem {
  type: "user" | "assistant" | "tool_call" | "system" | "error" | "note";
  toolName?: string;
  content: string;
}

interface AgentModePanelProps {
  isConnected: boolean;
}

export default function AgentModePanel({ isConnected }: AgentModePanelProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [promptText, setPromptText] = useState("");
  const [selectedAgent, setSelectedAgent] = useState("explore");
  const [expandedCards, setExpandedCards] = useState<Record<number, boolean>>({});
  const [steeringText, setSteeringText] = useState("");
  const [submittingSteering, setSubmittingSteering] = useState(false);
  const pollIntervalRef = useRef<any>(null);

  useEffect(() => {
    if (isConnected) {
      loadSessions();
    }
    return () => stopPolling();
  }, [isConnected]);

  useEffect(() => {
    if (activeSessionId) {
      const found = sessions.find(s => s.session_id === activeSessionId);
      if (found) setActiveSession(found);

      // Fetch initial log and start polling
      fetchLogs(activeSessionId);
      startPolling(activeSessionId);
    } else {
      setActiveSession(null);
      setLogs([]);
      stopPolling();
    }
  }, [activeSessionId, sessions]);

  const loadSessions = async () => {
    try {
      const res = await mcpClient.callTool("agent_manage", { op: "list_sessions" });
      if (res && !res.isError && res.content && res.content[0]?.text) {
        const parsed = safeParseJSON(res.content[0].text);
        if (parsed?.sessions) {
          setSessions(parsed.sessions);
        }
      }
    } catch (err) {
      console.error("Failed to list sessions", err);
    }
  };

  const startPolling = (sessionId: string) => {
    stopPolling();
    pollIntervalRef.current = setInterval(() => {
      fetchLogs(sessionId);
    }, 2000);
  };

  const stopPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  const fetchLogs = async (sessionId: string) => {
    try {
      const res = await mcpClient.callTool("agent_manage", {
        op: "get_log",
        session_id: sessionId,
        limit: 100
      });
      if (res && !res.isError && res.content && res.content[0]?.text) {
        const parsed = safeParseJSON(res.content[0].text);
        if (parsed?.transcript_xml) {
          parseSpartanXML(parsed.transcript_xml);
        }
      }
    } catch (err) {
      console.error("Failed to load log", err);
    }
  };

  const parseSpartanXML = (xml: string) => {
    const tagRegex = /<(user|assistant|tool_call|system|error|note)([^>]*)>([\s\S]*?)<\/\1>/g;
    const parsedItems: LogItem[] = [];
    let match;

    while ((match = tagRegex.exec(xml)) !== null) {
      const type = match[1] as any;
      const attributes = match[2];
      const content = match[3];

      let toolName = undefined;
      if (type === "tool_call") {
        const nameMatch = attributes.match(/name="([^"]*)"/);
        if (nameMatch) {
          toolName = nameMatch[1];
        }
      }

      parsedItems.push({ type, toolName, content });
    }

    setLogs(parsedItems);
  };

  const handleStartDetached = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptText.trim() || !isConnected || loading) return;

    setLoading(true);
    try {
      const res = await mcpClient.callTool("agent_run", {
        op: "start",
        message: promptText.trim(),
        model_id: selectedAgent,
        detach: true
      });

      if (res && !res.isError && res.content && res.content[0]?.text) {
        const parsed = safeParseJSON(res.content[0].text);
        if (parsed?.session_id) {
          setPromptText("");
          setActiveSessionId(parsed.session_id);
          await loadSessions();
        }
      } else {
        alert("Failed to start session: " + (res.content?.[0]?.text || "Unknown error"));
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to start session");
    } finally {
      setLoading(false);
    }
  };

  const handleStopSession = async () => {
    if (!activeSessionId) return;
    try {
      await mcpClient.callTool("agent_manage", {
        op: "stop_session",
        session_id: activeSessionId
      });
      loadSessions();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendSteering = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!steeringText.trim() || !activeSessionId || submittingSteering) return;

    setSubmittingSteering(true);
    try {
      const res = await mcpClient.callTool("agent_run", {
        op: "steer",
        session_id: activeSessionId,
        message: steeringText.trim()
      });
      if (res && res.isError) {
        alert("Steering failed: " + (res.content?.[0]?.text || "Unknown error"));
      } else {
        setSteeringText("");
        fetchLogs(activeSessionId);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingSteering(false);
    }
  };

  const toggleCard = (index: number) => {
    setExpandedCards(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const getToolDisplayName = (name: string) => {
    switch(name) {
      case "get_file_tree": return "Directory Mapping Explorer";
      case "read_file": return "File Content Reader";
      case "git": return "VCS Repository Manager";
      case "file_search": return "Grep String Searcher";
      default: return name;
    }
  };

  return (
    <div className="agent-layout">
      {/* Sidebar: Active and Saved sessions */}
      <div className="agent-sessions-list glass border-right">
        <div className="section-header">
          <h2>
            <List size={16} /> Sessions list
          </h2>
          <button className="btn-icon-small" onClick={loadSessions} title="Refresh Sessions">
            <RefreshCw size={14} />
          </button>
        </div>

        <div className="sessions-scroll">
          {sessions.length === 0 ? (
            <div className="empty-sessions">
              <span>No agent sessions found.</span>
            </div>
          ) : (
            sessions.map((s) => (
              <button
                key={s.session_id}
                className={`session-card ${activeSessionId === s.session_id ? 'active' : ''}`}
                onClick={() => setActiveSessionId(s.session_id)}
              >
                <div className="session-card-header">
                  <span className="name">{s.name}</span>
                  {s.is_live && <span className="badge-live">LIVE</span>}
                </div>
                <div className="session-card-meta">
                  <span>State: <strong>{s.run_state || 'idle'}</strong></span>
                  <span>Turns: {s.item_count}</span>
                </div>
              </button>
            ))
          )}
        </div>

        {activeSessionId && (
          <div className="sessions-footer border-top">
            <button className="btn btn-secondary btn-full" onClick={() => setActiveSessionId(null)}>
              + Start New Session
            </button>
          </div>
        )}
      </div>

      {/* Main execution workspace */}
      <div className="agent-workspace">
        {!activeSessionId ? (
          /* Landing Form: Start a session */
          <div className="agent-setup-card glass animate-fade-in">
            <div className="card-header">
              <Terminal size={24} className="icon-header" />
              <h2>Start Detached Agent Session</h2>
              <p>Detach execution lets the agent run compiler loops in the background.</p>
            </div>

            <form onSubmit={handleStartDetached} className="agent-setup-form">
              <div className="form-group">
                <label>Choose Agent Task Role</label>
                <div className="role-selector-horizontal">
                  {["explore", "engineer", "pair", "design"].map(r => (
                    <button
                      key={r}
                      type="button"
                      className={`role-btn ${selectedAgent === r ? 'active' : ''}`}
                      onClick={() => setSelectedAgent(r)}
                    >
                      {r.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="promptText">Goal Instruction Brief</label>
                <textarea
                  id="promptText"
                  className="input textarea-input"
                  placeholder="e.g. Find all classes that inherit from WorkspaceModel and add tests."
                  rows={4}
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                  disabled={!isConnected || loading}
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={!isConnected || loading || !promptText.trim()}
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={16} /> Deploying Agent...
                  </>
                ) : (
                  <>
                    Deploy Agent Mode <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          </div>
        ) : (
          /* Execution Transcript Dashboard */
          <div className="agent-execution-view animate-fade-in">
            {/* Session Toolbar */}
            <div className="execution-toolbar glass border-bottom">
              <div className="meta">
                <h3>{activeSession?.name}</h3>
                <span className="run-state-indicator">
                  State: <strong>{activeSession?.run_state}</strong>
                </span>
              </div>
              <div className="actions">
                <button
                  className="btn btn-secondary btn-small"
                  onClick={() => fetchLogs(activeSessionId)}
                >
                  <RefreshCw size={14} /> Refresh
                </button>
                {activeSession?.is_live && activeSession?.run_state !== "idle" && (
                  <button
                    className="btn btn-danger btn-small"
                    onClick={handleStopSession}
                  >
                    <Square size={14} /> Stop Execution
                  </button>
                )}
              </div>
            </div>

            {/* XML Logs Viewport */}
            <div className="execution-transcript">
              {logs.length === 0 ? (
                <div className="loading-logs">
                  <Loader2 className="animate-spin text-muted" size={24} />
                  <span>Loading logs from daemon...</span>
                </div>
              ) : (
                logs.map((log, index) => {
                  const isExpanded = !!expandedCards[index];

                  if (log.type === "user") {
                    return (
                      <div key={index} className="log-row user-row animate-fade-in">
                        <div className="avatar user-avatar"><MessageSquare size={14} /></div>
                        <div className="content">
                          <span className="label">USER COMMAND</span>
                          <p>{log.content}</p>
                        </div>
                      </div>
                    );
                  }

                  if (log.type === "assistant") {
                    return (
                      <div key={index} className="log-row assistant-row animate-fade-in">
                        <div className="avatar assistant-avatar"><Terminal size={14} /></div>
                        <div className="content">
                          <span className="label">ASSISTANT NARRATION</span>
                          <p>{log.content}</p>
                        </div>
                      </div>
                    );
                  }

                  if (log.type === "tool_call") {
                    return (
                      <div key={index} className="tool-card animate-fade-in">
                        <div className="tool-card-header" onClick={() => toggleCard(index)}>
                          <div className="tool-title">
                            <Layers size={14} className="text-accent" />
                            <strong>{getToolDisplayName(log.toolName || "")}</strong>
                            <code className="text-muted">({log.toolName})</code>
                          </div>
                          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </div>
                        {isExpanded && (
                          <div className="tool-card-body border-top">
                            <span className="label-small">JSON ARGUMENTS</span>
                            <pre className="arguments-code">{log.content}</pre>
                          </div>
                        )}
                      </div>
                    );
                  }

                  if (log.type === "system") {
                    return (
                      <div key={index} className="log-row system-row animate-fade-in">
                        <div className="avatar system-avatar"><CheckCircle size={14} /></div>
                        <div className="content">
                          <span className="label">SYSTEM NOTIFICATION</span>
                          <pre className="system-code">{log.content}</pre>
                        </div>
                      </div>
                    );
                  }

                  if (log.type === "error") {
                    return (
                      <div key={index} className="log-row error-row animate-fade-in">
                        <div className="avatar error-avatar"><XCircle size={14} /></div>
                        <div className="content">
                          <span className="label">EXECUTION ERROR</span>
                          <pre className="error-code">{log.content}</pre>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={index} className="log-row note-row animate-fade-in">
                      <div className="avatar note-avatar"><HelpCircle size={14} /></div>
                      <div className="content">
                        <span className="label">NOTE</span>
                        <p>{log.content}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Interactive steering command strip (Pause, steer, inject prompts) */}
            {activeSession?.is_live && (
              <div className="execution-steering-bar glass border-top">
                <form onSubmit={handleSendSteering} className="steering-form">
                  <input
                    type="text"
                    className="input"
                    placeholder="Provide mid-run steering feedback, request a pause, or supply inputs..."
                    value={steeringText}
                    onChange={(e) => setSteeringText(e.target.value)}
                    disabled={submittingSteering}
                  />
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={!steeringText.trim() || submittingSteering}
                  >
                    {submittingSteering ? (
                      <Loader2 className="animate-spin" size={14} />
                    ) : (
                      <>
                        Steer <Send size={14} />
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
