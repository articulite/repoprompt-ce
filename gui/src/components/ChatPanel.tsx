import React, { useState, useEffect, useRef } from "react";
import {
  Send, User, Brain, AlertCircle, Coins, Loader2,
  ChevronDown, ChevronRight, Copy, Check, BookOpen, X,
  FileText, Laptop, Zap, Eye, RefreshCw, Search,
  Lock, Info, Paperclip, MessageSquare, ArrowDown,
  Cpu, Plus, Settings, GitBranch
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
  messages: Message[];
  onMessagesChange: (msgs: Message[]) => void;
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

function parseInlineContent(text: string, isUserMessage: boolean = false): React.ReactNode[] {
  const regex = /(`[^`\n]+`|\*\*[^*]+\*\*|@[a-zA-Z0-9_\-\.\/]+)/g;
  const parts = text.split(regex);
  return parts.map((part, idx) => {
    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={idx} className="inline-code">{part.slice(1, -1)}</code>;
    }
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={idx}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("@")) {
      const fileName = part.slice(1);
      return (
        <span
          key={idx}
          className={`mention-pill ${isUserMessage ? "user-mention" : "assistant-mention"}`}
          onClick={() => {
            window.dispatchEvent(new CustomEvent("fileClickedInExplorer", { detail: { name: fileName } }));
          }}
          title={`Click to target ${fileName}`}
        >
          <FileText size={12} style={{ flexShrink: 0 }} />
          {part}
        </span>
      );
    }
    return part;
  });
}

function parseBlocks(text: string, isUserMessage: boolean = false): React.ReactNode[] {
  const rawLines = text.split("\n");
  const blocks: React.ReactNode[] = [];

  let currentList: { type: "ul" | "ol"; items: string[] } | null = null;

  const flushList = (keyPrefix: string | number) => {
    if (currentList) {
      const ListTag = currentList.type;
      const listClass = currentList.type === "ul" ? "markdown-ul" : "markdown-ol";
      blocks.push(
        <ListTag key={`list-${keyPrefix}`} className={listClass}>
          {currentList.items.map((item, idx) => (
            <li key={idx} className="markdown-li">
              {parseInlineContent(item, isUserMessage)}
            </li>
          ))}
        </ListTag>
      );
      currentList = null;
    }
  };

  rawLines.forEach((line, index) => {
    const trimmed = line.trim();

    // Check if it is a header
    const headerMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headerMatch) {
      flushList(index);
      const level = headerMatch[1].length;
      const content = headerMatch[2];
      const HeaderTag = `h${Math.min(6, level + 2)}` as any;
      blocks.push(
        <HeaderTag key={index} className={`markdown-h${level}`}>
          {parseInlineContent(content, isUserMessage)}
        </HeaderTag>
      );
      return;
    }

    // Check if it is an unordered list item (starts with -, *, +)
    const ulMatch = line.match(/^(\s*)[-*+]\s+(.*)$/);
    if (ulMatch) {
      const content = ulMatch[2];
      if (currentList && currentList.type === "ul") {
        currentList.items.push(content);
      } else {
        flushList(index);
        currentList = { type: "ul", items: [content] };
      }
      return;
    }

    // Check if it is an ordered list item (starts with 1., 2., etc.)
    const olMatch = line.match(/^(\s*)\d+\.\s+(.*)$/);
    if (olMatch) {
      const content = olMatch[2];
      if (currentList && currentList.type === "ol") {
        currentList.items.push(content);
      } else {
        flushList(index);
        currentList = { type: "ol", items: [content] };
      }
      return;
    }

    // Regular line
    if (trimmed === "") {
      flushList(index);
      blocks.push(<div key={index} className="markdown-spacer" />);
    } else {
      flushList(index);
      blocks.push(
        <p key={index} className="markdown-p">
          {parseInlineContent(line, isUserMessage)}
        </p>
      );
    }
  });

  flushList("final");
  return blocks;
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

const CHAT_TEMPLATES = [
  {
    title: "Explain Code",
    content: "Explain how this code works in detail, listing key functions, inputs, outputs, and any potential edge cases or bugs."
  },
  {
    title: "Write Unit Tests",
    content: "Write comprehensive unit tests for this code, covering success paths, edge cases, and error boundaries."
  },
  {
    title: "Refactor Code",
    content: "Refactor this code to improve readability, performance, and structure. Avoid altering its functional behavior."
  },
  {
    title: "Fix Bug",
    content: "Locate the bug in this code and suggest a fix. Describe the root cause and how to verify the correction."
  },
  {
    title: "Write Comments",
    content: "Add clear docstrings and comments explaining the architecture and logic of this code."
  }
];

export default function ChatPanel({ isConnected, messages, onMessagesChange }: ChatPanelProps) {
  const [showTemplates, setShowTemplates] = useState(false);
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Toolbar dropdown selections
  const [selectedWorkflow, setSelectedWorkflow] = useState("Orchestrate");
  const [selectedLocation, setSelectedLocation] = useState("Work locally");
  const [selectedPermission, setSelectedPermission] = useState("Permissions - Default");

  // Popover menus visibility
  const [showWorkflowMenu, setShowWorkflowMenu] = useState(false);
  const [showLocationMenu, setShowLocationMenu] = useState(false);
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [showPermissionMenu, setShowPermissionMenu] = useState(false);

  // Onboarding pagination states
  const [currentWorkflowPage, setCurrentWorkflowPage] = useState(0);
  const [activeTipIndex, setActiveTipIndex] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    let timer: any;
    if (loading) {
      setElapsedSeconds(0);
      timer = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    } else {
      setElapsedSeconds(0);
    }
    return () => clearInterval(timer);
  }, [loading]);

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
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    };

    window.addEventListener("fileClickedInExplorer", handleFileClicked);
    return () => window.removeEventListener("fileClickedInExplorer", handleFileClicked);
  }, []);

  // Listen for prompt injections from ContextBuilderPanel
  useEffect(() => {
    const handlePromptInjected = (e: Event) => {
      const customEvent = e as CustomEvent;
      const text = customEvent.detail.text;
      if (text) {
        setInput(text);
        if (textareaRef.current) {
          textareaRef.current.focus();
        }
      }
    };

    window.addEventListener("injectPromptIntoChat", handlePromptInjected);
    return () => window.removeEventListener("injectPromptIntoChat", handlePromptInjected);
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

    const userMsg = { role: "user" as const, text: userPrompt, timestamp: new Date() };
    const updatedMessages = [...messages, userMsg];
    onMessagesChange(updatedMessages);

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

        onMessagesChange([
          ...updatedMessages,
          { role: "assistant" as const, text: assistantReply, timestamp: new Date() },
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

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
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
      if (textareaRef.current) {
        textareaRef.current.focus();
        const newPos = newTextBefore.length;
        textareaRef.current.setSelectionRange(newPos, newPos);
      }
    }, 10);
  };

  const renderMessageContent = (text: string, isUser: boolean) => {
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

      return (
        <div key={index} className="msg-text-segment">
          {parseBlocks(seg.content, isUser)}
        </div>
      );
    });
  };

  return (
    <div className="chat-layout">
      <div className="chat-main-section">
        {/* Messages viewport */}
        {messages.length === 0 ? (
          <div className="chat-onboarding-container">
            <div className="onboarding-title-container animate-fade-in">
              <MessageSquare size={40} className="onboarding-conversation-icon animate-pulse" />
              <h1>What are we building?</h1>
            </div>

            {/* Workflows Section */}
            <div style={{ width: '100%' }}>
              <div className="onboarding-workflows-header">
                <h3>FEATURED WORKFLOWS</h3>
                <div className="workflows-carousel-controls">
                  <button className="btn-carousel-edit">Edit</button>
                  <div className="carousel-dots">
                    <button className={`carousel-dot ${currentWorkflowPage === 0 ? 'active' : ''}`} onClick={() => setCurrentWorkflowPage(0)}></button>
                    <button className={`carousel-dot ${currentWorkflowPage === 1 ? 'active' : ''}`} onClick={() => setCurrentWorkflowPage(1)}></button>
                  </div>
                </div>
              </div>

              {currentWorkflowPage === 0 ? (
                <div className="workflows-grid animate-fade-in">
                  <div className="workflow-card-item" onClick={() => { setSelectedWorkflow("Orchestrate"); if (textareaRef.current) textareaRef.current.focus(); }}>
                    <div className="workflow-card-title-row">
                      <Cpu size={16} className="text-emerald-500" />
                      <span>Orchestrate</span>
                    </div>
                    <div className="workflow-card-desc">
                      Breaks a complex request into smaller tasks, sends agents to do the work, and checks each result.
                    </div>
                  </div>
                  <div className="workflow-card-item" onClick={() => { setSelectedWorkflow("Deep Plan"); if (textareaRef.current) textareaRef.current.focus(); }}>
                    <div className="workflow-card-title-row">
                      <FileText size={16} className="text-blue-500" />
                      <span>Deep Plan</span>
                    </div>
                    <div className="workflow-card-desc">
                      Researches the code, asks how hands-on you want to be, and writes a clear implementation plan.
                    </div>
                  </div>
                  <div className="workflow-card-item" onClick={() => { setSelectedWorkflow("Optimize"); if (textareaRef.current) textareaRef.current.focus(); }}>
                    <div className="workflow-card-title-row">
                      <Zap size={16} className="text-red-500" />
                      <span>Optimize</span>
                    </div>
                    <div className="workflow-card-desc">
                      Finds what to measure, adds metrics, tries improvements, and uses evidence to keep iterating.
                    </div>
                  </div>
                  <div className="workflow-card-item" onClick={() => { setSelectedWorkflow("Review"); if (textareaRef.current) textareaRef.current.focus(); }}>
                    <div className="workflow-card-title-row">
                      <Eye size={16} className="text-purple-500" />
                      <span>Review</span>
                    </div>
                    <div className="workflow-card-desc">
                      Deeply reviews the code for subtle bugs, regressions, risks, and missed edge cases.
                    </div>
                  </div>
                </div>
              ) : (
                <div className="workflows-grid animate-fade-in">
                  <div className="workflow-card-item" onClick={() => { setSelectedWorkflow("Refactor"); if (textareaRef.current) textareaRef.current.focus(); }}>
                    <div className="workflow-card-title-row">
                      <RefreshCw size={16} className="text-orange-500" />
                      <span>Refactor</span>
                    </div>
                    <div className="workflow-card-desc">
                      Cleans up code structure while keeping behavior the same.
                    </div>
                  </div>
                  <div className="workflow-card-item" onClick={() => { setSelectedWorkflow("Investigate"); if (textareaRef.current) textareaRef.current.focus(); }}>
                    <div className="workflow-card-title-row">
                      <Search size={16} className="text-teal-500" />
                      <span>Investigate</span>
                    </div>
                    <div className="workflow-card-desc">
                      Digs into bugs, crashes, security concerns, or research questions and reports the evidence.
                    </div>
                  </div>
                  <div className="workflow-card-item" onClick={() => { setInput("Export active session history to markdown"); if (textareaRef.current) textareaRef.current.focus(); }}>
                    <div className="workflow-card-title-row">
                      <BookOpen size={16} className="text-zinc-400" />
                      <span>ChatGPT Export</span>
                    </div>
                    <div className="workflow-card-desc">
                      Exports active chat history formatted as clean markdown for direct ChatGPT or Claude imports.
                    </div>
                  </div>
                  <div className="workflow-card-item" style={{ opacity: 0.5, cursor: 'default' }}>
                    <div className="workflow-card-title-row">
                      <Plus size={16} className="text-zinc-500" />
                      <span>More coming soon</span>
                    </div>
                    <div className="workflow-card-desc">
                      Custom workflows can be configured in configuration settings.
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Tips Section */}
            <div className="onboarding-tips-container">
              <div className="tips-header-row">
                <span>TIPS & TRICKS</span>
                <div className="carousel-dots">
                  {[0, 1, 2].map(idx => (
                    <button key={idx} className={`carousel-dot ${activeTipIndex === idx ? 'active' : ''}`} onClick={() => setActiveTipIndex(idx)}></button>
                  ))}
                </div>
              </div>

              {activeTipIndex === 0 && (
                <div className="tips-card-item animate-fade-in">
                  <Info size={16} className="text-orange-500 animate-pulse" style={{ flexShrink: 0 }} />
                  <div className="tips-card-content">
                    <span className="tips-card-title">File Mentions</span>
                    <span className="tips-card-desc">Use <code>@filename</code> to mention specific files and compile precise context maps.</span>
                  </div>
                </div>
              )}
              {activeTipIndex === 1 && (
                <div className="tips-card-item animate-fade-in">
                  <Info size={16} className="text-orange-500 animate-pulse" style={{ flexShrink: 0 }} />
                  <div className="tips-card-content">
                    <span className="tips-card-title">Workflow Planning</span>
                    <span className="tips-card-desc">Select the <code>Deep Plan</code> workflow to review architecture design before making any codebase modifications.</span>
                  </div>
                </div>
              )}
              {activeTipIndex === 2 && (
                <div className="tips-card-item animate-fade-in">
                  <Info size={16} className="text-orange-500 animate-pulse" style={{ flexShrink: 0 }} />
                  <div className="tips-card-content">
                    <span className="tips-card-title">Direct Models Switching</span>
                    <span className="tips-card-desc">Use the Models dropdown in the bottom bar to switch LLM providers dynamically.</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="chat-messages">
            {messages.map((msg, i) => (
              <div key={i} className={`chat-bubble-container ${msg.role}`}>
                <div className="avatar">
                  {msg.role === "user" ? <User size={14} /> : <Brain size={14} />}
                </div>
                <div className="chat-bubble">
                  {msg.role === "user" && <span className="bubble-user-badge">Pair Programmer</span>}
                  <div className="bubble-text">{renderMessageContent(msg.text, msg.role === "user")}</div>
                  <div className="bubble-meta-info">
                    <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    {msg.role === "user" && (
                      <>
                        <span className="text-[9px] px-1 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono">Y</span>
                        <button className="btn-bubble-copy" title="Copy prompt text" onClick={() => navigator.clipboard.writeText(msg.text)}>
                          <Copy size={11} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {loading && (
              <div className="chat-bubble-container assistant animate-fade-in">
                <div className="avatar animate-pulse">
                  <Brain size={14} />
                </div>
                <div className="chat-bubble loading-bubble" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Loader2 className="animate-spin" size={14} />
                    <span>Agent is thinking and executing tools...</span>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Preparing... {elapsedSeconds}s</span>
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
        )}

      {/* New Premium Input Box Card */}
      <div className="chat-input-premium-card">
        {/* Top Toolbar */}
        <div className="chat-input-toolbar-top">
          <div className="input-toolbar-selectors">
            {/* Workflow Selector Button */}
            <div style={{ position: 'relative' }}>
              <button type="button" className="btn-toolbar-dropdown" onClick={() => { setShowWorkflowMenu(!showWorkflowMenu); setShowLocationMenu(false); }}>
                <Cpu size={12} />
                <span>Workflow: {selectedWorkflow}</span>
                <ChevronDown size={10} />
              </button>

              {showWorkflowMenu && (
                <div className="popover-menu-custom workflow-menu animate-fade-in">
                  <div className="popover-menu-header">BUILT-IN</div>
                  {[
                    { name: "Orchestrate", desc: "Breaks request into tasks, deploys agents, and checks result.", icon: Cpu, color: "text-emerald-500" },
                    { name: "Deep Plan", desc: "Researches code, asks preference, writes plans.", icon: FileText, color: "text-blue-500" },
                    { name: "Optimize", desc: "Finds metrics, tries improvements, keeps iterating.", icon: Zap, color: "text-red-500" },
                    { name: "Review", desc: "Deeply reviews code for bugs, regressions, risks.", icon: Eye, color: "text-purple-500" },
                    { name: "Refactor", desc: "Cleans up structure keeping behavior same.", icon: RefreshCw, color: "text-orange-500" },
                    { name: "Investigate", desc: "Digs into crashes, bug evidence, reports findings.", icon: Search, color: "text-teal-500" }
                  ].map(w => (
                    <button
                      key={w.name}
                      type="button"
                      className={`popover-menu-item ${selectedWorkflow === w.name ? 'active' : ''}`}
                      onClick={() => { setSelectedWorkflow(w.name); setShowWorkflowMenu(false); }}
                    >
                      <w.icon size={13} className={w.color} style={{ marginTop: '2px' }} />
                      <div className="popover-menu-item-content">
                        <span className="popover-menu-item-title">{w.name}</span>
                        <span className="popover-menu-item-desc">{w.desc}</span>
                      </div>
                    </button>
                  ))}
                  <div className="popover-menu-footer-row">
                    <button type="button" className="btn-popover-footer-action">
                      <Settings size={10} /> Configure...
                    </button>
                    <button type="button" className="btn-popover-footer-action">
                      <RefreshCw size={10} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Execution Location Button */}
            <div style={{ position: 'relative' }}>
              <button type="button" className="btn-toolbar-dropdown" onClick={() => { setShowLocationMenu(!showLocationMenu); setShowWorkflowMenu(false); }}>
                <Laptop size={12} />
                <span>{selectedLocation}</span>
                <ChevronDown size={10} />
              </button>

              {showLocationMenu && (
                <div className="popover-menu-custom animate-fade-in">
                  <div className="popover-menu-header">EXECUTION LOCATION</div>
                  <button
                    type="button"
                    className={`popover-menu-item ${selectedLocation === 'Work locally' ? 'active' : ''}`}
                    onClick={() => { setSelectedLocation("Work locally"); setShowLocationMenu(false); }}
                  >
                    <Laptop size={13} style={{ marginTop: '2px' }} />
                    <div className="popover-menu-item-content">
                      <span className="popover-menu-item-title">Work locally</span>
                      <span className="popover-menu-item-desc">Run directly on your local system host</span>
                    </div>
                    {selectedLocation === 'Work locally' && <Check size={12} className="ml-auto" />}
                  </button>
                  <button
                    type="button"
                    className={`popover-menu-item ${selectedLocation === 'New worktree' ? 'active' : ''}`}
                    onClick={() => { setSelectedLocation("New worktree"); setShowLocationMenu(false); }}
                  >
                    <GitBranch size={13} style={{ marginTop: '2px' }} />
                    <div className="popover-menu-item-content">
                      <span className="popover-menu-item-title">New worktree</span>
                      <span className="popover-menu-item-desc">Create isolated sandbox branch</span>
                    </div>
                    {selectedLocation === 'New worktree' && <Check size={12} className="ml-auto" />}
                  </button>
                  <div style={{ borderTop: '1px solid var(--border-color)', margin: '4px 0' }} />
                  <div className="popover-menu-header">EXISTING WORKTREES</div>
                  <div className="popover-menu-info-box">
                    Existing and new worktrees require a Git-backed primary workspace root.
                  </div>
                </div>
              )}
            </div>

            {/* Context Badge */}
            <span className="btn-toolbar-badge">
              <FileText size={12} />
              <span>0 files</span>
            </span>
          </div>

          <button type="button" className="btn-scroll-bottom-arrow" onClick={scrollToBottom} title="Scroll to bottom">
            <ArrowDown size={12} />
          </button>
        </div>

        {/* Textarea Input area */}
        <div className="textarea-input-wrapper">
          <textarea
            ref={textareaRef}
            className="textarea-input-field"
            placeholder={isConnected ? "Ask code questions or type @ to mention files..." : "Waiting for connection..."}
            value={input}
            onChange={handleInputChange}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !showSuggestions) {
                e.preventDefault();
                handleSend(e);
              } else {
                handleKeyDown(e);
              }
            }}
            disabled={loading || !isConnected}
            rows={2}
          />

          {showSuggestions && (
            <div className="autocomplete-suggestions glass animate-fade-in" style={{ bottom: '100%', top: 'auto', marginBottom: '8px' }}>
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

          {/* Bottom Actions Row */}
          <div className="input-bottom-actions-row">
            <div className="bottom-selectors-left">
              {/* Model Picker */}
              <div style={{ position: 'relative' }}>
                <button type="button" className="btn-input-bottom-picker" onClick={() => { setShowModelMenu(!showModelMenu); setShowPermissionMenu(false); }}>
                  <Brain size={12} />
                  <span>Model: {roles.find(r => r.label === selectedRole)?.name || selectedRole.toUpperCase()}</span>
                  <ChevronDown size={10} />
                </button>
                {showModelMenu && (
                  <div className="popover-menu-custom animate-fade-in" style={{ width: '280px' }}>
                    <div className="popover-menu-header">AVAILABLE AGENT MODELS</div>
                    {roles.length === 0 ? (
                      <div style={{ padding: '8px 12px', fontSize: '11px', color: 'var(--text-muted)' }}>Loading models...</div>
                    ) : (
                      roles.map(r => (
                        <button
                          key={r.label}
                          type="button"
                          className={`popover-menu-item ${selectedRole === r.label ? 'active' : ''}`}
                          onClick={() => { setSelectedRole(r.label); setShowModelMenu(false); }}
                        >
                          <Brain size={13} style={{ marginTop: '2px' }} />
                          <div className="popover-menu-item-content">
                            <span className="popover-menu-item-title">{r.label.toUpperCase()}</span>
                            <span className="popover-menu-item-desc">{r.name}</span>
                          </div>
                          {selectedRole === r.label && <Check size={12} className="ml-auto" />}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Permissions Selector */}
              <div style={{ position: 'relative' }}>
                <button type="button" className="btn-input-bottom-picker" onClick={() => { setShowPermissionMenu(!showPermissionMenu); setShowModelMenu(false); }}>
                  <Lock size={12} />
                  <span>{selectedPermission}</span>
                  <ChevronDown size={10} />
                </button>
                {showPermissionMenu && (
                  <div className="popover-menu-custom animate-fade-in">
                    <div className="popover-menu-header">SECURITY PERMISSIONS</div>
                    {[
                      { name: "Permissions - Default", desc: "Require confirmation for destructive tools" },
                      { name: "Permissions - Full Write", desc: "Auto-approve all read and write tools" },
                      { name: "Permissions - Read Only", desc: "Deny all mutating write and run commands" }
                    ].map(p => (
                      <button
                        key={p.name}
                        type="button"
                        className={`popover-menu-item ${selectedPermission === p.name ? 'active' : ''}`}
                        onClick={() => { setSelectedPermission(p.name); setShowPermissionMenu(false); }}
                      >
                        <Lock size={13} style={{ marginTop: '2px' }} />
                        <div className="popover-menu-item-content">
                          <span className="popover-menu-item-title">{p.name}</span>
                          <span className="popover-menu-item-desc">{p.desc}</span>
                        </div>
                        {selectedPermission === p.name && <Check size={12} className="ml-auto" />}
                      </button>
                    ))}
                    <div style={{ borderTop: '1px solid var(--border-color)', margin: '4px 0' }} />
                    <div className="popover-menu-info-box">
                      Configure tool execution safety gates and auto-approval policies in settings.
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="bottom-actions-right">
              <button type="button" className="btn-input-attachment" title="Attach file or image">
                <Paperclip size={14} />
              </button>
              <button
                type="button"
                className="btn-send-premium"
                onClick={(e) => handleSend(e)}
                disabled={loading || !isConnected || !input.trim()}
                title="Send Message"
              >
                <Send size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Token Metadata summary */}
      <div className="chat-token-footer" style={{ margin: '0 24px 16px 24px' }}>
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
        <div style={{ flex: 1 }}></div>
        <button
          type="button"
          className={`btn-templates-toggle ${showTemplates ? 'active' : ''}`}
          onClick={() => setShowTemplates(!showTemplates)}
          title="Preset Prompt Templates"
        >
          <BookOpen size={12} />
          <span>Templates</span>
        </button>
      </div>
    </div>

      {/* Templates Sidebar */}
      {showTemplates && (
        <div className="chat-templates-sidebar glass border-left animate-fade-in">
          <div className="templates-header">
            <h4>Prompt Templates</h4>
            <button type="button" className="btn-icon-small" onClick={() => setShowTemplates(false)}>
              <X size={14} />
            </button>
          </div>
          <div className="templates-list">
            {CHAT_TEMPLATES.map((tmpl, idx) => (
              <div
                key={idx}
                className="template-card"
                onClick={() => {
                  setInput(tmpl.content);
                  setShowTemplates(false);
                  if (textareaRef.current) {
                    textareaRef.current.focus();
                  }
                }}
              >
                <h5>{tmpl.title}</h5>
                <p>{tmpl.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
