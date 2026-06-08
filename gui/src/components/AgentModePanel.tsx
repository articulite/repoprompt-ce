import React, { useState, useEffect, useRef } from "react";
import {
  Square, RefreshCw, Layers, Terminal as TermIcon, MessageSquare,
  ChevronRight, ChevronDown, CheckCircle, XCircle,
  HelpCircle, Send, ArrowRight, Loader2, List, FileText,
  Search, GitBranch, Check, X, Copy, FileCode, AlertCircle
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

interface LogGroup {
  id: string;
  type: "user" | "assistant" | "system" | "error" | "note" | "tool_execution";
  toolName?: string;
  toolArgs?: string;
  toolResult?: {
    type: "system" | "error";
    content: string;
  };
  singleLog?: LogItem;
}

interface AgentModePanelProps {
  isConnected: boolean;
}

interface DiffLine {
  kind: "addition" | "deletion" | "context" | "header" | "hunk" | "gap";
  text: string;
  oldNo?: number;
  newNo?: number;
}

export default function AgentModePanel({ isConnected }: AgentModePanelProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [promptText, setPromptText] = useState("");
  const [selectedAgent, setSelectedAgent] = useState("explore");
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const [steeringText, setSteeringText] = useState("");
  const [submittingSteering, setSubmittingSteering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollIntervalRef = useRef<any>(null);

  // Dynamic fetch cache states
  const [loadedFileContents, setLoadedFileContents] = useState<Record<string, string>>({});
  const [loadingContents, setLoadingContents] = useState<Record<string, boolean>>({});
  const [loadedSearchMatches, setLoadedSearchMatches] = useState<Record<string, any[]>>({});
  const [loadingSearches, setLoadingSearches] = useState<Record<string, boolean>>({});
  const [approvalStates, setApprovalStates] = useState<Record<string, boolean>>({});
  const [respondingToInteraction, setRespondingToInteraction] = useState<Record<string, boolean>>({});

  const transcriptEndRef = useRef<HTMLDivElement>(null);

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

  // Auto scroll to bottom when logs are updated
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

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
        if (parsed?.name && activeSession) {
          setActiveSession(prev => prev ? { ...prev, name: parsed.name } : null);
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
    setError(null);
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
        setError(res.content?.[0]?.text || "Failed to start session.");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to start session");
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

  // Responding to direct user input block
  const handleRespondToAgent = async (interactionId: string, responseText: string) => {
    if (!activeSessionId) return;
    setRespondingToInteraction(prev => ({ ...prev, [interactionId]: true }));
    try {
      const res = await mcpClient.callTool("agent_run", {
        op: "respond",
        session_id: activeSessionId,
        interaction_id: interactionId,
        response: responseText
      });
      if (res && res.isError) {
        alert("Response failed: " + (res.content?.[0]?.text || "Unknown error"));
      } else {
        fetchLogs(activeSessionId);
      }
    } catch (err: any) {
      alert("Error responding: " + (err.message || err));
    } finally {
      setRespondingToInteraction(prev => ({ ...prev, [interactionId]: false }));
    }
  };

  const toggleCard = (id: string) => {
    setExpandedCards(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const getToolDisplayName = (name: string) => {
    switch (name) {
      case "get_file_tree": return "Directory Mapping Explorer";
      case "read_file": return "File Content Reader";
      case "read": return "Native File Content Reader";
      case "git": return "VCS Repository Manager";
      case "file_search": return "Grep String Searcher";
      case "search": return "Web Engine Searcher";
      case "apply_edits": return "Linter Patch Applier";
      case "apply_patch": return "Unified Patch Applier";
      case "edit": return "Editor File Modifier";
      case "ask_user": return "Clarification Request";
      case "request_user_input": return "Clarification Request";
      default: return name;
    }
  };

  const getToolIcon = (name: string) => {
    switch (name) {
      case "read_file":
      case "read":
        return <FileText size={14} className="text-blue-400" />;
      case "file_search":
      case "search":
        return <Search size={14} className="text-yellow-400" />;
      case "git":
        return <GitBranch size={14} className="text-purple-400" />;
      case "bash":
      case "run_command":
        return <TermIcon size={14} className="text-green-400" />;
      case "ask_user":
      case "request_user_input":
        return <HelpCircle size={14} className="text-pink-400" />;
      case "apply_edits":
      case "apply_patch":
      case "edit":
        return <FileCode size={14} className="text-orange-400" />;
      default:
        return <Layers size={14} className="text-accent" />;
    }
  };

  // Grouping log items for unified display
  const groupedLogs: LogGroup[] = [];
  for (let i = 0; i < logs.length; i++) {
    const item = logs[i];
    if (item.type === "tool_call") {
      let result = undefined;
      if (i + 1 < logs.length && (logs[i + 1].type === "system" || logs[i + 1].type === "error")) {
        result = {
          type: logs[i + 1].type as "system" | "error",
          content: logs[i + 1].content
        };
        i++; // Consume outcome log
      }
      groupedLogs.push({
        id: `tool-${i}-${item.toolName}`,
        type: "tool_execution",
        toolName: item.toolName,
        toolArgs: item.content,
        toolResult: result
      });
    } else {
      groupedLogs.push({
        id: `single-${i}-${item.type}`,
        type: item.type as any,
        singleLog: item
      });
    }
  }

  // Dynamic file fetching hook for read_file cards
  const fetchFileContentForCard = async (groupId: string, filePath: string, startLine?: number, limit?: number) => {
    if (loadedFileContents[groupId] || loadingContents[groupId]) return;

    setLoadingContents(prev => ({ ...prev, [groupId]: true }));
    try {
      const res = await mcpClient.callTool("read_file", {
        path: filePath,
        start_line: startLine || 1,
        limit: limit || 100
      });
      if (res && !res.isError && res.content && res.content[0]?.text) {
        const parsed = safeParseJSON(res.content[0].text);
        const text = parsed?.content || res.content[0].text;
        setLoadedFileContents(prev => ({ ...prev, [groupId]: text }));
      } else {
        setLoadedFileContents(prev => ({ ...prev, [groupId]: "Failed to retrieve content slice from workspace." }));
      }
    } catch (err: any) {
      setLoadedFileContents(prev => ({ ...prev, [groupId]: `Error loading file: ${err.message || err}` }));
    } finally {
      setLoadingContents(prev => ({ ...prev, [groupId]: false }));
    }
  };

  // Dynamic search fetching hook for file_search cards
  const fetchSearchMatchesForCard = async (groupId: string, pattern: string, scopePaths?: string[]) => {
    if (loadedSearchMatches[groupId] || loadingSearches[groupId]) return;

    setLoadingSearches(prev => ({ ...prev, [groupId]: true }));
    try {
      const res = await mcpClient.callTool("file_search", {
        pattern,
        filter: scopePaths && scopePaths.length > 0 ? { paths: scopePaths } : undefined
      });
      if (res && !res.isError && res.content && res.content[0]?.text) {
        const parsed = safeParseJSON(res.content[0].text);
        const matches = parsed?.matches || [];
        setLoadedSearchMatches(prev => ({ ...prev, [groupId]: matches }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSearches(prev => ({ ...prev, [groupId]: false }));
    }
  };

  // Helper: check if path contains home or WSL directories
  const formatShortPath = (path: string) => {
    if (!path) return "";
    const parts = path.replace(/\\/g, "/").split("/");
    if (parts.length <= 2) return path;
    return `.../${parts.slice(-2).join("/")}`;
  };

  // Parsing Diff text for line-by-line rendering
  const parseDiffText = (diffText: string): DiffLine[] => {
    if (!diffText) return [];
    const lines = diffText.split("\n");
    const parsed: DiffLine[] = [];
    let oldLineNum = 0;
    let newLineNum = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith("diff --git") || line.startsWith("index ") || line.startsWith("--- ") || line.startsWith("+++ ")) {
        parsed.push({ kind: "header", text: line });
      } else if (line.startsWith("@@")) {
        parsed.push({ kind: "hunk", text: line });
        const match = line.match(/@@\s+-(\d+)(?:,\d+)?\s+\+(\d+)(?:,\d+)?\s+@@/);
        if (match) {
          oldLineNum = parseInt(match[1], 10);
          newLineNum = parseInt(match[2], 10);
        }
      } else if (line.startsWith("+")) {
        parsed.push({ kind: "addition", text: line, newNo: newLineNum });
        newLineNum++;
      } else if (line.startsWith("-")) {
        parsed.push({ kind: "deletion", text: line, oldNo: oldLineNum });
        oldLineNum++;
      } else {
        parsed.push({ kind: "context", text: line, oldNo: oldLineNum, newNo: newLineNum });
        oldLineNum++;
        newLineNum++;
      }
    }
    return parsed;
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // Rendering Unified Diff Viewer
  const renderUnifiedDiff = (diffText: string, filePath: string) => {
    const lines = parseDiffText(diffText);
    const isApproved = !!approvalStates[filePath];

    return (
      <div className="unified-diff-card glass border">
        <div className="diff-header flex justify-between items-center border-bottom px-3 py-2">
          <span className="diff-title font-semibold text-small">{formatShortPath(filePath)}</span>
          <div className="flex items-center gap-2">
            <label className="toggle-switch flex items-center gap-1">
              <input
                type="checkbox"
                checked={isApproved}
                onChange={(e) => setApprovalStates(prev => ({ ...prev, [filePath]: e.target.checked }))}
              />
              <span className="toggle-slider"></span>
            </label>
            <span className={`text-xs ${isApproved ? 'text-success' : 'text-secondary'}`}>
              {isApproved ? 'Approved' : 'Reject Change'}
            </span>
          </div>
        </div>
        <div className="diff-viewport scrollbar-custom">
          {lines.map((l, i) => (
            <div key={i} className={`diff-line-row ${l.kind}`}>
              <div className="line-numbers flex text-xs select-none">
                <span className="old-num">{l.oldNo || ""}</span>
                <span className="new-num">{l.newNo || ""}</span>
              </div>
              <pre className="line-text">{l.text}</pre>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Card sub-renderer: Read File Card
  const renderReadFileCard = (g: LogGroup, isExpanded: boolean) => {
    const args = safeParseJSON(g.toolArgs || "");
    const path = args?.path || args?.filePath || "file";
    const startLine = args?.start_line || 1;
    const limit = args?.limit || 100;
    const isError = g.toolResult?.type === "error";

    const fetchContent = () => {
      fetchFileContentForCard(g.id, path, startLine, limit);
    };

    if (isExpanded) {
      fetchContent();
    }

    return (
      <div className="tool-card-expanded animate-fade-in">
        <div className="meta-info grid-col-2">
          <div>
            <span className="meta-label">TARGET PATH</span>
            <code className="meta-val">{path}</code>
          </div>
          <div>
            <span className="meta-label">READ RANGE</span>
            <span className="meta-val">Lines {startLine} to {startLine + limit - 1}</span>
          </div>
        </div>

        {isExpanded && (
          <div className="content-viewport mt-2">
            {loadingContents[g.id] ? (
              <div className="flex items-center gap-2 text-muted py-2 justify-center">
                <Loader2 className="animate-spin" size={16} />
                <span>Reading file block from host workspace...</span>
              </div>
            ) : (
              <div className="syntax-code-block">
                <div className="code-header flex justify-between items-center px-3 py-1 border-bottom">
                  <span className="code-lang text-xs font-semibold">WORKSPACE CONTENT</span>
                  <button className="btn-icon-small" onClick={() => handleCopyText(loadedFileContents[g.id] || "")} title="Copy code">
                    <Copy size={12} />
                  </button>
                </div>
                <pre className="arguments-code p-3 text-xs">
                  {loadedFileContents[g.id] || "No file content cached."}
                </pre>
              </div>
            )}
          </div>
        )}

        {isError && (
          <div className="error-box mt-2">
            <span className="font-semibold">Execution Error:</span>
            <pre>{g.toolResult?.content}</pre>
          </div>
        )}
      </div>
    );
  };

  // Card sub-renderer: Grep Search Card
  const renderSearchCard = (g: LogGroup, isExpanded: boolean) => {
    const args = safeParseJSON(g.toolArgs || "");
    const pattern = args?.pattern || "";
    const scopePaths = args?.filter?.paths || args?.path ? [args.path] : [];
    const isError = g.toolResult?.type === "error";

    const triggerSearch = () => {
      fetchSearchMatchesForCard(g.id, pattern, scopePaths);
    };

    if (isExpanded) {
      triggerSearch();
    }

    const matches = loadedSearchMatches[g.id] || [];

    return (
      <div className="tool-card-expanded animate-fade-in">
        <div className="meta-info">
          <div>
            <span className="meta-label">GREP PATTERN MATCH</span>
            <code className="meta-val text-accent">&ldquo;{pattern}&rdquo;</code>
          </div>
          {scopePaths.length > 0 && (
            <div className="mt-1">
              <span className="meta-label">SCOPE DIRECTORIES</span>
              <span className="meta-val">{scopePaths.join(", ")}</span>
            </div>
          )}
        </div>

        {isExpanded && (
          <div className="content-viewport mt-2">
            {loadingSearches[g.id] ? (
              <div className="flex items-center gap-2 text-muted py-2 justify-center">
                <Loader2 className="animate-spin" size={16} />
                <span>Scanning repository indexing database...</span>
              </div>
            ) : matches.length === 0 ? (
              <span className="text-xs text-secondary italic">No matches found in workspace file scope.</span>
            ) : (
              <div className="search-matches-list">
                {matches.slice(0, 10).map((match, i) => (
                  <div key={i} className="search-match-item glass border p-2 mb-1 rounded">
                    <div className="match-file flex justify-between items-center text-xs font-semibold mb-1">
                      <span>{formatShortPath(match.path)}</span>
                      <span className="text-secondary text-xs">Line {match.lineNumber}</span>
                    </div>
                    <pre className="match-snippet text-xs bg-dark-dim p-2 rounded border">{match.lineContent}</pre>
                  </div>
                ))}
                {matches.length > 10 && (
                  <span className="text-xs text-muted block text-center mt-2">
                    And {matches.length - 10} more search results.
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {isError && (
          <div className="error-box mt-2">
            <span className="font-semibold">Execution Error:</span>
            <pre>{g.toolResult?.content}</pre>
          </div>
        )}
      </div>
    );
  };

  // Card sub-renderer: Bash Card
  const renderBashCard = (g: LogGroup, isExpanded: boolean) => {
    const args = safeParseJSON(g.toolArgs || "");
    const command = args?.command || args?.CommandLine || "";

    return (
      <div className="tool-card-expanded animate-fade-in">
        <div className="meta-info mb-2">
          <div>
            <span className="meta-label">COMMAND EXECUTED</span>
            <code className="meta-val terminal-cmd">{command}</code>
          </div>
        </div>

        {isExpanded && g.toolResult?.content && (
          <div className="terminal-viewport scrollbar-custom">
            <div className="terminal-header flex justify-between items-center px-3 py-1 bg-black border-bottom">
              <span className="text-xs text-muted">TERMINAL STDOUT/STDERR</span>
              <button className="btn-icon-small" onClick={() => handleCopyText(g.toolResult?.content || "")} title="Copy output">
                <Copy size={12} />
              </button>
            </div>
            <pre className="terminal-text-block">{g.toolResult.content}</pre>
          </div>
        )}

        {!g.toolResult && (
          <div className="flex items-center gap-2 text-muted py-2 justify-center animate-pulse">
            <Loader2 className="animate-spin" size={16} />
            <span>Bash daemon process is active...</span>
          </div>
        )}
      </div>
    );
  };

  // Card sub-renderer: Git Card
  const renderGitCard = (g: LogGroup, isExpanded: boolean) => {
    const args = safeParseJSON(g.toolArgs || "");
    const op = args?.op || "VCS Action";
    const gitArgs = args?.args || [];
    const isError = g.toolResult?.type === "error";

    // Detect if git command produced a unified diff in output
    const diffMatch = g.toolResult?.content && g.toolResult.content.includes("diff --git");

    return (
      <div className="tool-card-expanded animate-fade-in">
        <div className="meta-info mb-2">
          <div>
            <span className="meta-label">GIT COMMAND RUN</span>
            <code className="meta-val">git {op} {gitArgs.join(" ")}</code>
          </div>
        </div>

        {isExpanded && g.toolResult?.content && (
          <div className="git-output-viewport mt-2">
            {diffMatch ? (
              renderUnifiedDiff(g.toolResult.content, "git_workspace.diff")
            ) : (
              <pre className="arguments-code p-3 text-xs bg-dark-dim border rounded">
                {g.toolResult.content}
              </pre>
            )}
          </div>
        )}

        {isError && (
          <div className="error-box mt-2">
            <span className="font-semibold">VCS Error:</span>
            <pre>{g.toolResult?.content}</pre>
          </div>
        )}
      </div>
    );
  };

  // Card sub-renderer: Ask User Card (Clarification Request)
  const renderAskUserCard = (g: LogGroup, _isExpanded: boolean) => {
    const args = safeParseJSON(g.toolArgs || "");
    const question = args?.question || args?.message || "Clarification question from subagent.";
    const options: string[] = args?.options || [];
    const interactionId = args?.interaction_id || args?.session_id || "ask-interaction";

    // Detect if this interaction is still pending response
    const isPending = !g.toolResult && activeSession?.run_state === "waiting_for_user";
    const isResponding = !!respondingToInteraction[interactionId];

    return (
      <div className="tool-card-expanded animate-fade-in">
        <div className="ask-user-question-box p-3 border rounded glass mb-2">
          <p className="question-text font-semibold text-small">{question}</p>
        </div>

        {isPending && (
          <div className="ask-user-response-panel border-top pt-2 mt-2">
            <span className="label-small mb-1 block">SELECT RESPONSE OPTIONS OR STEER</span>
            {options.length > 0 ? (
              <div className="flex flex-wrap gap-2 mb-2">
                {options.map((opt) => (
                  <button
                    key={opt}
                    className="btn btn-secondary btn-small"
                    onClick={() => handleRespondToAgent(interactionId, opt)}
                    disabled={isResponding}
                  >
                    {isResponding ? <Loader2 size={12} className="animate-spin" /> : opt}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  className="input input-small"
                  placeholder="Type answer reply to subagent..."
                  id={`response-input-${interactionId}`}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const input = document.getElementById(`response-input-${interactionId}`) as HTMLInputElement;
                      if (input && input.value.trim()) {
                        handleRespondToAgent(interactionId, input.value.trim());
                        input.value = "";
                      }
                    }
                  }}
                />
                <button
                  className="btn btn-primary btn-small"
                  onClick={() => {
                    const input = document.getElementById(`response-input-${interactionId}`) as HTMLInputElement;
                    if (input && input.value.trim()) {
                      handleRespondToAgent(interactionId, input.value.trim());
                      input.value = "";
                    }
                  }}
                  disabled={isResponding}
                >
                  Send
                </button>
              </div>
            )}
          </div>
        )}

        {g.toolResult?.content && (
          <div className="meta-info border-top pt-2 mt-2">
            <span className="meta-label">USER ANSWER SUBMITTED</span>
            <p className="meta-val font-semibold italic text-success">&ldquo;{g.toolResult.content}&rdquo;</p>
          </div>
        )}
      </div>
    );
  };

  // Card sub-renderer: Patch Modifiers (apply_patch, edit, etc.)
  const renderPatchModifierCard = (g: LogGroup, isExpanded: boolean) => {
    const args = safeParseJSON(g.toolArgs || "");
    const filePath = args?.path || args?.filePath || "workspace_file";
    const patchContent = args?.patch || args?.ReplacementContent || g.toolResult?.content || "";
    const isError = g.toolResult?.type === "error";

    return (
      <div className="tool-card-expanded animate-fade-in">
        <div className="meta-info mb-2">
          <div>
            <span className="meta-label">FILE EDITED</span>
            <code className="meta-val">{filePath}</code>
          </div>
        </div>

        {isExpanded && patchContent && (
          <div className="mt-2">
            {renderUnifiedDiff(patchContent, filePath)}
          </div>
        )}

        {isError && (
          <div className="error-box mt-2">
            <span className="font-semibold">Patch Error:</span>
            <pre>{g.toolResult?.content}</pre>
          </div>
        )}
      </div>
    );
  };

  // Default fallback card
  const renderDefaultToolCard = (g: LogGroup, isExpanded: boolean) => {
    const isError = g.toolResult?.type === "error";

    return (
      <div className="tool-card-expanded animate-fade-in">
        <div className="meta-info">
          <div>
            <span className="meta-label">JSON ARGUMENTS</span>
            <pre className="arguments-code">{g.toolArgs}</pre>
          </div>
        </div>

        {isExpanded && g.toolResult?.content && (
          <div className="meta-info border-top pt-2 mt-2">
            <span className="meta-label">EXECUTION RESULT</span>
            <pre className="arguments-code">{g.toolResult.content}</pre>
          </div>
        )}

        {isError && (
          <div className="error-box mt-2">
            <span className="font-semibold">Execution Error:</span>
            <pre>{g.toolResult?.content}</pre>
          </div>
        )}
      </div>
    );
  };

  // Main router for executing cards
  const renderToolExecutionCard = (group: LogGroup, _index: number) => {
    const isExpanded = !!expandedCards[group.id];
    const isError = group.toolResult?.type === "error";
    const isRunning = !group.toolResult;
    const isWarning = group.toolResult?.content && (group.toolResult.content.includes("warning") || group.toolResult.content.includes("limited"));

    let cardStatus = "neutral";
    if (isRunning) cardStatus = "running";
    else if (isError) cardStatus = "failure";
    else if (isWarning) cardStatus = "warning";
    else cardStatus = "success";

    const getShortSubtitle = () => {
      const args = safeParseJSON(group.toolArgs || "");
      switch (group.toolName) {
        case "read_file":
        case "read":
          return formatShortPath(args?.path || args?.filePath || "");
        case "file_search":
        case "search":
          return args?.pattern || "";
        case "bash":
        case "run_command":
          return args?.command || args?.CommandLine || "";
        case "git":
          return `${args?.op || "VCS"} ${args?.args?.join(" ") || ""}`;
        default:
          return "";
      }
    };

    return (
      <div key={group.id} className={`tool-card ${cardStatus} animate-fade-in`}>
        <div className="tool-card-header" onClick={() => toggleCard(group.id)}>
          <div className="tool-title">
            {getToolIcon(group.toolName || "")}
            <strong>{getToolDisplayName(group.toolName || "")}</strong>
            {getShortSubtitle() && (
              <span className="tool-subtitle-preview text-muted">
                {getShortSubtitle()}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 select-none">
            {isRunning && <Loader2 className="animate-spin text-muted" size={12} />}
            {cardStatus === "success" && <Check className="text-success" size={12} />}
            {cardStatus === "failure" && <X className="text-danger" size={12} />}
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </div>
        </div>

        {isExpanded && (
          <div className="tool-card-body border-top">
            {(() => {
              switch (group.toolName) {
                case "read_file":
                case "read":
                  return renderReadFileCard(group, isExpanded);
                case "file_search":
                case "search":
                  return renderSearchCard(group, isExpanded);
                case "bash":
                case "run_command":
                  return renderBashCard(group, isExpanded);
                case "git":
                  return renderGitCard(group, isExpanded);
                case "ask_user":
                case "request_user_input":
                  return renderAskUserCard(group, isExpanded);
                case "apply_edits":
                case "apply_patch":
                case "edit":
                  return renderPatchModifierCard(group, isExpanded);
                default:
                  return renderDefaultToolCard(group, isExpanded);
              }
            })()}
          </div>
        )}
      </div>
    );
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
              <TermIcon size={24} className="icon-header" />
              <h2>Start Detached Agent Session</h2>
              <p>Detach execution lets the agent run compiler loops in the background.</p>
            </div>

            {error && (
              <div className="chat-error-banner animate-fade-in" style={{ marginBottom: "1.5rem" }}>
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>
                  {error.includes("Agent mode not supported on Linux") ? (
                    <span>
                      <strong>Agent Mode is not supported natively on Linux/WSL.</strong>
                      <br />
                      On WSL/Linux, the RepoPrompt daemon operates in headless mode to serve repository tools to external agents.
                      <br />
                      To explore or modify your codebase, run your configured CLI agent (e.g. <code>opencode</code> or <code>claude</code>) in your WSL terminal. It will connect to this daemon automatically.
                    </span>
                  ) : (
                    error
                  )}
                </span>
              </div>
            )}

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
                  State: <strong className="text-accent">{activeSession?.run_state}</strong>
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

            {/* Logs Viewport */}
            <div className="execution-transcript scrollbar-custom">
              {logs.length === 0 ? (
                <div className="loading-logs">
                  <Loader2 className="animate-spin text-muted" size={24} />
                  <span>Loading logs from daemon...</span>
                </div>
              ) : (
                groupedLogs.map((group, index) => {
                  if (group.type === "user") {
                    return (
                      <div key={group.id} className="log-row user-row animate-fade-in">
                        <div className="avatar user-avatar"><MessageSquare size={14} /></div>
                        <div className="content">
                          <span className="label">USER COMMAND</span>
                          <p>{group.singleLog?.content}</p>
                        </div>
                      </div>
                    );
                  }

                  if (group.type === "assistant") {
                    return (
                      <div key={group.id} className="log-row assistant-row animate-fade-in">
                        <div className="avatar assistant-avatar"><TermIcon size={14} /></div>
                        <div className="content">
                          <span className="label">ASSISTANT NARRATION</span>
                          <p>{group.singleLog?.content}</p>
                        </div>
                      </div>
                    );
                  }

                  if (group.type === "tool_execution") {
                    return renderToolExecutionCard(group, index);
                  }

                  if (group.type === "system") {
                    return (
                      <div key={group.id} className="log-row system-row animate-fade-in">
                        <div className="avatar system-avatar"><CheckCircle size={14} /></div>
                        <div className="content">
                          <span className="label">SYSTEM NOTIFICATION</span>
                          <pre className="system-code">{group.singleLog?.content}</pre>
                        </div>
                      </div>
                    );
                  }

                  if (group.type === "error") {
                    return (
                      <div key={group.id} className="log-row error-row animate-fade-in">
                        <div className="avatar error-avatar"><XCircle size={14} /></div>
                        <div className="content">
                          <span className="label">EXECUTION ERROR</span>
                          <pre className="error-code">{group.singleLog?.content}</pre>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={group.id} className="log-row note-row animate-fade-in">
                      <div className="avatar note-avatar"><HelpCircle size={14} /></div>
                      <div className="content">
                        <span className="label">NOTE</span>
                        <p>{group.singleLog?.content}</p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={transcriptEndRef} />
            </div>

            {/* Steering Input Panel */}
            {activeSession?.is_live && activeSession?.run_state !== "waiting_for_user" && (
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
