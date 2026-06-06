import React, { useState, useEffect } from "react";
import {
  Sparkles, Brain, Cpu, Check,
  Loader2, Plus, Trash2, Settings, AlertCircle, ArrowRight,
  ChevronRight, ChevronDown, Copy, FileText, FileCode,
  ArrowUp, ArrowDown, Info, BookOpen, Layers, CheckSquare
} from "lucide-react";
import { mcpClient } from "../mcpClient";
import { safeParseJSON } from "../utils";

interface SelectedFile {
  path: string;
  tokens: number;
  renderMode: "full" | "slices" | "codemap";
  linesCount: number;
  contentSnippet: string;
  ranges?: Array<{ start: number; end: number }>;
}

interface PromptPreset {
  id: string;
  title: string;
  content: string;
  isPinned: boolean;
  isBuiltIn: boolean;
}

interface LogEntry {
  id: string;
  timestamp: string;
  type: "system" | "info" | "tool" | "error";
  message: string;
}

const BUILT_IN_PRESETS: PromptPreset[] = [
  {
    id: "preset-interview",
    title: "Interview & Discover",
    content: "<task>Interview me to understand the task requirements.</task>\n<context>Explore the codebase for relevant areas, then ask clarifying questions to align on the details before creating a plan.</context>",
    isPinned: true,
    isBuiltIn: true
  },
  {
    id: "preset-plan",
    title: "Implementation Plan",
    content: "<task>Create a detailed implementation plan for this change.</task>\n<context>Analyze the architecture, dependencies, and file relationships. Output the plan as a markdown file.</context>",
    isPinned: false,
    isBuiltIn: true
  },
  {
    id: "preset-review",
    title: "Architecture & Design Review",
    content: "<task>Perform an architectural review of the selected files.</task>\n<context>Analyze code quality, safety, potential security issues, and style guide compliance.</context>",
    isPinned: false,
    isBuiltIn: true
  },
  {
    id: "preset-bug",
    title: "Bug Hunting & Diagnostics",
    content: "<task>Diagnose the root cause of the issue.</task>\n<context>Scan logs, error boundaries, and trace logic across these modules to find the fault.</context>",
    isPinned: false,
    isBuiltIn: true
  }
];

export default function ContextBuilderPanel({ isConnected }: { isConnected: boolean }) {
  // Selection list and token states
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [tokenBudget, setTokenBudget] = useState(120000);
  const [instructions, setInstructions] = useState("");
  const [enhancementMode, setEnhancementMode] = useState<"fullRewrite" | "augment" | "preserve">("fullRewrite");
  const [allowQuestions, setAllowQuestions] = useState(true);
  const [autoPlan, setAutoPlan] = useState(false);
  const [followUpType, setFollowUpType] = useState<"clarify" | "plan" | "question" | "review">("plan");

  // App settings defaults
  const [builderAgent, setBuilderAgent] = useState("claudeCode");
  const [builderModel, setBuilderModel] = useState("oracle");

  // UI state controls
  const [showPresetsOverlay, setShowPresetsOverlay] = useState(false);
  const [presets, setPresets] = useState<PromptPreset[]>([]);
  const [selectedPresetIds, setSelectedPresetIds] = useState<Set<string>>(new Set());
  const [showSettingsPopover, setShowSettingsPopover] = useState(false);
  const [newFilePath, setNewFilePath] = useState("");

  // Custom Preset Editor state
  const [showPresetEditor, setShowPresetEditor] = useState(false);
  const [editingPreset, setEditingPreset] = useState<PromptPreset | null>(null);
  const [presetTitle, setPresetTitle] = useState("");
  const [presetContent, setPresetContent] = useState("");

  // Plan generation state
  const [planStatus, setPlanStatus] = useState<"idle" | "generating" | "ready" | "error">("idle");
  const [planResult, setPlanResult] = useState<{
    prompt: string;
    responseText?: string;
    reasoningText?: string;
    fileCount: number;
    totalTokens: number;
    exportPath?: string;
  } | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isReasoningExpanded, setIsReasoningExpanded] = useState(true);
  const [copiedText, setCopiedText] = useState(false);

  // Load presets on mount
  useEffect(() => {
    const saved = localStorage.getItem("repoprompt_context_builder_prompts");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setPresets([...BUILT_IN_PRESETS, ...parsed.map((p: any) => ({ ...p, isBuiltIn: false }))]);
      } catch (e) {
        setPresets(BUILT_IN_PRESETS);
      }
    } else {
      setPresets(BUILT_IN_PRESETS);
    }
  }, []);

  // Listen to file clicks in tree explorer to add to selection
  useEffect(() => {
    const handleFileClicked = async (e: Event) => {
      const customEvent = e as CustomEvent;
      const filePath = customEvent.detail.name;
      if (filePath) {
        await addFileToSelection(filePath);
      }
    };

    window.addEventListener("fileClickedInExplorer", handleFileClicked);
    return () => window.removeEventListener("fileClickedInExplorer", handleFileClicked);
  }, [selectedFiles]);

  const saveCustomPresets = (customOnly: PromptPreset[]) => {
    localStorage.setItem("repoprompt_context_builder_prompts", JSON.stringify(customOnly));
  };

  const addFileToSelection = async (path: string) => {
    // Avoid duplicates
    if (selectedFiles.some(f => f.path === path)) return;

    addLog(`Reading file metadata for selection: ${path}`, "info");

    try {
      // Fetch metadata/content from read_file MCP tool
      const res = await mcpClient.callTool("read_file", { path, limit: 100 });
      let lines = 0;
      let tokens = 0;
      let snippet = "";

      if (res && !res.isError && res.content && res.content[0]?.text) {
        const text = res.content[0].text;

        // Handle JSON or plain string
        let fileContent = text;
        const parsed = safeParseJSON(text);
        if (parsed && parsed.content !== undefined) {
          fileContent = parsed.content;
          lines = parsed.totalLines || fileContent.split("\n").length;
        } else {
          lines = fileContent.split("\n").length;
        }

        tokens = Math.ceil(fileContent.length / 4.1); // Good approximation for token count
        snippet = fileContent.slice(0, 300) + (fileContent.length > 300 ? "..." : "");
      }

      const newFile: SelectedFile = {
        path,
        tokens: tokens || 50,
        renderMode: "full",
        linesCount: lines || 1,
        contentSnippet: snippet || "Empty file or metadata load error."
      };

      setSelectedFiles(prev => [...prev, newFile]);
      addLog(`Added ${path} (${newFile.tokens} tokens) to selection.`, "system");
    } catch (err: any) {
      addLog(`Failed to fetch file contents for ${path}: ${err.message || err}`, "error");
    }
  };

  const removeFileFromSelection = (path: string) => {
    setSelectedFiles(prev => prev.filter(f => f.path !== path));
    addLog(`Removed ${path} from selection.`, "system");
  };

  const updateFileRenderMode = (path: string, mode: "full" | "slices" | "codemap") => {
    setSelectedFiles(prev => prev.map(f => {
      if (f.path === path) {
        let updatedTokens = f.tokens;
        if (mode === "codemap") {
          updatedTokens = Math.max(15, Math.ceil(f.tokens * 0.15)); // Codemaps are much smaller (approx 15% size)
        } else if (mode === "slices") {
          updatedTokens = Math.max(30, Math.ceil(f.tokens * 0.4)); // Slices are smaller (approx 40% size)
        } else {
          // Re-estimate full size (rough recovery)
          updatedTokens = Math.ceil(f.contentSnippet.length * 5 / 4.1);
        }
        return { ...f, renderMode: mode, tokens: updatedTokens };
      }
      return f;
    }));
    addLog(`Updated render mode for ${path} to ${mode.toUpperCase()}.`, "info");
  };

  // Move items in list
  const moveItem = (index: number, direction: "up" | "down") => {
    const nextIndex = direction === "up" ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= selectedFiles.length) return;

    setSelectedFiles(prev => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[nextIndex];
      copy[nextIndex] = temp;
      return copy;
    });
  };

  const sortSelection = (method: "alphabetical" | "tokens") => {
    setSelectedFiles(prev => {
      const copy = [...prev];
      if (method === "alphabetical") {
        copy.sort((a, b) => a.path.localeCompare(b.path));
      } else {
        copy.sort((a, b) => b.tokens - a.tokens);
      }
      return copy;
    });
    addLog(`Sorted selection by ${method.toUpperCase()}.`, "info");
  };

  const addLog = (message: string, type: "system" | "info" | "tool" | "error" = "info") => {
    const entry: LogEntry = {
      id: Math.random().toString(),
      timestamp: new Date().toLocaleTimeString(),
      type,
      message
    };
    setLogs(prev => [...prev.slice(-49), entry]); // Keep last 50 log items
  };

  const handleManualAddFile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFilePath.trim()) return;
    addFileToSelection(newFilePath.trim());
    setNewFilePath("");
  };

  // Preset operations
  const togglePresetSelection = (id: string) => {
    setSelectedPresetIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const applySelectedPresets = () => {
    const selected = presets.filter(p => selectedPresetIds.has(p.id));
    if (selected.length === 0) return;

    // Build the XML meta prompt format
    const metaPrompts = selected
      .map(p => `<meta prompt="${p.title}">\n${p.content}\n</meta prompt>`)
      .join("\n\n");

    setInstructions(prev => {
      const spacer = prev ? "\n\n" : "";
      return prev + spacer + metaPrompts;
    });

    setShowPresetsOverlay(false);
    addLog(`Injected ${selected.length} prompt templates into instructions.`, "system");
  };

  const handleCreateOrEditPreset = (preset: PromptPreset | null) => {
    if (preset) {
      setEditingPreset(preset);
      setPresetTitle(preset.title);
      setPresetContent(preset.content);
    } else {
      setEditingPreset(null);
      setPresetTitle("");
      setPresetContent("");
    }
    setShowPresetEditor(true);
  };

  const handleSavePreset = () => {
    if (!presetTitle.trim() || !presetContent.trim()) return;

    let updatedPresets: PromptPreset[] = [];

    if (editingPreset) {
      updatedPresets = presets.map(p =>
        p.id === editingPreset.id ? { ...p, title: presetTitle, content: presetContent } : p
      );
    } else {
      const newPreset: PromptPreset = {
        id: `preset-${Date.now()}`,
        title: presetTitle,
        content: presetContent,
        isPinned: false,
        isBuiltIn: false
      };
      updatedPresets = [...presets, newPreset];
    }

    setPresets(updatedPresets);
    // Save only custom presets to LocalStorage
    const customOnly = updatedPresets.filter(p => !p.isBuiltIn);
    saveCustomPresets(customOnly);

    setShowPresetEditor(false);
    setEditingPreset(null);
  };

  const handleDeletePreset = (id: string) => {
    const updated = presets.filter(p => p.id !== id);
    setPresets(updated);
    saveCustomPresets(updated.filter(p => !p.isBuiltIn));
    setSelectedPresetIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  // Compile prompt and run context builder
  const handleRunContextBuilder = async () => {
    if (!isConnected) return;

    setPlanStatus("generating");
    setPlanError(null);
    setPlanResult(null);
    setLogs([]);
    addLog("Starting Context Builder agent session...", "system");

    // Construct the XML meta tags prompt matching the Swift app
    let finalPrompt = "";
    if (instructions.trim()) {
      finalPrompt += instructions;
    } else {
      finalPrompt += `<task>Analyze codebase and build context</task>`;
    }

    addLog(`Instructions Compiled: ${finalPrompt.slice(0, 100)}...`, "info");
    addLog(`Selected Files in Context: ${selectedFiles.length} files`, "info");

    try {
      // Trigger the tool call on the daemon
      addLog(`Invoking context_builder MCP tool... (Budget: ${tokenBudget} tokens)`, "tool");

      const res = await mcpClient.callTool("context_builder", {
        instructions: finalPrompt,
        response_type: followUpType === "clarify" ? undefined : followUpType,
        export_response: followUpType !== "clarify" ? true : undefined
      });

      if (res.isError) {
        const errorText = res.content?.[0]?.text || "Context Builder run failed.";
        setPlanError(errorText);
        setPlanStatus("error");
        addLog(`Error: ${errorText}`, "error");
      } else if (res.content && res.content[0]?.text) {
        const rawText = res.content[0].text;
        const parsed = safeParseJSON(rawText) || {};

        addLog("Context Builder execution completed successfully.", "system");

        // Parse outputs
        const compiledPrompt = parsed.prompt || rawText;
        const responseText = parsed.plan?.summary || parsed.review?.summary || parsed.prompt || "";
        const reasoningText = parsed.plan?.reasoning || parsed.review?.reasoning || "";
        const fileCount = parsed.file_count || selectedFiles.length;
        const totalTokens = parsed.total_tokens || 0;
        const exportPath = parsed.oracle_export_path || "";

        setPlanResult({
          prompt: compiledPrompt,
          responseText: responseText,
          reasoningText: reasoningText,
          fileCount,
          totalTokens,
          exportPath
        });

        // Sync local selected files from result selection details if returned
        if (parsed.selection) {
          addLog("Importing discovered files list from agent...", "info");
          // If we want, we can parse the selection and add new discovered files
        }

        setPlanStatus("ready");
      }
    } catch (err: any) {
      setPlanError(err.message || "Failed to execute context builder.");
      setPlanStatus("error");
      addLog(`Fatal Error: ${err.message || err}`, "error");
    }
  };

  const handleUseAsPrompt = () => {
    if (!planResult) return;
    // Dispatch a custom event to notify the ChatPanel to inject this text
    const textToInject = planResult.responseText || planResult.prompt;
    const event = new CustomEvent("injectPromptIntoChat", { detail: { text: textToInject } });
    window.dispatchEvent(event);

    addLog("Prompt injected into Chat tab. Switching view...", "system");
  };

  const handleCopyToClipboard = async () => {
    if (!planResult) return;
    const textToCopy = planResult.responseText || planResult.prompt;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
      addLog("Compiled output copied to clipboard.", "system");
    } catch (err) {
      console.error(err);
    }
  };

  // Compute token summation
  const totalTokensUsed = selectedFiles.reduce((acc, curr) => acc + curr.tokens, 0);
  const budgetRatio = Math.min(100, (totalTokensUsed / tokenBudget) * 100);
  const progressColor = totalTokensUsed > tokenBudget ? "var(--danger-color)" : totalTokensUsed > tokenBudget * 0.85 ? "var(--warning-color)" : "var(--success-color)";

  return (
    <div className="settings-layout">
      {/* Context Builder Left Control Column */}
      <div className="settings-sidebar border-right" style={{ width: "420px", flexShrink: 0 }}>
        <div className="settings-section-header" style={{ padding: "16px 20px 8px 20px" }}>
          <h2 className="flex items-center gap-2">
            <Cpu className="text-accent" size={18} /> Context Builder
          </h2>
          <p className="section-desc text-secondary" style={{ fontSize: "12px", marginTop: "4px" }}>
            Explore the codebase and assemble the perfect context.
          </p>
        </div>

        {/* Input Parameters Container */}
        <div className="p-4 flex flex-col gap-4 scrollbar-custom" style={{ overflowY: "auto", height: "calc(100vh - 160px)" }}>
          {/* Agent/Model Row */}
          <div className="settings-card glass p-3 flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-xs text-secondary">AGENT RUN CONFIGURATION</span>
              <button
                className="btn-icon-small"
                title="Context Settings"
                onClick={() => setShowSettingsPopover(!showSettingsPopover)}
              >
                <Settings size={14} />
              </button>
            </div>

            {showSettingsPopover && (
              <div className="p-2 border-bottom flex flex-col gap-2 animate-fade-in" style={{ fontSize: "12px" }}>
                <div className="flex flex-col gap-1">
                  <label className="text-muted text-xxs font-semibold">TOKEN BUDGET LIMIT</label>
                  <select
                    className="select input-small"
                    value={tokenBudget}
                    onChange={e => setTokenBudget(Number(e.target.value))}
                  >
                    <option value={30000}>30k tokens</option>
                    <option value={60000}>60k tokens</option>
                    <option value={120000}>120k tokens</option>
                    <option value={160000}>160k tokens</option>
                    <option value={240000}>240k tokens</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-muted text-xxs font-semibold">ENHANCEMENT MODE</label>
                  <select
                    className="select input-small"
                    value={enhancementMode}
                    onChange={e => setEnhancementMode(e.target.value as any)}
                  >
                    <option value="fullRewrite">Rewrite Prompt</option>
                    <option value="augment">Augment Content</option>
                    <option value="preserve">Preserve Instructions</option>
                  </select>
                </div>

                <div className="flex items-center justify-between mt-1">
                  <span className="text-muted text-xxs font-semibold">ALLOW QUESTIONS</span>
                  <label className="toggle-switch" style={{ transform: "scale(0.8)" }}>
                    <input
                      type="checkbox"
                      checked={allowQuestions}
                      onChange={e => setAllowQuestions(e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 mt-1">
              <div className="flex flex-col gap-1">
                <span className="text-xxs text-muted font-medium">DISCOVERY BACKEND</span>
                <select className="select input-small" value={builderAgent} onChange={e => setBuilderAgent(e.target.value)}>
                  <option value="claudeCode">Claude Code CLI</option>
                  <option value="codexExec">Codex Exec</option>
                  <option value="openCode">Open Code</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xxs text-muted font-medium">MODEL GRADE</span>
                <select className="select input-small" value={builderModel} onChange={e => setBuilderModel(e.target.value)}>
                  <option value="oracle">Oracle (Reasoning)</option>
                  <option value="chat">Chat (Balanced)</option>
                  <option value="fast">Fast (Cheap)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Instructions Input Area */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center">
              <label className="font-semibold text-xs text-secondary">TASK DESCRIPTION</label>
              <div className="flex gap-2">
                <button
                  className="btn btn-secondary btn-small py-1 px-2 flex items-center gap-1"
                  style={{ fontSize: "11px" }}
                  onClick={() => setShowPresetsOverlay(true)}
                >
                  <BookOpen size={11} /> Templates
                </button>
                {instructions && (
                  <button
                    className="text-muted hover:text-primary"
                    style={{ fontSize: "11px", border: "none", background: "none", cursor: "pointer" }}
                    onClick={() => setInstructions("")}
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            <textarea
              className="input textarea-input glass"
              rows={6}
              style={{ fontSize: "13px", resize: "vertical", fontFamily: "var(--font-body)" }}
              placeholder="Describe your goal... (e.g. 'Add a middleware parser for auth tokens...')"
              value={instructions}
              onChange={e => setInstructions(e.target.value)}
            />
          </div>

          {/* Analysis follow-up selector */}
          <div className="settings-card glass p-3 flex flex-col gap-3">
            <div>
              <span className="font-semibold text-xs text-secondary">ANALYSIS FOLLOW-UP WORKFLOW</span>
              <p className="text-muted text-xxs mt-0.5">What the agent should generate after finding files</p>
            </div>

            <div className="grid grid-cols-4 gap-1.5">
              {(["clarify", "plan", "question", "review"] as const).map(type => (
                <button
                  key={type}
                  className={`btn btn-small py-2 px-1 text-center font-medium ${followUpType === type ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: "11px", textTransform: "capitalize" }}
                  onClick={() => setFollowUpType(type)}
                >
                  {type}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between border-top pt-2">
              <div className="flex items-center gap-1">
                <span className="text-xs font-medium">Auto-Run Analysis</span>
                <span title="Trigger the follow-up generator automatically when Context Builder finishes.">
                  <Info size={12} className="text-muted" />
                </span>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={autoPlan}
                  onChange={e => setAutoPlan(e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <button
              className="btn btn-primary w-full py-2 flex items-center justify-center gap-2 font-semibold"
              disabled={planStatus === "generating"}
              onClick={handleRunContextBuilder}
            >
              {planStatus === "generating" ? (
                <>
                  <Loader2 className="animate-spin" size={16} /> Building Context...
                </>
              ) : (
                <>
                  <Sparkles size={16} /> Run Context Builder
                </>
              )}
            </button>
          </div>

          {/* Real-time Logs Console */}
          {logs.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="font-semibold text-xs text-secondary">PROGRESS CONSOLE</span>
              <div
                className="glass p-3 rounded-lg font-mono scrollbar-custom"
                style={{
                  height: "150px",
                  overflowY: "auto",
                  fontSize: "11px",
                  backgroundColor: "rgba(0,0,0,0.25)",
                  color: "#cbd5e1",
                  border: "1px solid var(--border-color)"
                }}
              >
                {logs.map((log) => (
                  <div key={log.id} className="flex gap-2 mb-1.5 leading-relaxed">
                    <span className="text-muted">[{log.timestamp}]</span>
                    <span className={`font-semibold ${log.type === 'error' ? 'text-danger' : log.type === 'system' ? 'text-accent' : log.type === 'tool' ? 'text-warning' : 'text-secondary'}`}>
                      {log.type.toUpperCase()}:
                    </span>
                    <span>{log.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Context Builder Selection and Output Area */}
      <div className="settings-content scrollbar-custom" style={{ overflowY: "auto", padding: "24px" }}>

        {/* Token stats and Selection summary */}
        <div className="flex flex-col gap-3 mb-6">
          <div className="flex justify-between items-end">
            <div>
              <h3 className="text-lg font-bold">Prompt Context Compiler</h3>
              <p className="text-secondary text-xs mt-0.5">Selected codebase items compiled into LLM context window</p>
            </div>
            <div className="text-right">
              <span className="text-sm font-bold" style={{ color: progressColor }}>
                {totalTokensUsed.toLocaleString()}
              </span>
              <span className="text-muted text-xs"> / {tokenBudget.toLocaleString()} tokens</span>
            </div>
          </div>

          {/* Visual Budget Progress Bar */}
          <div className="w-full bg-tertiary rounded-full h-2.5 overflow-hidden border">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${budgetRatio}%`,
                backgroundColor: progressColor
              }}
            />
          </div>

          {/* Selection Stats Indicators */}
          <div className="grid grid-cols-4 gap-4 mt-1">
            <div className="glass p-3 rounded-lg text-center">
              <span className="text-muted text-xxs font-medium block">SELECTED PATHS</span>
              <span className="text-lg font-bold block mt-1">{selectedFiles.length}</span>
            </div>
            <div className="glass p-3 rounded-lg text-center">
              <span className="text-muted text-xxs font-medium block">FULL MODULES</span>
              <span className="text-lg font-bold block mt-1 text-success">
                {selectedFiles.filter(f => f.renderMode === 'full').length}
              </span>
            </div>
            <div className="glass p-3 rounded-lg text-center">
              <span className="text-muted text-xxs font-medium block">SLICES / RANGES</span>
              <span className="text-lg font-bold block mt-1 text-warning">
                {selectedFiles.filter(f => f.renderMode === 'slices').length}
              </span>
            </div>
            <div className="glass p-3 rounded-lg text-center">
              <span className="text-muted text-xxs font-medium block">CODEMAPS</span>
              <span className="text-lg font-bold block mt-1 text-accent">
                {selectedFiles.filter(f => f.renderMode === 'codemap').length}
              </span>
            </div>
          </div>
        </div>

        {/* Selected files workspace */}
        <div className="settings-card glass p-4 mb-6">
          <div className="flex justify-between items-center mb-4">
            <span className="font-bold text-sm">Active Compiler Selection</span>
            <div className="flex items-center gap-3">
              <span className="text-muted text-xs">Sort:</span>
              <button className="btn btn-secondary btn-small py-1" onClick={() => sortSelection("alphabetical")}>Name</button>
              <button className="btn btn-secondary btn-small py-1" onClick={() => sortSelection("tokens")}>Size</button>
            </div>
          </div>

          {selectedFiles.length === 0 ? (
            <div className="p-8 border rounded-lg text-center bg-tertiary flex flex-col items-center justify-center gap-2">
              <FileCode className="text-muted" size={32} />
              <span className="font-semibold text-secondary">No files selected in context</span>
              <p className="text-muted text-xs max-w-sm">
                Click files in the explorer sidebar on the left, or add absolute paths manually to add files to this workspace context.
              </p>

              <form onSubmit={handleManualAddFile} className="flex gap-2 w-full max-w-md mt-2">
                <input
                  type="text"
                  className="input input-small"
                  placeholder="Enter path (e.g. src/auth.swift)"
                  value={newFilePath}
                  onChange={e => setNewFilePath(e.target.value)}
                />
                <button type="submit" className="btn btn-secondary btn-small flex items-center gap-1">
                  <Plus size={12} /> Add
                </button>
              </form>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5 max-h-[350px] scrollbar-custom" style={{ overflowY: "auto" }}>
              {selectedFiles.map((file, idx) => (
                <div key={file.path} className="flex items-center justify-between p-2.5 rounded-lg border bg-secondary hover:bg-tertiary transition-colors duration-150">

                  {/* File icon and Path */}
                  <div className="flex items-center gap-3" style={{ maxWidth: "60%" }}>
                    <div className="flex flex-col gap-1 items-center">
                      <button className="btn-icon-small p-0 text-muted hover:text-primary" onClick={() => moveItem(idx, "up")} disabled={idx === 0}>
                        <ArrowUp size={10} />
                      </button>
                      <button className="btn-icon-small p-0 text-muted hover:text-primary" onClick={() => moveItem(idx, "down")} disabled={idx === selectedFiles.length - 1}>
                        <ArrowDown size={10} />
                      </button>
                    </div>
                    {file.renderMode === "codemap" ? (
                      <Layers className="text-accent" size={16} />
                    ) : file.renderMode === "slices" ? (
                      <BookOpen className="text-warning" size={16} />
                    ) : (
                      <FileText className="text-success" size={16} />
                    )}
                    <div className="flex flex-col">
                      <span className="font-mono text-xs font-semibold text-truncate" title={file.path}>{file.path}</span>
                      <span className="text-xxs text-muted">{file.linesCount} lines · {file.tokens.toLocaleString()} tokens</span>
                    </div>
                  </div>

                  {/* Render Mode Switcher */}
                  <div className="flex items-center gap-3">
                    <div className="flex rounded-md border overflow-hidden" style={{ transform: "scale(0.85)" }}>
                      {(["full", "slices", "codemap"] as const).map(mode => (
                        <button
                          key={mode}
                          className={`py-1 px-2.5 text-xxs font-medium border-none cursor-pointer transition-colors duration-150 ${file.renderMode === mode ? 'bg-accent text-white' : 'bg-secondary text-secondary hover:bg-tertiary'}`}
                          onClick={() => updateFileRenderMode(file.path, mode)}
                        >
                          {mode.toUpperCase()}
                        </button>
                      ))}
                    </div>

                    {/* Delete button */}
                    <button
                      className="btn-delete"
                      title="Remove from Selection"
                      onClick={() => removeFileFromSelection(file.path)}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Generated Context / Plan Output View */}
        {planStatus === "generating" && (
          <div className="settings-card glass p-8 text-center flex flex-col items-center justify-center gap-4">
            <Loader2 className="animate-spin text-accent" size={36} />
            <div className="flex flex-col gap-1">
              <span className="font-bold text-sm">Context Builder Agent Running</span>
              <p className="text-muted text-xs max-w-md">
                Analyzing codebase layout, computing semantic scores, and generating follow-up plan response...
              </p>
            </div>
          </div>
        )}

        {planStatus === "error" && (
          <div className="settings-card glass p-6 border-danger bg-danger-light/10 flex gap-4 items-start">
            <AlertCircle className="text-danger flex-shrink-0 mt-0.5" size={20} />
            <div className="flex flex-col gap-2">
              <span className="font-bold text-danger">Failed to Build Context</span>
              <p className="text-secondary text-xs">{planError}</p>
              <button className="btn btn-secondary btn-small self-start" onClick={handleRunContextBuilder}>Retry Run</button>
            </div>
          </div>
        )}

        {planStatus === "ready" && planResult && (
          <div className="settings-card glass p-5 animate-fade-in">
            {/* Header controls */}
            <div className="flex justify-between items-center border-bottom pb-4 mb-4">
              <div>
                <span className="font-bold text-sm text-success flex items-center gap-1.5">
                  <Check size={16} /> Analysis Context Ready
                </span>
                <p className="text-muted text-xxs mt-0.5">
                  Discovered {planResult.fileCount} files ({planResult.totalTokens.toLocaleString()} tokens total)
                </p>
              </div>
              <div className="flex gap-2">
                <button className="btn btn-secondary btn-small flex items-center gap-1" onClick={handleUseAsPrompt}>
                  <ArrowRight size={12} /> Use as Prompt
                </button>
                <button className="btn btn-secondary btn-small flex items-center gap-1" onClick={handleCopyToClipboard}>
                  {copiedText ? <Check className="text-success" size={12} /> : <Copy size={12} />}
                  <span>{copiedText ? "Copied" : "Copy Output"}</span>
                </button>
              </div>
            </div>

            {/* Split viewport for Reasoning + Output */}
            <div className="flex flex-col gap-4">
              {/* Reasoning Block */}
              {planResult.reasoningText && (
                <div className="flex flex-col gap-2 p-3 rounded-lg" style={{ backgroundColor: "rgba(129, 140, 248, 0.05)", border: "1px solid rgba(129, 140, 248, 0.2)" }}>
                  <button
                    className="flex justify-between items-center w-full border-none bg-none cursor-pointer text-left"
                    onClick={() => setIsReasoningExpanded(!isReasoningExpanded)}
                  >
                    <span className="flex items-center gap-1.5 font-semibold text-xs text-accent">
                      <Brain size={14} /> Agent Reasoning Process
                    </span>
                    {isReasoningExpanded ? <ChevronDown size={14} className="text-accent" /> : <ChevronRight size={14} className="text-accent" />}
                  </button>

                  {isReasoningExpanded && (
                    <pre className="p-2 rounded font-mono text-xs leading-relaxed text-secondary" style={{ overflowX: "auto", whiteSpace: "pre-wrap" }}>
                      {planResult.reasoningText}
                    </pre>
                  )}
                </div>
              )}

              {/* Main Response Output block */}
              <div className="flex flex-col gap-1.5">
                <span className="font-semibold text-xs text-secondary">COMPILED PROMPT / PLAN TEXT</span>
                <div
                  className="p-4 rounded-lg font-mono text-xs leading-relaxed border bg-tertiary overflow-auto max-h-[400px] scrollbar-custom"
                  style={{ whiteSpace: "pre-wrap" }}
                >
                  {planResult.responseText || planResult.prompt}
                </div>
              </div>

              {planResult.exportPath && (
                <div className="p-3 rounded-lg border border-warning bg-warning/5 text-xxs text-secondary flex items-center gap-2">
                  <CheckSquare className="text-warning" size={14} />
                  <span>
                    Output exported successfully to workspace file: <code>{planResult.exportPath}</code>
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Prompts Templates Overlay Drawer (Modal) */}
      {showPresetsOverlay && (
        <div className="modal-overlay" onClick={() => setShowPresetsOverlay(false)}>
          <div className="modal-content glass p-5 max-w-lg w-full" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h4 className="text-md font-bold">Context Builder Prompts</h4>
                <p className="text-secondary text-xxs mt-0.5">Select prompt templates to inject into instructions</p>
              </div>
              <button className="btn btn-secondary btn-small" onClick={() => handleCreateOrEditPreset(null)}>
                <Plus size={12} /> New Prompt
              </button>
            </div>

            <div className="flex flex-col gap-2.5 max-h-[300px] scrollbar-custom overflow-y-auto mb-4">
              {presets.map(p => (
                <div
                  key={p.id}
                  className={`p-3 rounded-lg border cursor-pointer hover:bg-tertiary flex justify-between items-start transition-colors duration-150 ${selectedPresetIds.has(p.id) ? 'border-accent bg-accent/5' : 'bg-secondary'}`}
                  onClick={() => togglePresetSelection(p.id)}
                >
                  <div className="flex items-start gap-2.5" style={{ maxWidth: "75%" }}>
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={selectedPresetIds.has(p.id)}
                      onChange={() => {}} // Controlled by row tap
                    />
                    <div className="flex flex-col gap-1">
                      <span className="font-semibold text-xs flex items-center gap-1.5">
                        {p.title}
                        {p.isBuiltIn && <span className="text-xxs font-normal text-muted bg-tertiary px-1 rounded">System</span>}
                      </span>
                      <p className="text-muted text-xxs text-truncate-2" title={p.content}>{p.content}</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {!p.isBuiltIn && (
                      <>
                        <button
                          className="btn-icon-small"
                          title="Edit"
                          onClick={(e) => { e.stopPropagation(); handleCreateOrEditPreset(p); }}
                        >
                          <BookOpen size={12} />
                        </button>
                        <button
                          className="btn-icon-small text-danger hover:bg-danger/10"
                          title="Delete"
                          onClick={(e) => { e.stopPropagation(); handleDeletePreset(p.id); }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 border-top pt-3">
              <button className="btn btn-secondary" onClick={() => setShowPresetsOverlay(false)}>Cancel</button>
              <button
                className="btn btn-primary"
                disabled={selectedPresetIds.size === 0}
                onClick={applySelectedPresets}
              >
                Inject Selected ({selectedPresetIds.size})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preset Custom Editor Modal */}
      {showPresetEditor && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal-content glass p-5 max-w-md w-full">
            <h4 className="text-md font-bold mb-4">{editingPreset ? "Edit Custom Prompt" : "Create Custom Prompt"}</h4>

            <div className="flex flex-col gap-4 mb-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-secondary">Title</label>
                <input
                  type="text"
                  className="input input-small"
                  placeholder="e.g. Code Review Helper"
                  value={presetTitle}
                  onChange={e => setPresetTitle(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-secondary">Instructions Content</label>
                <textarea
                  className="input textarea-input"
                  rows={6}
                  placeholder="Instructions and background context..."
                  value={presetContent}
                  onChange={e => setPresetContent(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 border-top pt-3">
              <button className="btn btn-secondary" onClick={() => setShowPresetEditor(false)}>Cancel</button>
              <button
                className="btn btn-primary"
                disabled={!presetTitle.trim() || !presetContent.trim()}
                onClick={handleSavePreset}
              >
                Save Prompt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
