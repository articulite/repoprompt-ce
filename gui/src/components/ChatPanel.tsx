import React, { useState, useEffect, useRef } from "react";
import {
  Send, User, Brain, AlertCircle, Coins, Loader2,
  ChevronDown, ChevronRight, Copy, Check
} from "lucide-react";
import { mcpClient } from "../mcpClient";
import { safeParseJSON } from "../utils";

interface Message {
  role: "user" | "assistant" | "system";
  text: string;
  timestamp: Date;
}

interface ChatPanelProps {
  isConnected: boolean;
}

interface ContentSegment {
  type: "text" | "code";
  content: string;
  language?: string;
}

// Markdown parser splitting code blocks from text
function parseMarkdown(text: string): ContentSegment[] {
  const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
  const segments: ContentSegment[] = [];
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    const textBefore = text.slice(lastIndex, match.index);
    if (textBefore) {
      segments.push({ type: "text", content: textBefore });
    }

    segments.push({
      type: "code",
      language: match[1] || "text",
      content: match[2]
    });

    lastIndex = codeBlockRegex.lastIndex;
  }

  const textAfter = text.slice(lastIndex);
  if (textAfter) {
    segments.push({ type: "text", content: textAfter });
  }

  return segments;
}

// Foldable Code Block component
const CodeBlock = ({ language, code }: { language: string; code: string }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy code", err);
    }
  };

  return (
    <div className="code-block-card glass">
      <div className="code-block-header">
        <span className="language-badge">{language.toUpperCase()}</span>
        <div className="actions">
          <button type="button" className="action-btn" onClick={handleCopy}>
            {copied ? <Check size={12} className="text-success" /> : <Copy size={12} />}
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>
          <button type="button" className="action-btn" onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
            <span>{collapsed ? "Expand" : "Collapse"}</span>
          </button>
        </div>
      </div>
      {!collapsed && (
        <pre className="code-block-pre">
          <code>{code}</code>
        </pre>
      )}
    </div>
  );
};

export default function ChatPanel({ isConnected }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      text: "Hello! I am connected to the WSL Swift Daemon. How can I help you explore or modify your codebase today?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState("pair");
  const [roles, setRoles] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [tokenCost, setTokenCost] = useState({ inputTokens: 0, outputTokens: 0, cost: 0.0 });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Mentions autocomplete states
  const [filePaths, setFilePaths] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
  const [cursorPos, setCursorPos] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isConnected) {
      loadAgents();
      fetchFileSuggestions();
    }
  }, [isConnected]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Listen for file explorer clicks to inject mention
  useEffect(() => {
    const handleFileClicked = (e: Event) => {
      const customEvent = e as CustomEvent;
      const fileName = customEvent.detail.name;
      setInput(prev => {
        const spacer = prev && !prev.endsWith(" ") ? " " : "";
        return prev + spacer + `@${fileName} `;
      });
      if (inputRef.current) {
        inputRef.current.focus();
      }
    };

    window.addEventListener("fileClickedInExplorer", handleFileClicked);
    return () => window.removeEventListener("fileClickedInExplorer", handleFileClicked);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadAgents = async () => {
    try {
      const res = await mcpClient.callTool("agent_manage", {
        op: "list_agents",
        roles_only: true,
      });
      if (res && !res.isError && res.content && res.content[0]?.text) {
        const parsed = safeParseJSON(res.content[0].text);
        if (parsed?.task_labels) {
          setRoles(parsed.task_labels);
          if (parsed.task_labels.length > 0) {
            setSelectedRole(parsed.task_labels[0].label);
          }
        }
      }
    } catch (err) {
      console.error("Failed to list roles", err);
    }
  };

  const fetchFileSuggestions = async () => {
    try {
      const res = await mcpClient.callTool("get_file_tree", { type: "files", mode: "full" });
      if (res && !res.isError && res.content && res.content[0]?.text) {
        const text = res.content[0].text;
        const parsed = safeParseJSON(text);
        const treeStr = parsed?.tree || text;

        const lines = treeStr.split("\n");
        const paths: string[] = [];
        for (const line of lines) {
          const match = line.match(/^([│├└─┌\s]*)(.*)$/);
          if (match) {
            let name = match[2].trim();
            if (name) {
              if (name.endsWith(" *")) name = name.slice(0, -2);
              if (name.endsWith(" +")) name = name.slice(0, -2);
              paths.push(name);
            }
          }
        }
        setFilePaths(paths);
      }
    } catch (err) {
      console.error("Failed to fetch files list for autocomplete", err);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading || !isConnected) return;

    const userPrompt = input.trim();
    setInput("");
    setError(null);
    setLoading(true);
    setShowSuggestions(false);

    setMessages((prev) => [
      ...prev,
      { role: "user", text: userPrompt, timestamp: new Date() },
    ]);

    try {
      const res = await mcpClient.callTool("agent_run", {
        op: "start",
        message: userPrompt,
        model_id: selectedRole,
        detach: false,
      });

      if (res.isError) {
        setError(res.content?.[0]?.text || "Agent run encountered an error.");
      } else if (res.content && res.content[0]?.text) {
        const text = res.content[0].text;
        let assistantReply = text;

        const parsedResult = safeParseJSON(text);
        if (parsedResult?.summary) {
          assistantReply = parsedResult.summary;
        }
        if (parsedResult?.usage) {
          const inT = parsedResult.usage.input_tokens || 0;
          const outT = parsedResult.usage.output_tokens || 0;
          const computedCost = inT * 0.000003 + outT * 0.000015;
          setTokenCost({
            inputTokens: inT,
            outputTokens: outT,
            cost: Number(computedCost.toFixed(4)),
          });
        }

        setMessages((prev) => [
          ...prev,
          { role: "assistant", text: assistantReply, timestamp: new Date() },
        ]);
        // Refresh suggestions list in case files changed
        fetchFileSuggestions();
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to communicate with agent run tool.");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInput(val);

    const selectionStart = e.target.selectionStart || 0;
    setCursorPos(selectionStart);

    const textBeforeCursor = val.slice(0, selectionStart);
    const match = textBeforeCursor.match(/@([a-zA-Z0-9_\-\.\/]*)$/);

    if (match) {
      const query = match[1].toLowerCase();
      const filtered = filePaths.filter(p => p.toLowerCase().includes(query)).slice(0, 10);
      setSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
      setActiveSuggestionIndex(0);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showSuggestions) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveSuggestionIndex(prev => (prev + 1) % suggestions.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveSuggestionIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        selectSuggestion(suggestions[activeSuggestionIndex]);
      } else if (e.key === "Escape") {
        setShowSuggestions(false);
      }
    }
  };

  const selectSuggestion = (selected: string) => {
    const textBeforeCursor = input.slice(0, cursorPos);
    const textAfterCursor = input.slice(cursorPos);

    const newTextBefore = textBeforeCursor.replace(/@([a-zA-Z0-9_\-\.\/]*)$/, `@${selected} `);
    setInput(newTextBefore + textAfterCursor);
    setShowSuggestions(false);

    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        const newPos = newTextBefore.length;
        inputRef.current.setSelectionRange(newPos, newPos);
      }
    }, 10);
  };

  const renderMessageContent = (text: string) => {
    const segments = parseMarkdown(text);
    return segments.map((seg, index) => {
      if (seg.type === "code") {
        return (
          <CodeBlock
            key={index}
            language={seg.language || "text"}
            code={seg.content}
          />
        );
      }

      const inlineParsed = seg.content.split(/(`[^`\n]+`|\*\*[^*]+\*\*)/g).map((part, pIdx) => {
        if (part.startsWith("`") && part.endsWith("`")) {
          return <code key={pIdx} className="inline-code">{part.slice(1, -1)}</code>;
        }
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={pIdx}>{part.slice(2, -2)}</strong>;
        }
        return part;
      });
      return <span key={index} className="msg-text-segment">{inlineParsed}</span>;
    });
  };

  return (
    <div className="chat-layout">
      {/* Messages viewport */}
      <div className="chat-messages">
        {messages.map((msg, i) => (
          <div key={i} className={`chat-bubble-container ${msg.role}`}>
            <div className="avatar">
              {msg.role === "user" ? <User size={14} /> : <Brain size={14} />}
            </div>
            <div className="chat-bubble">
              <div className="bubble-text">{renderMessageContent(msg.text)}</div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="chat-bubble-container assistant">
            <div className="avatar animate-pulse">
              <Brain size={14} />
            </div>
            <div className="chat-bubble loading-bubble">
              <Loader2 className="animate-spin" size={14} />
              <span>Agent is thinking and executing tools...</span>
            </div>
          </div>
        )}
        {error && (
          <div className="chat-error-banner animate-fade-in">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input control strip */}
      <div className="chat-input-bar glass">
        <form onSubmit={handleSend} className="input-form">
          <div className="input-row">
            {/* Role/Model Selector */}
            <div className="role-selector-container">
              <select
                className="select"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                disabled={loading || !isConnected}
              >
                {roles.map((r) => (
                  <option key={r.label} value={r.label}>
                    {r.label.toUpperCase()} ({r.name})
                  </option>
                ))}
              </select>
            </div>

            {/* Input Wrapper with suggestions overlay */}
            <div className="input-field-wrapper">
              <input
                ref={inputRef}
                type="text"
                className="input"
                placeholder={isConnected ? "Ask code questions or type @ to mention files..." : "Waiting for connection..."}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                disabled={loading || !isConnected}
              />

              {showSuggestions && (
                <div className="autocomplete-suggestions glass animate-fade-in">
                  {suggestions.map((sug, sIdx) => (
                    <div
                      key={sug}
                      className={`suggestion-item ${sIdx === activeSuggestionIndex ? 'active' : ''}`}
                      onClick={() => selectSuggestion(sug)}
                    >
                      {sug}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Send button */}
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !isConnected || !input.trim()}
            >
              <Send size={16} />
            </button>
          </div>
        </form>

        {/* Token Metadata summary */}
        <div className="chat-token-footer">
          <div className="token-item">
            <Coins size={12} />
            <span>Session Cost Estimate:</span>
            <strong>${tokenCost.cost}</strong>
          </div>
          <div className="divider-vertical"></div>
          <div className="token-item">
            <span>Input Tokens:</span>
            <strong>{tokenCost.inputTokens}</strong>
          </div>
          <div className="divider-vertical"></div>
          <div className="token-item">
            <span>Output Tokens:</span>
            <strong>{tokenCost.outputTokens}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
