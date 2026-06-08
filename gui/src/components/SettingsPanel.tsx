import React, { useState, useEffect } from "react";
import {
  Sliders, Terminal, Cpu, FileCode,
  Search, X, Loader2, HardDrive, Plus, Trash2,
  Paintbrush, ArrowDownCircle, Server, Wrench, ShieldCheck,
  Keyboard, Settings2, MessageSquare, Gauge, Key, Network,
  Database, ListCollapse, Files, Sparkles, Brain, Lock,
  Zap, AlertTriangle, ChevronRight, Users,
  Play, RefreshCw, SlidersHorizontal, ArrowUp, ArrowDown,
  Trash, Shield, Info, CheckCircle2, ChevronDown
} from "lucide-react";
import { mcpClient } from "../mcpClient";
import { safeParseJSON } from "../utils";

interface SettingItem {
  key: string;
  group: string;
  name: string;
  type: string;
  description: string;
  currentValue: any;
  options?: any[];
}

interface SettingsPanelProps {
  isConnected: boolean;
  roots: string[];
  onRefreshRoots: () => void;
  initialSection?: string;
}

export default function SettingsPanel({ isConnected, roots, onRefreshRoots, initialSection }: SettingsPanelProps) {
  const [activeSection, setActiveSection] = useState<string>(initialSection || "agent_mode");

  useEffect(() => {
    if (initialSection) {
      setActiveSection(initialSection);
    }
  }, [initialSection]);
  const [searchQuery, setSearchQuery] = useState("");
  const [settings, setSettings] = useState<SettingItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingKeys, setSavingKeys] = useState<Record<string, boolean>>({});
  const [newFolderPath, setNewFolderPath] = useState("");
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // --- Visual & Interactive mockup states ---

  // CLI Providers Tab State
  const [expandedProvider, setExpandedProvider] = useState<string | null>("claudeCode");
  const [expandedCompatible, setExpandedCompatible] = useState<string | null>("glmZAI");
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [testingResultText, setTestingResultText] = useState<string | null>(null);

  // Compatible Backend config bindings
  const [compatBaseURL_Kimi, setCompatBaseURL_Kimi] = useState("https://api.kimi.com/code/v1");
  const [compatBaseURL_Custom, setCompatBaseURL_Custom] = useState("http://localhost:8080/v1");
  const [compatHaiku_Custom, setCompatHaiku_Custom] = useState("custom-haiku-v1");
  const [compatSonnet_Custom, setCompatSonnet_Custom] = useState("custom-sonnet-v1");

  const [providerConnections, setProviderConnections] = useState<Record<string, boolean>>({
    codex: false,
    claudeCode: false,
    glmZAI: false,
    kimi: false,
    customCompatible: false,
    openCode: false,
    cursor: false
  });

  // Agent Permissions Tab State
  const [permissionsScope, setPermissionsScope] = useState<"directAgents" | "subagents">("directAgents");
  const [codexSandboxLevel, setCodexSandboxLevel] = useState("Safe Managed");
  const [claudeStrictMcp, setClaudeStrictMcp] = useState(true);
  const [openCodeSessionMode, setOpenCodeSessionMode] = useState("Approval Required");
  const [cursorAutoApprove, setCursorAutoApprove] = useState(false);
  const [subagentPerms, setSubagentPerms] = useState({
    readFile: true,
    writeFile: false,
    execCommand: false,
    fetchUrl: true,
    mcpTools: true
  });
  const [subagentPolicy, setSubagentPolicy] = useState("Safe Managed");

  // Agent Workflows state
  const [featuredWorkflows, setFeaturedWorkflows] = useState<string[]>([
    "dev-preflight",
    "smoke-launch"
  ]);
  const [visibleWorkflows, setVisibleWorkflows] = useState<Record<string, boolean>>({
    "dev-run": true,
    "dev-build": true,
    "dev-test": true,
    "dev-preflight": true,
    "smoke-launch": true,
    "format-check": true,
    "lint": true
  });
  const [customWorkflows, setCustomWorkflows] = useState<Array<{ id: string, name: string, description: string }>>([
    { id: "my-custom-flow", name: "Custom Code Audit", description: "Performs safety ledger checks before commit." }
  ]);
  const [newWorkflowName, setNewWorkflowName] = useState("");
  const [showNewWorkflowModal, setShowNewWorkflowModal] = useState(false);

  // MCP Tools state
  const [mcpToolsEnabled, setMcpToolsEnabled] = useState(true);
  const [mcpToolsSearch, setMcpToolsSearch] = useState("");
  const [enabledMcpTools, setEnabledMcpTools] = useState<Record<string, boolean>>({
    "read_file": true, "write_file": true, "grep_search": true, "list_dir": true,
    "run_command": false, "ask_permission": true, "ask_question": true, "define_subagent": true,
    "invoke_subagent": true, "manage_subagents": true, "manage_task": true, "schedule": true,
    "send_message": true, "read_url_content": true, "read_browser_page": true, "search_web": true
  });

  // Model presets state
  const [modelPresets, setModelPresets] = useState([
    { id: "explore", role: "explore", model: "Claude Haiku", active: true },
    { id: "engineer", role: "engineer", model: "Claude Sonnet 3.5", active: true },
    { id: "pair", role: "pair", model: "Claude Sonnet 3.5", active: true },
    { id: "design", role: "design", model: "Gemini Pro 1.5", active: true }
  ]);
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);

  // Benchmark state
  const [benchmarkModel, setBenchmarkModel] = useState("models.planning_model");
  const [benchmarkRunning, setBenchmarkRunning] = useState(false);
  const [benchmarkProgress, setBenchmarkProgress] = useState(0);
  const [benchmarkLogs, setBenchmarkLogs] = useState<string[]>([]);
  const [benchmarkScore, setBenchmarkScore] = useState<number | null>(null);

  // Updates state
  const [updateChannel, setUpdateChannel] = useState("stable");
  const [checkingForUpdates, setCheckingForUpdates] = useState(false);
  const [updateStatusText, setUpdateStatusText] = useState("RepoPrompt CE is up to date.");
  const currentVersion = "v1.4.2-ce";

  // Keyboard Shortcuts state
  const [recordingShortcut, setRecordingShortcut] = useState<string | null>(null);
  const [shortcuts, setShortcuts] = useState<Record<string, string>>({
    "agent-new": "⌘ N",
    "toggle-sidebar": "⌘ \\",
    "save-ws": "⌘ S",
    "save-exit": "⌘ ⇧ S",
    "save-preset": "⌘ ⌥ S",
    "create-preset": "⌘ ⌥ P",
    "tab-new": "⌘ T",
    "tab-close": "⌘ W",
    "tab-next": "⌘ ⇧ ]",
    "tab-prev": "⌘ ⇧ [",
    "font-up": "⌘ +",
    "font-down": "⌘ -"
  });

  // Prompt order state
  const [promptOrder, setPromptOrder] = useState([
    { id: "header", label: "Header Info Package" },
    { id: "system", label: "System Instructions" },
    { id: "files", label: "File Summary Manifest" },
    { id: "code", label: "File Contents & Code Context" },
    { id: "context", label: "Context Builder Discoveries" },
    { id: "user", label: "User Input Guidelines" }
  ]);

  // Model Config state
  const [expandedModelConfig, setExpandedModelConfig] = useState<string | null>(null);
  const [modelOverrides, setModelOverrides] = useState<Record<string, { diff: boolean, stream: boolean, responses: boolean, temp: number }>>({
    "claude-sonnet-3.5": { diff: true, stream: true, responses: false, temp: 0.7 },
    "gpt-4o": { diff: false, stream: true, responses: false, temp: 0.5 },
    "gemini-pro-1.5": { diff: false, stream: true, responses: false, temp: 0.7 },
    "deepseek-chat": { diff: true, stream: true, responses: false, temp: 0.7 }
  });

  // Sub-agent roles defaults
  const [subAgentRoles, setSubAgentRoles] = useState<Record<string, string>>({
    explore: "Claude Haiku",
    engineer: "Codex",
    pair: "Claude Sonnet 3.5",
    design: "Gemini Pro 1.5"
  });

  useEffect(() => {
    if (isConnected) {
      fetchAllSettings();
      fetchWorkspaces();
    }
  }, [isConnected]);

  useEffect(() => {
    const newConns = { ...providerConnections };
    let changed = false;
    settings.forEach(s => {
      if (s.key === "agent_mode.opencode_connected") {
        newConns.openCode = s.currentValue === true;
        changed = true;
      } else if (s.key === "agent_mode.cursor_connected") {
        newConns.cursor = s.currentValue === true;
        changed = true;
      } else if (s.key === "agent_mode.claude_code_connected") {
        newConns.claudeCode = s.currentValue === true;
        changed = true;
      } else if (s.key === "agent_mode.codex_connected") {
        newConns.codex = s.currentValue === true;
        changed = true;
      }
    });
    if (changed) {
      if (JSON.stringify(newConns) !== JSON.stringify(providerConnections)) {
        setProviderConnections(newConns);
      }
    }
  }, [settings]);

  // We fetch current settings values using op="get" for each registered group including keys
  const fetchAllSettings = async () => {
    setLoading(true);
    const groups = ["ui", "prompt_packaging", "models", "context_builder", "mcp", "code_maps", "file_system", "agent_mode", "keys"];
    const loadedSettings: SettingItem[] = [];

    try {
      for (const group of groups) {
        const res = await mcpClient.callTool("app_settings", { op: "get", group });
        if (res && !res.isError && res.content && res.content[0]?.text) {
          const parsed = safeParseJSON(res.content[0].text);
          if (parsed && typeof parsed === "object" && parsed.status === "ok" && parsed.values) {
            Object.entries(parsed.values).forEach(([fullKey, value]) => {
              const metadata = getSettingMetadata(fullKey, value);
              loadedSettings.push({
                key: fullKey,
                group,
                name: metadata.name,
                type: metadata.type,
                description: metadata.description,
                currentValue: value,
                options: metadata.options
              });
            });
          }
        }
      }
      setSettings(loadedSettings);
    } catch (err) {
      console.error("Failed to load settings JSON", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkspaces = async () => {
    try {
      const res = await mcpClient.callTool("manage_workspaces", { action: "list" });
      if (res && !res.isError && res.content && res.content[0]?.text) {
        const parsed = safeParseJSON(res.content[0].text);
        if (parsed?.workspaces) {
          setWorkspaces(parsed.workspaces);
        }
      }
    } catch (err) {
      console.error("Failed to load workspaces", err);
    }
  };

  const handleUpdateSetting = async (key: string, value: any) => {
    setSavingKeys(prev => ({ ...prev, [key]: true }));
    try {
      const res = await mcpClient.callTool("app_settings", { op: "set", key, value });
      if (res && res.isError) {
        alert(`Failed to save setting ${key}: ` + (res.content?.[0]?.text || "Unknown error"));
      } else {
        // Update local state
        setSettings(prev => prev.map(s => s.key === key ? { ...s, currentValue: value } : s));
      }
    } catch (err: any) {
      alert(`Error saving setting ${key}: ` + (err.message || err));
    } finally {
      setSavingKeys(prev => ({ ...prev, [key]: false }));
    }
  };

  const handleAddFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderPath.trim()) return;
    try {
      const res = await mcpClient.callTool("manage_workspaces", {
        action: "add_folder",
        folder_path: newFolderPath.trim()
      });
      if (res && res.isError) {
        alert(res.content?.[0]?.text || "Failed to add folder");
      } else {
        setNewFolderPath("");
        onRefreshRoots();
      }
    } catch (err: any) {
      alert(err.message || "Failed to add folder");
    }
  };

  const handleRemoveWorkspaceFolder = async (folderPath: string) => {
    if (!confirm(`Are you sure you want to remove the folder "${folderPath}" from the active workspace?`)) {
      return;
    }
    try {
      const res = await mcpClient.callTool("manage_workspaces", {
        action: "remove_folder",
        folder_path: folderPath
      });
      if (res && res.isError) {
        alert(res.content?.[0]?.text || "Failed to remove folder");
      } else {
        onRefreshRoots();
      }
    } catch (err: any) {
      alert(err.message || "Failed to remove folder");
    }
  };

  // Metadata dictionary for settings keys
  const getSettingMetadata = (key: string, val: any) => {
    const defaultMeta = {
      name: key.split(".").pop()?.replace(/_/g, " ").toUpperCase() || key,
      type: typeof val,
      description: "",
      options: undefined as any[] | undefined
    };

    switch (key) {
      case "keys.openrouter":
        return {
          name: "OpenRouter API Key",
          type: "password",
          description: "API key used to authenticate with OpenRouter."
        };
      case "keys.openai":
        return {
          name: "OpenAI API Key",
          type: "password",
          description: "API key used to authenticate with OpenAI."
        };
      case "keys.anthropic":
        return {
          name: "Anthropic API Key",
          type: "password",
          description: "API key used to authenticate with Anthropic."
        };
      case "keys.gemini":
        return {
          name: "Gemini API Key",
          type: "password",
          description: "API key used to authenticate with Gemini."
        };
      case "keys.deepseek":
        return {
          name: "DeepSeek API Key",
          type: "password",
          description: "API key used to authenticate with DeepSeek."
        };
      case "keys.grok":
        return {
          name: "Grok API Key",
          type: "password",
          description: "API key used to authenticate with Grok."
        };
      case "keys.groq":
        return {
          name: "Groq API Key",
          type: "password",
          description: "API key used to authenticate with Groq."
        };
      case "ui.appearance_mode":
        return {
          name: "Appearance Theme Mode",
          type: "enum",
          description: "Light, Dark, or System theme mode.",
          options: ["System", "Light", "Dark"]
        };
      case "ui.enable_keyboard_shortcuts":
        return {
          name: "Enable Keyboard Shortcuts",
          type: "boolean",
          description: "Global keyboard shortcut mappings for quick triggers."
        };
      case "ui.font_scale":
        return {
          name: "Editor Font Scale Size",
          type: "enum",
          description: "Scale editor, text area, and logs font size.",
          options: [10, 11, 12, 13, 14, 15, 16, 18, 20]
        };
      case "ui.show_tooltips":
        return {
          name: "Show Interaction Tooltips",
          type: "boolean",
          description: "Show brief tooltips when hovering buttons."
        };
      case "prompt_packaging.duplicate_user_instructions_at_top":
        return {
          name: "Duplicate User Instructions at Top",
          type: "boolean",
          description: "Repeats instructions at the header of packaged prompt buffers."
        };
      case "prompt_packaging.file_path_display_option":
        return {
          name: "File Path Display Format",
          type: "enum",
          description: "Configure absolute full pathing vs workspace relative path display.",
          options: ["Full", "Relative"]
        };
      case "prompt_packaging.include_datetime_in_user_instructions":
        return {
          name: "Include Timestamp in Prompt Package",
          type: "boolean",
          description: "Append prompt compile dates at the start of prompts."
        };
      case "prompt_packaging.selected_files_sort_method":
        return {
          name: "Selected Files Sort Order",
          type: "enum",
          description: "Sort method used when appending multiple files to context builder.",
          options: ["nameAscending", "nameDescending", "tokenAscending", "tokenDescending"]
        };
      case "models.custom_planning_prompt":
        return {
          name: "Custom Oracle System Instructions",
          type: "string_long",
          description: "Custom system guidelines/prompt overrides for Oracle reasoning tasks."
        };
      case "models.planning_model":
        return {
          name: "Oracle Reasoning Model Target",
          type: "string",
          description: "Select model override for planner reasoning agent execution."
        };
      case "models.preferred_compose_model":
        return {
          name: "Compose Chat Model Target",
          type: "string",
          description: "Default LLM target used for the core Chat input box."
        };
      case "models.sync_chat_model_with_oracle":
        return {
          name: "Synchronize Chat & Planner Models",
          type: "boolean",
          description: "Auto-sync target model selection from Oracle to the Chat workspace."
        };
      case "models.temperature":
        return {
          name: "Model Temperature Coefficient",
          type: "number",
          description: "LLM generation temperature parameter (between 0.0 and 1.0)."
        };
      case "models.temperature_enabled":
        return {
          name: "Send Temperature Parameter",
          type: "boolean",
          description: "Opt to pass custom temperature parameters in raw API calls."
        };
      case "context_builder.agent":
        return {
          name: "Context Builder CLI Backend",
          type: "enum",
          description: "Default daemon CLI agent driver.",
          options: ["claudeCode", "codexExec", "openCode", "cursor", "claudeCodeGLM", "kimiCode"]
        };
      case "context_builder.model":
        return {
          name: "Context Builder Tool Model",
          type: "string",
          description: "Target LLM model override used by the Context Builder MCP tool."
        };
      case "mcp.show_model_presets":
        return {
          name: "Recommend MCP Model Presets",
          type: "boolean",
          description: "Display preset recommendations on the MCP server setup pages."
        };
      case "code_maps.globally_disabled":
        return {
          name: "Globally Disable Code Maps",
          type: "boolean",
          description: "Deactivates codemap extraction and suppresses get_code_structure."
        };
      case "agent_mode.claude_raw_event_log_file_path":
        return {
          name: "Claude Raw Event Log Directory",
          type: "string",
          description: "Directory location override for storing raw JSONL stream files."
        };
      case "agent_mode.claude_raw_event_logging_enabled":
        return {
          name: "Claude Event Logging (DEBUG)",
          type: "boolean",
          description: "Capture and record raw event streams from the Claude CLI daemon."
        };
      case "agent_mode.codex_goal_support_enabled":
        return {
          name: "Codex /goal Support",
          type: "boolean",
          description: "Instruct Codex driver to inject goal-mode parameters on run start."
        };
      case "agent_mode.perf_diagnostics_enabled":
        return {
          name: "Agent Mode Performance Diagnostics",
          type: "boolean",
          description: "DEBUG-only log tracking for latency profiling."
        };
      case "agent_mode.perf_diagnostics_os_log_enabled":
        return {
          name: "OSLog Profiler Mirroring",
          type: "boolean",
          description: "Mirror performance tracking parameters into the OS console log stream."
        };
      case "agent_mode.show_built_in_workflow_cleanup_guidance":
        return {
          name: "Built-in Workflow Housekeeping Tips",
          type: "boolean",
          description: "Display cleanup suggestions after agent jobs terminate."
        };
      case "file_system.enable_hierarchical_ignores":
        return {
          name: "Hierarchical Folder Ignores",
          type: "boolean",
          description: "Evaluate .gitignore and ignore files dynamically in child paths."
        };
      case "file_system.global_ignore_defaults":
        return {
          name: "Global File Ignore Patterns",
          type: "string_long",
          description: "Gitignore-style patterns evaluated before local project workspace overrides."
        };
      case "file_system.respect_cursorignore":
        return {
          name: "Respect .cursorignore Files",
          type: "boolean",
          description: "Process and exclude paths specified in workspace .cursorignore files."
        };
      case "file_system.respect_gitignore":
        return {
          name: "Respect .gitignore Files",
          type: "boolean",
          description: "Process and exclude paths matching standard repository .gitignore rules."
        };
      case "file_system.respect_repo_ignore":
        return {
          name: "Respect .repo_ignore Rules",
          type: "boolean",
          description: "Process and exclude paths defined in local RepoPrompt .repo_ignore lists."
        };
      case "file_system.show_empty_folders":
        return {
          name: "Show Empty Folders in Tree",
          type: "boolean",
          description: "Whether empty folders appear in the explorer directory tree."
        };
      default:
        return defaultMeta;
    }
  };

  const sidebarGroups = [
    {
      title: "Agent Mode",
      items: [
        { id: "agent_mode", label: "Overview", icon: <Brain size={14} />, supported: true },
        { id: "cli_providers", label: "CLI Providers", icon: <Terminal size={14} />, supported: true },
        { id: "agent_models", label: "Agent Models", icon: <Cpu size={14} />, supported: true },
        { id: "agent_permissions", label: "Agent Permissions", icon: <Lock size={14} />, supported: true },
        { id: "agent_workflows", label: "Agent Workflows", icon: <Zap size={14} />, supported: true },
        { id: "context_builder", label: "Context Builder", icon: <Sliders size={14} />, supported: true }
      ]
    },
    {
      title: "MCP Server",
      items: [
        { id: "mcp", label: "MCP Server", icon: <Server size={14} />, supported: true },
        { id: "mcp_tools", label: "Tools", icon: <Wrench size={14} />, supported: true },
        { id: "workspace_approvals", label: "Workspace Approvals", icon: <ShieldCheck size={14} />, supported: true },
        { id: "model_presets", label: "Model Presets", icon: <Cpu size={14} />, supported: true }
      ]
    },
    {
      title: "Models & Providers",
      items: [
        { id: "models", label: "API Providers", icon: <Key size={14} />, supported: true },
        { id: "openrouter", label: "OpenRouter", icon: <Network size={14} />, supported: true },
        { id: "custom_api", label: "Custom API", icon: <Database size={14} />, supported: true },
        { id: "model_config", label: "Model Config", icon: <Sliders size={14} />, supported: true },
        { id: "benchmark", label: "Benchmark", icon: <Gauge size={14} />, supported: true }
      ]
    },
    {
      title: "Workspaces",
      items: [
        { id: "manage_workspaces", label: "Manage Workspaces", icon: <Files size={14} />, supported: true },
        { id: "manage_presets", label: "Manage Presets", icon: <Sparkles size={14} />, supported: true }
      ]
    },
    {
      title: "General",
      items: [
        { id: "ui", label: "Appearance", icon: <Paintbrush size={14} />, supported: true },
        { id: "updates", label: "Updates", icon: <ArrowDownCircle size={14} />, supported: true },
        { id: "keyboard_shortcuts", label: "Keyboard Shortcuts", icon: <Keyboard size={14} />, supported: true },
        { id: "advanced", label: "Advanced", icon: <Settings2 size={14} />, supported: true }
      ]
    },
    {
      title: "Prompting",
      items: [
        { id: "chat_settings", label: "Chat Settings", icon: <MessageSquare size={14} />, supported: true },
        { id: "workflow_presets", label: "Workflow Presets", icon: <Sliders size={14} />, supported: true },
        { id: "prompt_order", label: "Copy Prompt Order", icon: <ListCollapse size={14} />, supported: true }
      ]
    }
  ];

  const getTabDisplayName = (tabId: string) => {
    switch (tabId) {
      case "agent_mode": return "Agent Mode Overview";
      case "cli_providers": return "CLI Providers";
      case "agent_models": return "Agent Models";
      case "agent_permissions": return "Agent Permissions";
      case "agent_workflows": return "Agent Workflows";
      case "context_builder": return "Context Builder Settings";
      case "mcp": return "MCP Server Configuration";
      case "mcp_tools": return "MCP Tools";
      case "workspace_approvals": return "Workspace Approvals";
      case "model_presets": return "Model Presets";
      case "models": return "API Providers & Chat Models";
      case "openrouter": return "OpenRouter Settings";
      case "custom_api": return "Custom API Settings";
      case "model_config": return "Model Config Overrides";
      case "benchmark": return "Oracle Diagnostics & Benchmarks";
      case "manage_workspaces": return "Manage Workspaces";
      case "manage_presets": return "Manage Presets";
      case "ui": return "Appearance Themes";
      case "updates": return "Application Updates";
      case "keyboard_shortcuts": return "Keyboard Shortcuts";
      case "advanced": return "Advanced Settings";
      case "chat_settings": return "Chat Settings";
      case "workflow_presets": return "Workflow Presets";
      case "prompt_order": return "Copy Prompt Order";
      default: return tabId.toUpperCase();
    }
  };

  // Filter settings based on active tab or search query
  const filteredSettings = settings.filter(s => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return (
        s.name.toLowerCase().includes(query) ||
        s.key.toLowerCase().includes(query) ||
        s.description.toLowerCase().includes(query)
      );
    }
    switch (activeSection) {
      case "agent_mode":
        return s.group === "agent_mode";
      case "context_builder":
        return s.group === "context_builder";
      case "ui":
        return s.group === "ui" || s.group === "prompt_packaging";
      case "advanced":
        return s.group === "file_system" || s.group === "code_maps" || s.key === "ui.enable_keyboard_shortcuts";
      case "mcp":
        return s.group === "mcp";
      case "workspace_approvals":
        return false; // Rendered via custom workspaces view instead of list
      case "models":
        return s.group === "models" || (s.group === "keys" && s.key !== "keys.openrouter");
      case "openrouter":
        return s.key === "keys.openrouter";
      default:
        return false;
    }
  });

  // Clear search on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSearchQuery("");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const renderSettingInput = (s: SettingItem) => {
    const isSaving = !!savingKeys[s.key];

    if (s.type === "boolean") {
      return (
        <label className="toggle-switch">
          <input
            type="checkbox"
            checked={!!s.currentValue}
            onChange={(e) => handleUpdateSetting(s.key, e.target.checked)}
            disabled={isSaving}
          />
          <span className="toggle-slider"></span>
        </label>
      );
    }

    if (s.type === "enum" && s.options) {
      return (
        <select
          className="select-input"
          value={s.currentValue}
          onChange={(e) => {
            const val = s.options?.[0] === Number(s.options?.[0]) ? Number(e.target.value) : e.target.value;
            handleUpdateSetting(s.key, val);
          }}
          disabled={isSaving}
        >
          {s.options.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      );
    }

    if (s.type === "string_long") {
      return (
        <textarea
          className="input textarea-input"
          rows={3}
          value={s.currentValue || ""}
          onChange={(e) => handleUpdateSetting(s.key, e.target.value)}
          placeholder="Enter configuration values..."
          disabled={isSaving}
        />
      );
    }

    if (s.type === "number") {
      return (
        <div className="slider-container">
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            className="range-input"
            value={s.currentValue ?? 0}
            onChange={(e) => handleUpdateSetting(s.key, Number(e.target.value))}
            disabled={isSaving}
          />
          <span className="slider-value">{s.currentValue ?? 0}</span>
        </div>
      );
    }

    if (s.type === "password") {
      return (
        <input
          type="password"
          className="input password-input"
          value={s.currentValue || ""}
          placeholder="••••••••••••••••"
          onChange={(e) => {
            const val = e.target.value;
            handleUpdateSetting(s.key, val === "" ? null : val);
          }}
          disabled={isSaving}
        />
      );
    }

    // Default string text input
    return (
      <input
        type="text"
        className="input"
        value={s.currentValue || ""}
        onChange={(e) => handleUpdateSetting(s.key, e.target.value)}
        disabled={isSaving}
      />
    );
  };

  const getSettingValue = (keyPath: string, defaultValue: any = "Default") => {
    const item = settings.find(s => s.key === keyPath);
    return item?.currentValue || defaultValue;
  };

  const isKeyConfigured = (keyPath: string) => {
    const item = settings.find(s => s.key === keyPath);
    return !!(item && item.currentValue && item.currentValue !== "");
  };

  // --- RENDERING HELPERS FOR Visual/Interactive Settings Tabs Parity ---

  const renderCLIProviders = () => {
    const handleTestConnection = async (id: string) => {
      setTestingProvider(id);
      setTestingResultText(null);
      try {
        let providerName = id;
        if (id === "claudeCode") providerName = "claudecode";
        const res = await mcpClient.callTool("app_settings", {
          op: "test_connection",
          provider: providerName
        });
        if (res && !res.isError && res.content && res.content[0]?.text) {
          const parsed = JSON.parse(res.content[0].text);
          if (parsed.status === "success") {
            setTestingResultText(parsed.message || "Connection tested successfully!");
            setProviderConnections(prev => ({ ...prev, [id]: true }));
            fetchAllSettings();
          } else {
            setTestingResultText(parsed.message || "Warning: Connection failed.");
            setProviderConnections(prev => ({ ...prev, [id]: false }));
            fetchAllSettings();
          }
        } else {
          setTestingResultText(`Warning: Connection to ${id} failed. Check executable logs or provider keys.`);
        }
      } catch (err: any) {
        setTestingResultText(`Error testing connection: ${err.message || err}`);
      } finally {
        setTestingProvider(null);
      }
    };

    return (
      <div className="cli-providers-settings animate-fade-in">
        {testingResultText && (
          <div className="settings-card glass flex justify-between items-center" style={{ borderLeft: "3px solid var(--accent-color)" }}>
            <span className="text-small font-medium">{testingResultText}</span>
            <button className="clear-btn" onClick={() => setTestingResultText(null)}><X size={14} /></button>
          </div>
        )}

        {/* Codex Card */}
        <div className="provider-card-container">
          <div className="provider-card-header" onClick={() => setExpandedProvider(expandedProvider === "codex" ? null : "codex")}>
            <div className="provider-card-title-row">
              <span className="provider-card-title">Codex CLI</span>
              <span className="provider-card-info-btn"><Info size={13} /></span>
            </div>
            <div className="provider-card-badge-row">
              <span className={`provider-badge ${providerConnections.codex ? "active" : "inactive"}`}>
                <span className="status-dot" style={{ backgroundColor: providerConnections.codex ? "var(--success-color)" : "var(--text-muted)" }} />
                {providerConnections.codex ? "Connected" : "Not Connected"}
              </span>
              <ChevronRight size={14} className={`provider-card-chevron ${expandedProvider === "codex" ? "expanded" : ""}`} />
            </div>
          </div>
          {expandedProvider === "codex" && (
            <div className="provider-card-content">
              <span className="provider-card-description">
                Uses your OpenAI API key for Codex CLI commands. Connects to your ChatGPT-Plus subscription.
              </span>
              <div className="flex gap-2">
                <button
                  className="btn btn-secondary flex items-center gap-2"
                  disabled={testingProvider === "codex"}
                  onClick={() => handleTestConnection("codex")}
                >
                  {testingProvider === "codex" ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                  Test Connection
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => handleUpdateSetting("agent_mode.codex_connected", !providerConnections.codex)}
                >
                  {providerConnections.codex ? "Sign Out" : "Log In"}
                </button>
              </div>

              {/* Permissions summary */}
              <div className="permissions-sub-list" style={{ paddingLeft: 0, marginTop: "8px" }}>
                <div className="root-item flex justify-between items-center" style={{ padding: "8px 12px" }}>
                  <div className="flex items-center gap-2">
                    <Shield size={14} className="text-accent" />
                    <span className="text-xs font-semibold">Sandbox level: {codexSandboxLevel}</span>
                  </div>
                  <button className="btn btn-secondary" style={{ fontSize: "10px", padding: "2px 6px" }} onClick={() => setActiveSection("agent_permissions")}>
                    Configure
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Claude Code Card */}
        <div className="provider-card-container">
          <div className="provider-card-header" onClick={() => setExpandedProvider(expandedProvider === "claudeCode" ? null : "claudeCode")}>
            <div className="provider-card-title-row">
              <span className="provider-card-title">Claude Code CLI</span>
              <span className="provider-card-info-btn"><Info size={13} /></span>
            </div>
            <div className="provider-card-badge-row">
              <span className={`provider-badge ${providerConnections.claudeCode ? "active" : "inactive"}`}>
                <span className="status-dot" style={{ backgroundColor: providerConnections.claudeCode ? "var(--success-color)" : "var(--text-muted)" }} />
                {providerConnections.claudeCode ? "Connected" : "Not Connected"}
              </span>
              <ChevronRight size={14} className={`provider-card-chevron ${expandedProvider === "claudeCode" ? "expanded" : ""}`} />
            </div>
          </div>
          {expandedProvider === "claudeCode" && (
            <div className="provider-card-content">
              <span className="provider-card-description">
                Uses your Anthropic CLI login for Claude Code. Alternate compatible backends listed below run through this binary with their own API credentials.
              </span>
              <div className="flex gap-2">
                <button
                  className="btn btn-secondary flex items-center gap-2"
                  disabled={testingProvider === "claudeCode"}
                  onClick={() => handleTestConnection("claudeCode")}
                >
                  {testingProvider === "claudeCode" ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                  Test Connection
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => handleUpdateSetting("agent_mode.claude_code_connected", !providerConnections.claudeCode)}
                >
                  {providerConnections.claudeCode ? "Sign Out" : "Connect"}
                </button>
              </div>

              {/* Compatible Backends Subgroup */}
              <div className="compatible-backends-container">
                <div className="compatible-backends-header-row">
                  <span className="compatible-backends-header-title">
                    <SlidersHorizontal size={13} /> Claude Code–Compatible Backends
                  </span>
                </div>
                <span className="compatible-backends-desc">
                  Alternate providers launched through the `claude` binary launcher.
                </span>

                <div className="compatible-backends-list">
                  {/* GLM Z.ai Preset */}
                  <div className="provider-card-container" style={{ margin: 0 }}>
                    <div className="provider-card-header" style={{ padding: "8px 12px" }} onClick={() => setExpandedCompatible(expandedCompatible === "glmZAI" ? null : "glmZAI")}>
                      <span className="text-small font-semibold">GLM / Z.ai Presets</span>
                      <div className="provider-card-badge-row">
                        <span className={`provider-badge ${providerConnections.glmZAI ? "active" : "inactive"}`} style={{ fontSize: "10px", padding: "1px 6px" }}>
                          {providerConnections.glmZAI ? "Active" : "Inactive"}
                        </span>
                        <ChevronDown size={12} />
                      </div>
                    </div>
                    {expandedCompatible === "glmZAI" && (
                      <div className="provider-card-content" style={{ padding: "12px", borderTop: "1px solid var(--border-color)" }}>
                        <span className="text-xs text-secondary">
                          Routes GLM models via Z.ai's Anthropic-compatible endpoints.
                        </span>
                        <div className="form-input-group">
                          <label>Z.ai API Key</label>
                          <input type="password" className="input password-input" value="••••••••" placeholder="Enter API Key" disabled />
                        </div>
                        <button className="btn btn-secondary flex items-center gap-2" disabled={testingProvider === "glmZAI"} onClick={() => handleTestConnection("glmZAI")}>
                          {testingProvider === "glmZAI" ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                          Test Z.ai Connection
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Kimi Code Preset */}
                  <div className="provider-card-container" style={{ margin: 0 }}>
                    <div className="provider-card-header" style={{ padding: "8px 12px" }} onClick={() => setExpandedCompatible(expandedCompatible === "kimi" ? null : "kimi")}>
                      <span className="text-small font-semibold">Moonshot Kimi Code</span>
                      <div className="provider-card-badge-row">
                        <span className={`provider-badge ${providerConnections.kimi ? "active" : "inactive"}`} style={{ fontSize: "10px", padding: "1px 6px" }}>
                          {providerConnections.kimi ? "Active" : "Inactive"}
                        </span>
                        <ChevronDown size={12} />
                      </div>
                    </div>
                    {expandedCompatible === "kimi" && (
                      <div className="provider-card-content" style={{ padding: "12px", borderTop: "1px solid var(--border-color)" }}>
                        <span className="text-xs text-secondary">Routes Claude Code through Kimi's coding backend.</span>
                        <div className="form-row-2col">
                          <div className="form-input-group">
                            <label>Base URL</label>
                            <input type="text" className="input" value={compatBaseURL_Kimi} onChange={(e) => setCompatBaseURL_Kimi(e.target.value)} />
                          </div>
                          <div className="form-input-group">
                            <label>Kimi API Key</label>
                            <input type="password" className="input" placeholder="••••••••" />
                          </div>
                        </div>
                        <button className="btn btn-secondary flex items-center gap-2" disabled={testingProvider === "kimi"} onClick={() => handleTestConnection("kimi")}>
                          {testingProvider === "kimi" ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                          Test Kimi Connection
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Custom Compatible */}
                  <div className="provider-card-container" style={{ margin: 0 }}>
                    <div className="provider-card-header" style={{ padding: "8px 12px" }} onClick={() => setExpandedCompatible(expandedCompatible === "custom" ? null : "custom")}>
                      <span className="text-small font-semibold">Custom Claude-Compatible</span>
                      <div className="provider-card-badge-row">
                        <span className={`provider-badge ${providerConnections.customCompatible ? "active" : "inactive"}`} style={{ fontSize: "10px", padding: "1px 6px" }}>
                          {providerConnections.customCompatible ? "Active" : "Inactive"}
                        </span>
                        <ChevronDown size={12} />
                      </div>
                    </div>
                    {expandedCompatible === "custom" && (
                      <div className="provider-card-content" style={{ padding: "12px", borderTop: "1px solid var(--border-color)" }}>
                        <div className="form-row-2col">
                          <div className="form-input-group">
                            <label>Endpoint Base URL</label>
                            <input type="text" className="input" value={compatBaseURL_Custom} onChange={(e) => setCompatBaseURL_Custom(e.target.value)} />
                          </div>
                          <div className="form-input-group">
                            <label>Custom API Key</label>
                            <input type="password" className="input" placeholder="••••••••" />
                          </div>
                        </div>
                        <div className="form-row-2col">
                          <div className="form-input-group">
                            <label>Sonnet Slot Model ID</label>
                            <input type="text" className="input" value={compatSonnet_Custom} onChange={(e) => setCompatSonnet_Custom(e.target.value)} />
                          </div>
                          <div className="form-input-group">
                            <label>Haiku Slot Model ID</label>
                            <input type="text" className="input" value={compatHaiku_Custom} onChange={(e) => setCompatHaiku_Custom(e.target.value)} />
                          </div>
                        </div>
                        <button className="btn btn-secondary flex items-center gap-2" disabled={testingProvider === "custom"} onClick={() => handleTestConnection("custom")}>
                          {testingProvider === "custom" ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                          Test Custom Backend
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* OpenCode Card */}
        <div className="provider-card-container">
          <div className="provider-card-header" onClick={() => setExpandedProvider(expandedProvider === "openCode" ? null : "openCode")}>
            <div className="provider-card-title-row">
              <span className="provider-card-title">OpenCode CLI (ACP)</span>
              <span className="provider-card-info-btn"><Info size={13} /></span>
            </div>
            <div className="provider-card-badge-row">
              <span className={`provider-badge ${providerConnections.openCode ? "active" : "inactive"}`}>
                <span className="status-dot" style={{ backgroundColor: providerConnections.openCode ? "var(--success-color)" : "var(--text-muted)" }} />
                {providerConnections.openCode ? "Connected" : "Not Connected"}
              </span>
              <ChevronRight size={14} className={`provider-card-chevron ${expandedProvider === "openCode" ? "expanded" : ""}`} />
            </div>
          </div>
          {expandedProvider === "openCode" && (
            <div className="provider-card-content">
              <span className="provider-card-description">
                Direct integration with local open source coding models via OpenCode MCP servers.
              </span>
              <div className="flex gap-2">
                <button
                  className="btn btn-secondary flex items-center gap-2"
                  disabled={testingProvider === "openCode"}
                  onClick={() => handleTestConnection("openCode")}
                >
                  {testingProvider === "openCode" ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                  Test Connection
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => handleUpdateSetting("agent_mode.opencode_connected", !providerConnections.openCode)}
                >
                  {providerConnections.openCode ? "Disconnect" : "Connect"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Cursor Card */}
        <div className="provider-card-container">
          <div className="provider-card-header" onClick={() => setExpandedProvider(expandedProvider === "cursor" ? null : "cursor")}>
            <div className="provider-card-title-row">
              <span className="provider-card-title">Cursor CLI (ACP)</span>
              <span className="provider-card-info-btn"><Info size={13} /></span>
            </div>
            <div className="provider-card-badge-row">
              <span className={`provider-badge ${providerConnections.cursor ? "active" : "inactive"}`}>
                <span className="status-dot" style={{ backgroundColor: providerConnections.cursor ? "var(--success-color)" : "var(--text-muted)" }} />
                {providerConnections.cursor ? "Connected" : "Not Connected"}
              </span>
              <ChevronRight size={14} className={`provider-card-chevron ${expandedProvider === "cursor" ? "expanded" : ""}`} />
            </div>
          </div>
          {expandedProvider === "cursor" && (
            <div className="provider-card-content">
              <span className="provider-card-description">
                Connects sub-agents to Cursor's editing processes via local IPC sockets.
              </span>
              <div className="flex gap-2">
                <button
                  className="btn btn-secondary flex items-center gap-2"
                  disabled={testingProvider === "cursor"}
                  onClick={() => handleTestConnection("cursor")}
                >
                  {testingProvider === "cursor" ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                  Test Connection
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => handleUpdateSetting("agent_mode.cursor_connected", !providerConnections.cursor)}
                >
                  {providerConnections.cursor ? "Disconnect" : "Connect"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderContextBuilder = () => {
    const tokenBudget = Number(getSettingValue("context_builder.token_budget", 160000));
    const enhancementMode = getSettingValue("context_builder.enhancement_mode", "fullRewrite");
    const allowClarifyingQuestions = getSettingValue("context_builder.allow_clarifying_questions", true);
    const allowClarifyingQuestionsForMCP = getSettingValue("context_builder.allow_clarifying_questions_mcp", false);
    const questionTimeoutSeconds = Number(getSettingValue("context_builder.question_timeout_seconds", 300));
    const planTokenBudget = Number(getSettingValue("context_builder.plan_token_budget", 120000));
    const autoGeneratePlan = getSettingValue("context_builder.auto_generate_plan", false);

    const contextBuilderAgent = getSettingValue("context_builder.agent", "claudeCode");
    const contextBuilderModel = getSettingValue("context_builder.model", "Oracle");

    const getEnhancementDescription = (mode: string) => {
      switch (mode) {
        case "fullRewrite":
          return "Agent rewrites the prompt while building context.";
        case "augment":
          return "Keeps your instructions and appends relevant context.";
        case "preserve":
          return "Only updates file selection, leaves instructions unchanged.";
        default:
          return "";
      }
    };

    return (
      <div className="context-builder-settings animate-fade-in flex flex-col gap-4">
        {/* About Card */}
        <div className="settings-section-card">
          <div className="settings-section-card-title">
            <Brain size={16} className="text-accent" /> About Context Builder
          </div>
          <span className="settings-section-card-desc">
            Context Builder explores your codebase and generates an optimized prompt. It can be invoked from the UI or via the MCP tool.
          </span>
          <button
            className="dashboard-row flex justify-between items-center w-full mt-2"
            onClick={() => setActiveSection("agent_models")}
          >
            <div className="flex items-center gap-3">
              <Sparkles size={16} className="text-accent" />
              <div className="text-left">
                <div className="font-semibold text-xs text-primary">Context Builder Agent</div>
                <div className="text-xxs text-secondary">
                  Currently: {contextBuilderAgent === "claudeCode" ? "Claude Code" : contextBuilderAgent === "codexExec" ? "Codex Exec" : "OpenCode"} · {contextBuilderModel}. Configure this in Agent Models.
                </div>
              </div>
            </div>
            <ChevronRight size={14} className="text-secondary" />
          </button>
        </div>

        {/* Shared Settings */}
        <div className="settings-section-card">
          <div className="settings-section-card-title">Shared Settings</div>
          <span className="settings-section-card-desc">Token budgets and prompt enhancement behavior.</span>

          <div className="flex flex-col gap-4 mt-3">
            {/* Context Budget Slider */}
            <div className="form-input-group">
              <div className="flex justify-between items-center">
                <label>Context Budget</label>
                <span className="text-xs text-secondary font-mono">{(tokenBudget / 1000).toFixed(0)}k</span>
              </div>
              <input
                type="range"
                min={10000}
                max={300000}
                step={5000}
                className="w-full slider-accent"
                value={tokenBudget}
                onChange={(e) => handleUpdateSetting("context_builder.token_budget", Number(e.target.value))}
              />
              <span className="form-subtext text-xxs text-muted">
                Target prompt size. Use ~160k for ChatGPT/web exports by default, or lower for a more token-efficient prompt.
              </span>
            </div>

            <div className="border-bottom" style={{ margin: "4px 0" }} />

            {/* Enhancement Mode Segmented Choice */}
            <div className="form-input-group">
              <label>Prompt Enhancement</label>
              <div className="segmented-picker mt-1">
                {(["fullRewrite", "augment", "preserve"] as const).map((mode) => (
                  <button
                    key={mode}
                    className={`segmented-option ${enhancementMode === mode ? "active" : ""}`}
                    onClick={() => handleUpdateSetting("context_builder.enhancement_mode", mode)}
                  >
                    {mode === "fullRewrite" ? "Rewrite" : mode === "augment" ? "Augment" : "Preserve"}
                  </button>
                ))}
              </div>
              <span className="form-subtext text-xxs text-muted">
                {getEnhancementDescription(enhancementMode)}
              </span>
            </div>

            <div className="border-bottom" style={{ margin: "4px 0" }} />

            {/* Question Timeout Segmented Choice */}
            <div className="form-input-group">
              <label>Question Timeout</label>
              <div className="segmented-picker mt-1">
                {[30, 60, 120, 300].map((timeout) => (
                  <button
                    key={timeout}
                    className={`segmented-option ${questionTimeoutSeconds === timeout ? "active" : ""}`}
                    onClick={() => handleUpdateSetting("context_builder.question_timeout_seconds", timeout)}
                  >
                    {timeout < 60 ? `${timeout} sec` : `${timeout / 60} min`}
                  </button>
                ))}
              </div>
              <span className="form-subtext text-xxs text-muted">
                How long to wait for your response before the agent continues on its own. Applies to both clarifying questions and Agent Mode ask_user.
              </span>
            </div>
          </div>
        </div>

        {/* UI Runs */}
        <div className="settings-section-card">
          <div className="settings-section-card-title">UI Runs</div>
          <span className="settings-section-card-desc">When you click &ldquo;Run&rdquo; in the Context Builder panel.</span>

          <div className="flex flex-col gap-4 mt-3">
            {/* Allow Clarifying Questions UI */}
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-semibold text-primary">Allow Clarifying Questions</span>
                <span className="text-xxs text-secondary">
                  Agent can ask questions ({questionTimeoutSeconds < 60 ? `${questionTimeoutSeconds} sec` : `${questionTimeoutSeconds / 60} min`} timeout)
                </span>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={allowClarifyingQuestions}
                  onChange={(e) => handleUpdateSetting("context_builder.allow_clarifying_questions", e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="border-bottom" style={{ margin: "4px 0" }} />

            {/* Follow-up Analysis */}
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-semibold text-primary">Follow-up Analysis</span>
                <span className="text-xxs text-secondary">
                  Auto-run plan/review/question after Context Builder completes
                </span>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={autoGeneratePlan}
                  onChange={(e) => handleUpdateSetting("context_builder.auto_generate_plan", e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            {/* Follow-up / Planning Budget (displayed only when autoGeneratePlan is true) */}
            {autoGeneratePlan && (
              <div className="p-3 rounded-lg border mt-2 flex flex-col gap-3" style={{ backgroundColor: "rgba(249, 115, 22, 0.03)", borderColor: "rgba(249, 115, 22, 0.15)" }}>
                <div className="form-input-group mb-0">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-secondary">Analysis Budget</span>
                    <span className="text-xs font-semibold text-secondary font-mono">{(planTokenBudget / 1000).toFixed(0)}k</span>
                  </div>
                  <input
                    type="range"
                    min={40000}
                    max={300000}
                    step={5000}
                    className="w-full slider-accent"
                    value={planTokenBudget}
                    onChange={(e) => handleUpdateSetting("context_builder.plan_token_budget", Number(e.target.value))}
                  />
                </div>
                <div className="flex items-center gap-2 text-xxs text-secondary">
                  <Brain size={12} className="text-secondary" />
                  <span>
                    Analysis uses the Oracle Model: {getSettingValue("models.planning_model", "Claude Sonnet 4.5")}. Change it in Agent Models.
                  </span>
                </div>
                <p className="text-xxs text-muted leading-relaxed mb-0">
                  After context building, a separate API call generates a plan, review, or answer.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* MCP Runs */}
        <div className="settings-section-card">
          <div className="settings-section-card-title">MCP Runs</div>
          <span className="settings-section-card-desc">When called via the Context Builder MCP tool from Claude Code, Cursor, etc.</span>

          <div className="flex flex-col gap-4 mt-3">
            {/* Allow Clarifying Questions MCP */}
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-semibold text-primary">Allow Clarifying Questions</span>
                <span className="text-xxs text-secondary">
                  Agent can ask questions during MCP runs
                </span>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={allowClarifyingQuestionsForMCP}
                  onChange={(e) => handleUpdateSetting("context_builder.allow_clarifying_questions_mcp", e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            {allowClarifyingQuestionsForMCP && (
              <div className="p-3 rounded-lg border mt-2 flex items-center gap-2.5 text-xxs" style={{ backgroundColor: "rgba(249, 115, 22, 0.08)", borderColor: "rgba(249, 115, 22, 0.2)", color: "var(--warning-color)" }}>
                <AlertTriangle size={14} className="flex-shrink-0 text-warning" />
                <span>
                  You must be watching RepoPrompt to respond. Questions timeout after {questionTimeoutSeconds < 60 ? `${questionTimeoutSeconds} sec` : `${questionTimeoutSeconds / 60} min`}.
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderAgentModels = () => {
    return (
      <div className="agent-models-settings animate-fade-in flex flex-col gap-4">
        {/* Recommendation Setup Banner */}
        <div className="settings-card glass flex items-center gap-3" style={{ borderLeft: "3px solid var(--success-color)", backgroundColor: "rgba(16, 185, 129, 0.03)" }}>
          <CheckCircle2 className="text-success" size={20} />
          <div>
            <span className="text-small font-semibold block">Agent models recommendation satisfied</span>
            <span className="text-xs text-secondary block">Oracle models, context builders, and MCP sub-agent configurations are synced.</span>
          </div>
        </div>

        {/* Oracle Model Selection Card */}
        <div className="settings-section-card">
          <div className="settings-section-card-title">
            <Brain size={16} className="text-accent" /> Oracle Model
          </div>
          <span className="settings-section-card-desc">
            Primary LLM model target for planning, context reviews, and ask_oracle workflows.
          </span>
          <div className="flex items-center gap-4">
            <select
              className="select-input"
              value={getSettingValue("models.planning_model", "Claude Sonnet 3.5")}
              onChange={(e) => handleUpdateSetting("models.planning_model", e.target.value)}
            >
              <option value="Claude Sonnet 3.5">Claude Sonnet 3.5</option>
              <option value="Claude Opus Latest">Claude Opus Latest</option>
              <option value="GPT-4o">GPT-4o</option>
              <option value="Gemini Pro 1.5">Gemini Pro 1.5</option>
              <option value="DeepSeek Chat">DeepSeek Chat</option>
            </select>
            <span className="text-xs text-secondary">Current target: {getSettingValue("models.planning_model", "Claude Sonnet 3.5")}</span>
          </div>
        </div>

        {/* Context Builder Agent Selection Card */}
        <div className="settings-section-card">
          <div className="settings-section-card-title">
            <Sparkles size={16} className="text-accent" /> Context Builder Agent
          </div>
          <span className="settings-section-card-desc">
            Default AI agent backend used to gather relevant code snippets and structure context queries.
          </span>
          <div className="form-row-2col">
            <div className="form-input-group">
              <label>CLI Agent Kind</label>
              <select
                className="select-input"
                value={getSettingValue("context_builder.agent", "claudeCode")}
                onChange={(e) => handleUpdateSetting("context_builder.agent", e.target.value)}
              >
                <option value="claudeCode">Claude Code CLI</option>
                <option value="codexExec">Codex CLI</option>
                <option value="openCode">OpenCode</option>
                <option value="cursor">Cursor</option>
              </select>
            </div>
            <div className="form-input-group">
              <label>Builder Model Target</label>
              <select
                className="select-input"
                value={getSettingValue("context_builder.model", "Claude Haiku")}
                onChange={(e) => handleUpdateSetting("context_builder.model", e.target.value)}
              >
                <option value="Claude Haiku">Claude Haiku</option>
                <option value="Claude Sonnet 3.5">Claude Sonnet 3.5</option>
                <option value="Gemini Flash 1.5">Gemini Flash 1.5</option>
                <option value="GPT-4o Mini">GPT-4o Mini</option>
              </select>
            </div>
          </div>
        </div>

        {/* Sub-Agent Role Defaults */}
        <div className="settings-section-card">
          <div className="settings-section-card-title">
            <Users size={16} className="text-accent" /> Sub-Agent Role Defaults
          </div>
          <span className="settings-section-card-desc">
            Default LLM configurations mapped to MCP agent roles (explore, engineer, pair, design).
          </span>
          <div className="flex flex-col gap-2" style={{ marginTop: "12px" }}>
            {Object.entries(subAgentRoles).map(([role, currentModel]) => (
              <div key={role} className="order-list-item" style={{ padding: "8px 14px", margin: 0 }}>
                <div className="order-list-item-label" style={{ fontSize: "12px" }}>
                  <span className="text-xs font-bold uppercase text-accent" style={{ width: "70px", display: "inline-block" }}>{role}</span>
                  <span className="text-secondary">Orchestration role preset</span>
                </div>
                <select
                  className="select-input"
                  style={{ minWidth: "180px" }}
                  value={currentModel}
                  onChange={(e) => setSubAgentRoles(prev => ({ ...prev, [role]: e.target.value }))}
                >
                  <option value="Claude Sonnet 3.5">Claude Sonnet 3.5</option>
                  <option value="Claude Haiku">Claude Haiku</option>
                  <option value="Codex">Codex</option>
                  <option value="Gemini Pro 1.5">Gemini Pro 1.5</option>
                  <option value="GPT-4o">GPT-4o</option>
                </select>
              </div>
            ))}
          </div>
        </div>

        {/* Advanced Expander */}
        <div className="settings-section-card">
          <button
            className="flex items-center gap-2 font-semibold text-small"
            style={{ background: "none", border: "none", color: "var(--text-primary)", cursor: "pointer", padding: 0 }}
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            <ChevronRight size={14} className={showAdvanced ? "expanded" : ""} style={{ transform: showAdvanced ? "rotate(90deg)" : "none", transition: "transform 0.15s" }} />
            Advanced Model Sync
          </button>

          {showAdvanced && (
            <div className="flex flex-col gap-4" style={{ marginTop: "16px", borderTop: "1px solid var(--border-color)", paddingTop: "16px" }}>
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1" style={{ maxWidth: "70%" }}>
                  <span className="text-xs font-semibold">Keep Chat Model Synced with Oracle</span>
                  <span className="text-xxs text-muted">Updates the default Chat panel model target automatically whenever the Oracle Planning target is updated.</span>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={getSettingValue("models.sync_chat_model_with_oracle", "true") === "true" || getSettingValue("models.sync_chat_model_with_oracle") === true}
                    onChange={(e) => handleUpdateSetting("models.sync_chat_model_with_oracle", e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              {!(getSettingValue("models.sync_chat_model_with_oracle") === true || getSettingValue("models.sync_chat_model_with_oracle") === "true") && (
                <div className="form-input-group">
                  <label>Built-in Chat UI Default Model</label>
                  <select
                    className="select-input"
                    value={getSettingValue("models.preferred_compose_model", "Claude Sonnet 3.5")}
                    onChange={(e) => handleUpdateSetting("models.preferred_compose_model", e.target.value)}
                  >
                    <option value="Claude Sonnet 3.5">Claude Sonnet 3.5</option>
                    <option value="Claude Haiku">Claude Haiku</option>
                    <option value="Gemini Pro 1.5">Gemini Pro 1.5</option>
                    <option value="GPT-4o">GPT-4o</option>
                  </select>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderAgentPermissions = () => {
    return (
      <div className="agent-permissions-settings animate-fade-in flex flex-col gap-4">
        {/* Scope segmented picker */}
        <div className="segmented-picker">
          <button
            className={`segmented-option ${permissionsScope === "directAgents" ? "active" : ""}`}
            onClick={() => setPermissionsScope("directAgents")}
          >
            Direct Agents
          </button>
          <button
            className={`segmented-option ${permissionsScope === "subagents" ? "active" : ""}`}
            onClick={() => setPermissionsScope("subagents")}
          >
            Sub-Agents (Safe Managed)
          </button>
        </div>

        {permissionsScope === "directAgents" ? (
          <div className="flex flex-col gap-4">
            {/* Codex Sandbox */}
            <div className="settings-section-card">
              <div className="settings-section-card-title">Codex Sandbox Configuration</div>
              <span className="settings-section-card-desc">Specify command-line safety limits when running Codex agents.</span>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold">Sandbox Execution Mode</label>
                <div className="segmented-picker" style={{ maxWidth: "320px" }}>
                  {["Isolated", "Safe Managed", "Native Host"].map((mode) => (
                    <button
                      key={mode}
                      className={`segmented-option ${codexSandboxLevel === mode ? "active" : ""}`}
                      onClick={() => setCodexSandboxLevel(mode)}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
                <span className="text-xxs text-muted">
                  {codexSandboxLevel === "Isolated" && "Strict Docker or container sandbox. No local OS file writes allowed."}
                  {codexSandboxLevel === "Safe Managed" && "Prompts user before mutating files or running arbitrary bash tasks."}
                  {codexSandboxLevel === "Native Host" && "Unchecked host access. Auto-approves command writes (Use with caution)."}
                </span>
              </div>
            </div>

            {/* Claude strict MCP */}
            <div className="settings-section-card flex items-center justify-between">
              <div className="flex flex-col gap-1" style={{ maxWidth: "70%" }}>
                <span className="settings-section-card-title" style={{ margin: 0 }}>Claude Strict MCP Mode</span>
                <span className="settings-section-card-desc" style={{ margin: 0 }}>Restricts Claude Code sub-agent client interactions exclusively to RepoPrompt's native context roots.</span>
              </div>
              <label className="toggle-switch">
                <input type="checkbox" checked={claudeStrictMcp} onChange={(e) => setClaudeStrictMcp(e.target.checked)} />
                <span className="toggle-slider"></span>
              </label>
            </div>

            {/* OpenCode ACP */}
            <div className="settings-section-card">
              <div className="settings-section-card-title">OpenCode (ACP) Session Mode</div>
              <span className="settings-section-card-desc">Policy rule mapping for tools invoked by OpenCode.</span>
              <select className="select-input" value={openCodeSessionMode} onChange={(e) => setOpenCodeSessionMode(e.target.value)}>
                <option value="Approval Required">Always Ask Approval</option>
                <option value="Safe Auto-Approve">Auto-Approve Read Commands</option>
                <option value="Unrestricted">Unrestricted (Always Auto-Approve)</option>
              </select>
            </div>

            {/* Cursor auto-approve */}
            <div className="settings-section-card flex items-center justify-between">
              <div className="flex flex-col gap-1" style={{ maxWidth: "70%" }}>
                <span className="settings-section-card-title" style={{ margin: 0 }}>Cursor ACP Auto-Approve</span>
                <span className="settings-section-card-desc" style={{ margin: 0 }}>Automatically grant tool execution permissions requested by Cursor sub-agents without prompting.</span>
              </div>
              <label className="toggle-switch">
                <input type="checkbox" checked={cursorAutoApprove} onChange={(e) => setCursorAutoApprove(e.target.checked)} />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Subagent sandbox policy */}
            <div className="settings-section-card">
              <div className="settings-section-card-title">Sub-Agent Global Policy</div>
              <span className="settings-section-card-desc">Tri-state sandbox rules for all sub-agents spawned via MCP.</span>
              <div className="segmented-picker" style={{ maxWidth: "360px" }}>
                {["Sandbox", "Safe Managed", "Unrestricted"].map((policy) => (
                  <button
                    key={policy}
                    className={`segmented-option ${subagentPolicy === policy ? "active" : ""}`}
                    onClick={() => setSubagentPolicy(policy)}
                  >
                    {policy}
                  </button>
                ))}
              </div>
            </div>

            {/* Allowed Capabilities Checklist */}
            <div className="settings-section-card">
              <div className="settings-section-card-title">Allowed Sub-Agent Capabilities</div>
              <span className="settings-section-card-desc">Individually toggle what sub-agents can do under "Safe Managed" policy.</span>
              <div className="flex flex-col gap-3" style={{ marginTop: "12px" }}>
                <label className="flex items-center gap-3" style={{ cursor: "pointer" }}>
                  <input type="checkbox" checked={subagentPerms.readFile} onChange={(e) => setSubagentPerms(prev => ({ ...prev, readFile: e.target.checked }))} />
                  <span className="text-xs font-semibold">Read Filesystem (glob, directory listing, read contents)</span>
                </label>
                <label className="flex items-center gap-3" style={{ cursor: "pointer" }}>
                  <input type="checkbox" checked={subagentPerms.writeFile} onChange={(e) => setSubagentPerms(prev => ({ ...prev, writeFile: e.target.checked }))} />
                  <span className="text-xs font-semibold">Write/Edit Workspace Files (patching and creation)</span>
                </label>
                <label className="flex items-center gap-3" style={{ cursor: "pointer" }}>
                  <input type="checkbox" checked={subagentPerms.execCommand} onChange={(e) => setSubagentPerms(prev => ({ ...prev, execCommand: e.target.checked }))} />
                  <span className="text-xs font-semibold">Execute Terminal Bash Commands (build/test loops)</span>
                </label>
                <label className="flex items-center gap-3" style={{ cursor: "pointer" }}>
                  <input type="checkbox" checked={subagentPerms.fetchUrl} onChange={(e) => setSubagentPerms(prev => ({ ...prev, fetchUrl: e.target.checked }))} />
                  <span className="text-xs font-semibold">Fetch URL Web Content (external document searches)</span>
                </label>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderAgentWorkflows = () => {
    const handleMoveWorkflow = (id: string, direction: number) => {
      const idx = featuredWorkflows.indexOf(id);
      if (idx === -1) return;
      const targetIdx = idx + direction;
      if (targetIdx < 0 || targetIdx >= featuredWorkflows.length) return;
      const copy = [...featuredWorkflows];
      copy[idx] = featuredWorkflows[targetIdx];
      copy[targetIdx] = id;
      setFeaturedWorkflows(copy);
    };

    const handleCreateWorkflow = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newWorkflowName.trim()) return;
      const id = newWorkflowName.toLowerCase().replace(/\s+/g, "-");
      setCustomWorkflows(prev => [
        ...prev,
        { id, name: newWorkflowName.trim(), description: "Custom markdown workflow definition." }
      ]);
      setNewWorkflowName("");
      setShowNewWorkflowModal(false);
    };

    return (
      <div className="agent-workflows-settings animate-fade-in flex flex-col gap-4">
        {/* Cleanup tips toggle */}
        <div className="settings-section-card flex items-center justify-between">
          <div className="flex flex-col gap-1" style={{ maxWidth: "75%" }}>
            <span className="settings-section-card-title" style={{ margin: 0 }}>Include Session Cleanup Guidance</span>
            <span className="settings-section-card-desc" style={{ margin: 0 }}>
              Appends clear instructions at the end of built-in workflows reminding the sub-agent to clean up and dismiss completed agent task sheets.
            </span>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={getSettingValue("agent_mode.show_built_in_workflow_cleanup_guidance", "true") === "true" || getSettingValue("agent_mode.show_built_in_workflow_cleanup_guidance") === true}
              onChange={(e) => handleUpdateSetting("agent_mode.show_built_in_workflow_cleanup_guidance", e.target.checked)}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>

        {/* Featured Workflows */}
        <div className="settings-section-card">
          <div className="settings-section-card-title">Featured Workflows</div>
          <span className="settings-section-card-desc">Workflows pinned to the Agent Mode home dashboard.</span>
          <div className="flex flex-col gap-2" style={{ marginTop: "12px" }}>
            {featuredWorkflows.map((flowId, idx) => {
              const name = flowId === "dev-preflight" ? "Developer Contribution Preflight" : "Vite Application Launch";
              return (
                <div key={flowId} className="order-list-item">
                  <div className="order-list-item-label">
                    <Zap size={14} className="text-accent" />
                    <span>{name}</span>
                  </div>
                  <div className="order-list-actions">
                    <button className="btn btn-secondary" style={{ padding: "4px" }} disabled={idx === 0} onClick={() => handleMoveWorkflow(flowId, -1)}>
                      <ArrowUp size={12} />
                    </button>
                    <button className="btn btn-secondary" style={{ padding: "4px" }} disabled={idx === featuredWorkflows.length - 1} onClick={() => handleMoveWorkflow(flowId, 1)}>
                      <ArrowDown size={12} />
                    </button>
                    <button className="btn btn-delete" style={{ padding: "4px" }} onClick={() => setFeaturedWorkflows(prev => prev.filter(f => f !== flowId))}>
                      <Trash size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Built-in Workflows */}
        <div className="settings-section-card">
          <div className="settings-section-card-title">Built-in Workflows</div>
          <span className="settings-section-card-desc">Toggle visibility or clone built-in workflows to customise prompt text.</span>
          <div className="flex flex-col gap-2" style={{ marginTop: "12px" }}>
            {[
              { id: "dev-run", name: "dev-run", desc: "Builds, packages, and launches the local debug app." },
              { id: "dev-build", name: "dev-build", desc: "Packages debug version without spawning app chrome." },
              { id: "dev-test", name: "dev-test", desc: "Coordinated daemon build and full packages test execution." }
            ].map((builtIn) => (
              <div key={builtIn.id} className="order-list-item" style={{ background: "transparent" }}>
                <div>
                  <span className="text-xs font-semibold block">{builtIn.name}</span>
                  <span className="text-xxs text-secondary block">{builtIn.desc}</span>
                </div>
                <div className="flex items-center gap-3">
                  <label className="toggle-switch" style={{ width: "32px", height: "16px" }}>
                    <input
                      type="checkbox"
                      checked={!!visibleWorkflows[builtIn.id]}
                      onChange={(e) => setVisibleWorkflows(prev => ({ ...prev, [builtIn.id]: e.target.checked }))}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                  <button className="btn btn-secondary" style={{ fontSize: "10px", padding: "2px 6px" }}>Clone</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Custom Workflows */}
        <div className="settings-section-card">
          <div className="flex justify-between items-center" style={{ marginBottom: "12px" }}>
            <span className="settings-section-card-title" style={{ margin: 0 }}>Custom Workflows</span>
            <button className="btn btn-primary flex items-center gap-1" style={{ fontSize: "11px", padding: "4px 8px" }} onClick={() => setShowNewWorkflowModal(true)}>
              <Plus size={12} /> Create Custom
            </button>
          </div>
          <span className="settings-section-card-desc">Markdown-driven custom workflow workflows.</span>

          <div className="flex flex-col gap-2">
            {customWorkflows.map((cw) => (
              <div key={cw.id} className="order-list-item">
                <div>
                  <span className="text-xs font-semibold block">{cw.name}</span>
                  <span className="text-xxs text-secondary block">{cw.description}</span>
                </div>
                <div className="flex gap-2">
                  <button className="btn btn-secondary" style={{ fontSize: "10px", padding: "2px 6px" }}>Edit Markdown</button>
                  <button className="btn btn-delete" style={{ padding: "4px" }} onClick={() => setCustomWorkflows(prev => prev.filter(c => c.id !== cw.id))}>
                    <Trash size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Create Workflow Modal */}
        {showNewWorkflowModal && (
          <div className="modal-overlay">
            <div className="modal-content glass" style={{ width: "360px", padding: "20px", background: "var(--bg-secondary)" }}>
              <h3 className="font-bold text-medium mb-3">Create Custom Workflow</h3>
              <form onSubmit={handleCreateWorkflow} className="flex flex-col gap-3">
                <div className="form-input-group">
                  <label>Workflow Name</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g. Clean & Build"
                    value={newWorkflowName}
                    onChange={(e) => setNewWorkflowName(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="flex gap-2 justify-end" style={{ marginTop: "12px" }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowNewWorkflowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Create</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderMCPTools = () => {
    return (
      <div className="mcp-tools-settings animate-fade-in flex flex-col gap-4">
        {/* Enable toggle */}
        <div className="settings-section-card flex items-center justify-between">
          <div className="flex flex-col gap-1" style={{ maxWidth: "75%" }}>
            <span className="settings-section-card-title" style={{ margin: 0 }}>Enable MCP Tools for this Window</span>
            <span className="settings-section-card-desc" style={{ margin: 0 }}>
              Allow external client integrations (like Cursor or VS Code) to call tools on this active workspace session.
            </span>
          </div>
          <label className="toggle-switch">
            <input type="checkbox" checked={mcpToolsEnabled} onChange={(e) => setMcpToolsEnabled(e.target.checked)} />
            <span className="toggle-slider"></span>
          </label>
        </div>

        {/* Search */}
        <div className="search-box-container" style={{ maxWidth: "320px" }}>
          <Search size={14} className="search-icon" />
          <input
            type="text"
            className="input search-input-field"
            placeholder="Search tools..."
            value={mcpToolsSearch}
            onChange={(e) => setMcpToolsSearch(e.target.value)}
          />
        </div>

        {/* Tools list */}
        <div className="settings-section-card">
          <div className="settings-section-card-title">Tool Availability</div>
          <div className="flex flex-col gap-2" style={{ marginTop: "12px" }}>
            {Object.entries(enabledMcpTools)
              .filter(([name]) => !mcpToolsSearch || name.toLowerCase().includes(mcpToolsSearch.toLowerCase()))
              .map(([name, enabled]) => (
                <div key={name} className="order-list-item" style={{ background: "transparent" }}>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-mono font-semibold">{name}</span>
                    <span className="text-xxs text-secondary">
                      {name === "read_file" && "Read content of a file from the local filesystem."}
                      {name === "write_file" && "Create or completely overwrite files."}
                      {name === "grep_search" && "Find exact pattern matches within directories using ripgrep."}
                      {name === "run_command" && "Execute shells/bash processes natively on the host system."}
                      {name === "ask_permission" && "Requests user approval after a permission failure."}
                      {!["read_file", "write_file", "grep_search", "run_command", "ask_permission"].includes(name) && "RepoPrompt CE native tool handler."}
                    </span>
                  </div>
                  <label className="toggle-switch" style={{ width: "32px", height: "16px" }}>
                    <input
                      type="checkbox"
                      checked={enabled}
                      disabled={!mcpToolsEnabled}
                      onChange={(e) => setEnabledMcpTools(prev => ({ ...prev, [name]: e.target.checked }))}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              ))}
          </div>
        </div>
      </div>
    );
  };

  const renderModelPresets = () => {
    return (
      <div className="model-presets-settings animate-fade-in flex flex-col gap-4">
        <div className="settings-section-card">
          <div className="settings-section-card-title">MCP Model Presets</div>
          <span className="settings-section-card-desc">Expose specific model configuration presets for sub-agent runs.</span>

          <div className="flex flex-col gap-3" style={{ marginTop: "12px" }}>
            {modelPresets.map((preset) => (
              <div key={preset.id} className="order-list-item">
                <div className="flex flex-col gap-1">
                  {editingPresetId === preset.id ? (
                    <input
                      type="text"
                      className="input"
                      style={{ fontSize: "12px", padding: "2px 6px" }}
                      value={preset.role}
                      onChange={(e) => setModelPresets(prev => prev.map(p => p.id === preset.id ? { ...p, role: e.target.value } : p))}
                      onBlur={() => setEditingPresetId(null)}
                      onKeyDown={(e) => e.key === "Enter" && setEditingPresetId(null)}
                      autoFocus
                    />
                  ) : (
                    <span className="text-xs font-semibold block cursor-pointer" onClick={() => setEditingPresetId(preset.id)}>
                      {preset.role.toUpperCase()} <span className="text-xxs text-muted">(Click to edit name)</span>
                    </span>
                  )}
                  <span className="text-xxs text-secondary">Preset target: {preset.model}</span>
                </div>
                <div className="flex items-center gap-3">
                  <select
                    className="select-input"
                    style={{ fontSize: "11px", padding: "2px 6px", minWidth: "140px" }}
                    value={preset.model}
                    onChange={(e) => setModelPresets(prev => prev.map(p => p.id === preset.id ? { ...p, model: e.target.value } : p))}
                  >
                    <option value="Claude Sonnet 3.5">Claude Sonnet 3.5</option>
                    <option value="Claude Haiku">Claude Haiku</option>
                    <option value="Claude Opus Latest">Claude Opus Latest</option>
                    <option value="Gemini Pro 1.5">Gemini Pro 1.5</option>
                    <option value="GPT-4o">GPT-4o</option>
                  </select>
                  <input
                    type="checkbox"
                    checked={preset.active}
                    onChange={(e) => setModelPresets(prev => prev.map(p => p.id === preset.id ? { ...p, active: e.target.checked } : p))}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderCustomAPI = () => {
    const [customURL, setCustomURL] = useState("https://api.together.xyz/v1");
    const [customKey, setCustomKey] = useState("••••••••");
    const [customModel, setCustomModel] = useState("mistralai/Mixtral-8x7B-Instruct-v0.1");
    const [customTokens, setCustomTokens] = useState("4096");
    const [contentTypeToggle, setContentTypeToggle] = useState(true);

    return (
      <div className="custom-api-settings animate-fade-in flex flex-col gap-4">
        <div className="settings-section-card">
          <div className="settings-section-card-title">OpenAI-Compatible Custom Provider</div>
          <span className="settings-section-card-desc">Hook up a third-party custom provider (e.g. Together AI, DeepInfra, local LM Studio).</span>

          <div className="flex flex-col gap-4" style={{ marginTop: "12px" }}>
            <div className="form-input-group">
              <label>Provider API Base URL</label>
              <input type="text" className="input" value={customURL} onChange={(e) => setCustomURL(e.target.value)} />
            </div>

            <div className="form-input-group">
              <label>Authorization API Key</label>
              <input type="password" className="input" value={customKey} onChange={(e) => setCustomKey(e.target.value)} />
            </div>

            <div className="form-input-group">
              <label>Default Model Name / ID</label>
              <input type="text" className="input" value={customModel} onChange={(e) => setCustomModel(e.target.value)} />
            </div>

            <div className="form-row-2col">
              <div className="form-input-group">
                <label>Max Output Tokens</label>
                <input type="text" className="input" value={customTokens} onChange={(e) => setCustomTokens(e.target.value)} />
              </div>
              <div className="form-input-group flex items-center justify-between" style={{ flexDirection: "row", alignSelf: "flex-end", height: "36px" }}>
                <label style={{ margin: 0 }}>Content-Type Header</label>
                <label className="toggle-switch" style={{ width: "32px", height: "16px" }}>
                  <input type="checkbox" checked={contentTypeToggle} onChange={(e) => setContentTypeToggle(e.target.checked)} />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            </div>

            <div className="flex gap-2 justify-end" style={{ marginTop: "12px" }}>
              <button className="btn btn-secondary" onClick={() => alert("Provider configuration deleted.")}>Delete Provider</button>
              <button className="btn btn-primary" onClick={() => alert("Custom provider validated and saved successfully!")}>Validate & Save</button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderModelConfig = () => {
    return (
      <div className="model-config-settings animate-fade-in flex flex-col gap-4">
        <div className="settings-section-card">
          <div className="settings-section-card-title">Model Configuration Overrides</div>
          <span className="settings-section-card-desc">Override native API parameters per individual LLM model targets.</span>

          <div className="flex flex-col gap-2" style={{ marginTop: "12px" }}>
            {[
              { id: "claude-sonnet-3.5", name: "Claude 3.5 Sonnet", provider: "Anthropic" },
              { id: "gpt-4o", name: "GPT-4o", provider: "OpenAI" },
              { id: "gemini-pro-1.5", name: "Gemini 1.5 Pro", provider: "Google" },
              { id: "deepseek-chat", name: "DeepSeek V3", provider: "DeepSeek" }
            ].map((model) => {
              const isExpanded = expandedModelConfig === model.id;
              const overrides = modelOverrides[model.id] || { diff: false, stream: true, responses: false, temp: 0.7 };
              return (
                <div key={model.id} className="provider-card-container" style={{ margin: 0 }}>
                  <div className="provider-card-header" style={{ padding: "10px 14px" }} onClick={() => setExpandedModelConfig(isExpanded ? null : model.id)}>
                    <div>
                      <span className="text-xs font-semibold block">{model.name}</span>
                      <span className="text-xxs text-muted">{model.provider}</span>
                    </div>
                    <ChevronDown size={14} style={{ transform: isExpanded ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
                  </div>
                  {isExpanded && (
                    <div className="provider-card-content" style={{ padding: "14px", borderTop: "1px solid var(--border-color)" }}>
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xxs font-semibold">Allow Diff Editing</span>
                          <label className="toggle-switch" style={{ width: "32px", height: "16px" }}>
                            <input
                              type="checkbox"
                              checked={overrides.diff}
                              onChange={(e) => setModelOverrides(prev => ({
                                ...prev,
                                [model.id]: { ...overrides, diff: e.target.checked }
                              }))}
                            />
                            <span className="toggle-slider"></span>
                          </label>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xxs font-semibold">Use Streaming</span>
                          <label className="toggle-switch" style={{ width: "32px", height: "16px" }}>
                            <input
                              type="checkbox"
                              checked={overrides.stream}
                              onChange={(e) => setModelOverrides(prev => ({
                                ...prev,
                                [model.id]: { ...overrides, stream: e.target.checked }
                              }))}
                            />
                            <span className="toggle-slider"></span>
                          </label>
                        </div>
                        <div className="flex flex-col gap-1">
                          <div className="flex justify-between items-center text-xxs font-semibold">
                            <span>Inference Temperature</span>
                            <span>{overrides.temp.toFixed(1)}</span>
                          </div>
                          <div className="slider-container">
                            <input
                              type="range"
                              min="0"
                              max="2"
                              step="0.1"
                              className="range-input"
                              value={overrides.temp}
                              onChange={(e) => setModelOverrides(prev => ({
                                ...prev,
                                [model.id]: { ...overrides, temp: Number(e.target.value) }
                              }))}
                            />
                            <button
                              className="btn btn-secondary"
                              style={{ fontSize: "8px", padding: "1px 4px" }}
                              onClick={() => setModelOverrides(prev => ({
                                ...prev,
                                [model.id]: { ...overrides, temp: 0.7 }
                              }))}
                            >
                              Reset
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderBenchmark = () => {
    const handleRunBenchmark = () => {
      setBenchmarkRunning(true);
      setBenchmarkProgress(0);
      setBenchmarkLogs(["Initializing planning benchmarks framework..."]);
      setBenchmarkScore(null);

      const phrases = [
        "Resolving target model configuration...",
        "Executing planning tasks (Task 1: Code translation)...",
        "Executing planning tasks (Task 2: Targeted refactor)...",
        "Analyzing tool call sequence correctness...",
        "Measuring output generation latency and token counts...",
        "Benchmark complete. Evaluating scores..."
      ];

      let currentStep = 0;
      const interval = setInterval(() => {
        currentStep += 1;
        setBenchmarkProgress(currentStep * 16.6);
        if (currentStep <= phrases.length) {
          setBenchmarkLogs(prev => [...prev, phrases[currentStep - 1]]);
        }
        if (currentStep >= 6) {
          clearInterval(interval);
          setBenchmarkRunning(false);
          setBenchmarkScore(88 + Math.floor(Math.random() * 8)); // Score between 88 and 95
        }
      }, 800);
    };

    return (
      <div className="benchmark-settings animate-fade-in flex flex-col gap-4">
        <div className="settings-section-card">
          <div className="settings-section-card-title">Oracle Diagnostics & Benchmarks</div>
          <span className="settings-section-card-desc">Evaluate the planning and tool-calling capacity of a selected model target.</span>

          <div className="benchmark-widget" style={{ marginTop: "12px" }}>
            <div className="form-input-group" style={{ maxWidth: "320px" }}>
              <label>Target Benchmark Model</label>
              <select className="select-input" value={benchmarkModel} onChange={(e) => setBenchmarkModel(e.target.value)}>
                <option value="models.planning_model">Active Planner Model ({getSettingValue("models.planning_model")})</option>
                <option value="claude-sonnet">Claude Sonnet 3.5</option>
                <option value="gpt-4o">GPT-4o</option>
                <option value="deepseek-v3">DeepSeek V3</option>
              </select>
            </div>

            <button
              className="btn btn-primary flex items-center gap-2"
              style={{ alignSelf: "flex-start" }}
              disabled={benchmarkRunning}
              onClick={handleRunBenchmark}
            >
              <Play size={12} /> {benchmarkRunning ? "Running..." : "Run Planning Benchmarks"}
            </button>

            {benchmarkRunning && (
              <div className="flex flex-col gap-2" style={{ marginTop: "12px" }}>
                <div className="progress-bar-container">
                  <div className="progress-bar-fill" style={{ width: `${benchmarkProgress}%` }}></div>
                </div>
                <div className="terminal-viewport" style={{ marginTop: "8px" }}>
                  <pre className="terminal-text-block">
                    {benchmarkLogs.map((log, i) => <div key={i}>{log}</div>)}
                  </pre>
                </div>
              </div>
            )}

            {benchmarkScore !== null && !benchmarkRunning && (
              <div className="benchmark-results-grid">
                <div className="benchmark-result-card">
                  <span className="meta-label">Overall Accuracy Score</span>
                  <span className="benchmark-score">{benchmarkScore}/100</span>
                </div>
                <div className="benchmark-result-card">
                  <span className="meta-label">Tool Call Correctness</span>
                  <span className="benchmark-score" style={{ color: "var(--success-color)" }}>96%</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderManageWorkspaces = () => {
    return (
      <div className="manage-workspaces-settings animate-fade-in flex flex-col gap-4">
        {/* Workspace directory lists */}
        <div className="settings-section-card">
          <div className="settings-section-card-title">Active Workspace Library</div>
          <span className="settings-section-card-desc">Workspace profiles and file indexing roots currently saved in the daemon store.</span>

          <div className="roots-list" style={{ marginTop: "12px" }}>
            {workspaces.length === 0 ? (
              <div className="empty-roots">No workspaces loaded.</div>
            ) : (
              workspaces.map((ws, i) => {
                const name = typeof ws === "string" ? ws : ws.name;
                const paths = typeof ws === "string" ? [] : (ws.allRepoPaths || []);
                return (
                  <div key={i} className="root-item flex justify-between items-center" style={{ margin: 0 }}>
                    <div className="flex items-center gap-2">
                      <Files size={14} className="text-accent" />
                      <div className="flex flex-col">
                        <span className="font-semibold text-small">{name}</span>
                        <span className="text-xxs text-secondary">{paths.length} workspace folders configured</span>
                      </div>
                    </div>
                    <button className="btn btn-delete" onClick={() => alert("Delete workspace profile action triggered.")}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderManagePresets = () => {
    return (
      <div className="manage-presets-settings animate-fade-in flex flex-col gap-4">
        <div className="settings-section-card">
          <div className="settings-section-card-title">Workspace Configuration Presets</div>
          <span className="settings-section-card-desc">Configure default templated presets to pre-populate folders scanning and ignore limits when launching new projects.</span>
          <div className="roots-list" style={{ marginTop: "12px" }}>
            <div className="root-item flex justify-between items-center" style={{ margin: 0 }}>
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-accent" />
                <div className="flex flex-col">
                  <span className="font-semibold text-small">Standard Workspace Preset</span>
                  <span className="text-xxs text-secondary">Respects .gitignore, excludes node_modules, .git, and .build.</span>
                </div>
              </div>
              <button className="btn btn-secondary" style={{ fontSize: "10px", padding: "2px 6px" }}>Edit Template</button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderUpdates = () => {
    const handleCheckForUpdates = () => {
      setCheckingForUpdates(true);
      setUpdateStatusText("Reaching release channels...");
      setTimeout(() => {
        setCheckingForUpdates(false);
        setUpdateStatusText("RepoPrompt CE is up to date. (Current version: " + currentVersion + ")");
      }, 1200);
    };

    return (
      <div className="updates-settings animate-fade-in flex flex-col gap-4">
        <div className="settings-section-card">
          <div className="settings-section-card-title">Application Update Manager</div>
          <span className="settings-section-card-desc">Check for new releases of RepoPrompt Community Edition.</span>

          <div className="flex flex-col gap-4" style={{ marginTop: "12px" }}>
            <div className="form-input-group" style={{ maxWidth: "320px" }}>
              <label>Update Release Channel</label>
              <select className="select-input" value={updateChannel} onChange={(e) => setUpdateChannel(e.target.value)}>
                <option value="stable">Stable releases only</option>
                <option value="beta">Beta / early features access</option>
                <option value="alpha">Alpha builds (developer testing)</option>
              </select>
            </div>

            <div className="flex items-center gap-3">
              <button
                className="btn btn-primary flex items-center gap-2"
                disabled={checkingForUpdates}
                onClick={handleCheckForUpdates}
              >
                {checkingForUpdates ? <Loader2 size={12} className="animate-spin" /> : <ArrowDownCircle size={12} />}
                Check for Updates
              </button>
              <span className="text-xs text-secondary">{updateStatusText}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderKeyboardShortcuts = () => {
    const handleRecordShortcut = (key: string) => {
      setRecordingShortcut(key);
      const listener = (e: KeyboardEvent) => {
        e.preventDefault();
        e.stopPropagation();

        let modifierStr = "";
        if (e.metaKey) modifierStr += "⌘ ";
        if (e.ctrlKey) modifierStr += "⌃ ";
        if (e.altKey) modifierStr += "⌥ ";
        if (e.shiftKey) modifierStr += "⇧ ";

        let keyChar = e.key.toUpperCase();
        if (e.key === "ArrowUp") keyChar = "↑";
        if (e.key === "ArrowDown") keyChar = "↓";
        if (e.key === "ArrowLeft") keyChar = "←";
        if (e.key === "ArrowRight") keyChar = "→";
        if (e.key === "Escape") keyChar = "Esc";

        if (e.key !== "Meta" && e.key !== "Control" && e.key !== "Alt" && e.key !== "Shift") {
          const combo = modifierStr + keyChar;
          setShortcuts(prev => ({ ...prev, [key]: combo }));
          setRecordingShortcut(null);
          window.removeEventListener("keydown", listener, true);
        }
      };
      window.addEventListener("keydown", listener, true);
    };

    return (
      <div className="keyboard-shortcuts-settings animate-fade-in flex flex-col gap-4">
        {/* Enable shortcuts */}
        <div className="settings-section-card flex items-center justify-between">
          <div className="flex flex-col gap-1" style={{ maxWidth: "75%" }}>
            <span className="settings-section-card-title" style={{ margin: 0 }}>Enable Global Keyboard Shortcuts</span>
            <span className="settings-section-card-desc" style={{ margin: 0 }}>
              Allow keyboard triggers to summon RepoPrompt or compile files from any application context.
            </span>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={getSettingValue("ui.enable_keyboard_shortcuts") === true || getSettingValue("ui.enable_keyboard_shortcuts") === "true"}
              onChange={(e) => handleUpdateSetting("ui.enable_keyboard_shortcuts", e.target.checked)}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>

        {/* Bindings */}
        <div className="settings-section-card">
          <div className="settings-section-card-title">Shortcut Bindings Catalog</div>
          <span className="settings-section-card-desc">Click any record button to listen for a new keystroke sequence.</span>

          <div className="flex flex-col gap-3" style={{ marginTop: "12px" }}>
            {[
              { id: "agent-new", title: "New Agent Chat", section: "Agent Mode" },
              { id: "toggle-sidebar", title: "Toggle Session Sidebar", section: "Agent Mode" },
              { id: "save-ws", title: "Save Workspace Settings", section: "Workspace" },
              { id: "tab-new", title: "New Agent Session Tab", section: "Tabs" }
            ].map((shortcut) => {
              const keysCombo = shortcuts[shortcut.id] || "None";
              const isRecording = recordingShortcut === shortcut.id;
              return (
                <div key={shortcut.id} className="order-list-item">
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold">{shortcut.title}</span>
                    <span className="text-xxs text-muted">{shortcut.section} shortcut override</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="kbd-cap">{isRecording ? "Listening..." : keysCombo}</span>
                    <button
                      className="btn btn-secondary"
                      style={{ fontSize: "10px", padding: "2px 6px" }}
                      disabled={recordingShortcut !== null}
                      onClick={() => handleRecordShortcut(shortcut.id)}
                    >
                      Record
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderChatSettings = () => {
    return (
      <div className="chat-settings animate-fade-in flex flex-col gap-4">
        <div className="settings-section-card">
          <div className="settings-section-card-title">Chat System Prompts</div>
          <span className="settings-section-card-desc">Set custom planning system prompts or guidelines for LLMs when editing files.</span>
          <div className="form-input-group" style={{ marginTop: "12px" }}>
            <label>Plan System Instructions</label>
            <textarea
              className="input textarea-input"
              rows={4}
              placeholder="e.g. You are an expert programmer. Follow targeted edit rules."
              value={getSettingValue("models.custom_planning_prompt", "")}
              onChange={(e) => handleUpdateSetting("models.custom_planning_prompt", e.target.value)}
            />
          </div>
        </div>
      </div>
    );
  };

  const renderWorkflowPresets = () => {
    return (
      <div className="workflow-presets-settings animate-fade-in flex flex-col gap-4">
        <div className="settings-section-card">
          <div className="settings-section-card-title">Shared Presets Directory</div>
          <span className="settings-section-card-desc">Templated presets visible in your sidebar workspace selection.</span>
          <div className="roots-list" style={{ marginTop: "12px" }}>
            <div className="root-item flex justify-between items-center" style={{ margin: 0 }}>
              <div className="flex items-center gap-2">
                <SlidersHorizontal size={14} className="text-accent" />
                <div className="flex flex-col">
                  <span className="font-semibold text-small">Quick Code-Audit Preset</span>
                  <span className="text-xxs text-secondary">Pre-populated instructions checklist.</span>
                </div>
              </div>
              <button className="btn btn-secondary" style={{ fontSize: "10px", padding: "2px 6px" }}>Edit Preset</button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderPromptOrder = () => {
    const handleMoveOrder = (id: string, direction: number) => {
      const idx = promptOrder.findIndex(p => p.id === id);
      if (idx === -1) return;
      const targetIdx = idx + direction;
      if (targetIdx < 0 || targetIdx >= promptOrder.length) return;
      const copy = [...promptOrder];
      copy[idx] = promptOrder[targetIdx];
      copy[targetIdx] = promptOrder[idx];
      setPromptOrder(copy);
    };

    return (
      <div className="prompt-order-settings animate-fade-in flex flex-col gap-4">
        <div className="settings-section-card">
          <div className="settings-section-card-title">Copy Prompt Block Sequence</div>
          <span className="settings-section-card-desc">Define the exact layout ordering of compiled markdown blocks when copy-packaging prompts.</span>

          <div className="flex flex-col gap-2" style={{ marginTop: "12px" }}>
            {promptOrder.map((block, idx) => (
              <div key={block.id} className="order-list-item">
                <div className="order-list-item-label">
                  <ListCollapse size={14} className="text-accent" />
                  <span>{block.label}</span>
                </div>
                <div className="order-list-actions">
                  <button className="btn btn-secondary" style={{ padding: "4px" }} disabled={idx === 0} onClick={() => handleMoveOrder(block.id, -1)}>
                    <ArrowUp size={12} />
                  </button>
                  <button className="btn btn-secondary" style={{ padding: "4px" }} disabled={idx === promptOrder.length - 1} onClick={() => handleMoveOrder(block.id, 1)}>
                    <ArrowDown size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderWorkspaceApprovals = () => {
    return (
      <div className="workspaces-settings-view animate-fade-in">
        {/* Active Workspace Folders */}
        <div className="settings-card glass" style={{ padding: "20px", borderRadius: "10px", border: "1px solid var(--border-color)", marginBottom: "20px" }}>
          <h3>Active Workspace Directory Roots</h3>
          <p className="text-secondary mb-3">Folders included as active search and context roots in this session.</p>

          <div className="roots-list mb-4">
            {roots.length === 0 ? (
              <div className="empty-roots">
                <span>No folders loaded in workspace context.</span>
              </div>
            ) : (
              roots.map((r, i) => {
                const pathOnly = r.includes("→") ? r.split("→")[1]?.trim() : r.trim();
                const label = r.includes("→") ? r.split("→")[0]?.trim() : pathOnly;
                return (
                  <div key={i} className="root-item flex justify-between items-center" style={{ margin: 0 }}>
                    <div className="flex items-center gap-2">
                      <HardDrive size={14} className="text-accent" />
                      <div className="flex flex-col">
                        <span className="font-semibold text-small">{label}</span>
                        <code className="text-muted text-xs">{pathOnly}</code>
                      </div>
                    </div>
                    <button
                      className="btn-delete"
                      onClick={() => handleRemoveWorkspaceFolder(pathOnly)}
                      title="Remove folder path from active workspace"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          <form onSubmit={handleAddFolder} className="add-folder-row">
            <input
              type="text"
              className="input"
              placeholder="Add folder absolute path (e.g. C:\Users\...)"
              value={newFolderPath}
              onChange={(e) => setNewFolderPath(e.target.value)}
            />
            <button type="submit" className="btn btn-primary flex items-center gap-1">
              <Plus size={14} /> Add Folder
            </button>
          </form>
        </div>

        {/* Workspace List from Daemon */}
        <div className="settings-card glass" style={{ padding: "20px", borderRadius: "10px", border: "1px solid var(--border-color)" }}>
          <h3>Workspace Library Index</h3>
          <p className="text-secondary mb-3">Saved workspace profiles indexed by the local daemon.</p>
          <div className="workspaces-library-grid">
            {workspaces.map((ws) => {
              const name = typeof ws === "string" ? ws : ws.name;
              const paths = typeof ws === "string" ? [] : (ws.allRepoPaths || []);
              return (
                <div key={name} className="workspace-library-card">
                  <span className="ws-title font-semibold">{name}</span>
                  <span className="ws-paths-count text-muted text-xs">
                    {paths.length} folder root{paths.length !== 1 ? 's' : ''} saved
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderDefaultSettingsList = () => {
    return (
      <div className="settings-form">
        {filteredSettings.length === 0 ? (
          <div className="empty-settings">
            <span>No settings matches found.</span>
          </div>
        ) : (
          filteredSettings.map((s) => {
            const isSaving = !!savingKeys[s.key];
            return (
              <div key={s.key} className="settings-row border-bottom">
                <div className="settings-row-label">
                  <label className="setting-name">{s.name}</label>
                  {s.description && <span className="setting-desc">{s.description}</span>}
                  <span className="setting-key text-muted"><code>{s.key}</code></span>
                </div>
                <div className="settings-row-input">
                  {renderSettingInput(s)}
                  {isSaving && (
                    <span className="saving-indicator animate-fade-in">
                      <Loader2 className="animate-spin text-accent" size={14} />
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    );
  };

  const activeItem = sidebarGroups.flatMap(g => g.items).find(item => item.id === activeSection);
  const isSupported = activeItem ? activeItem.supported !== false : true;

  return (
    <div className="settings-layout">
      {/* Settings Panel Sidebar */}
      <div className="settings-sidebar border-right">
        <div className="search-box-container">
          <Search size={14} className="search-icon" />
          <input
            type="text"
            className="input search-input-field"
            placeholder="Search Settings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="clear-btn" onClick={() => setSearchQuery("")}>
              <X size={14} />
            </button>
          )}
        </div>

        <div className="settings-categories">
          {sidebarGroups.map((group) => (
            <div key={group.title} className="settings-sidebar-group">
              <div className="settings-sidebar-header">{group.title}</div>
              {group.items.map((item) => (
                <button
                  key={item.id}
                  className={`category-btn ${activeSection === item.id && !searchQuery ? 'active' : ''}`}
                  onClick={() => {
                    setActiveSection(item.id);
                    setSearchQuery("");
                  }}
                >
                  {item.icon}
                  <span>{item.label}</span>
                  {!item.supported && <span className="wip-badge">WIP</span>}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Settings Form Work Area */}
      <div className="settings-content scrollbar-custom">
        {loading ? (
          <div className="settings-loading">
            <Loader2 className="animate-spin text-accent" size={24} />
            <span>Syncing app preferences...</span>
          </div>
        ) : (
          <div className="settings-scroll-container">
            {searchQuery ? (
              <div className="search-results-header">
                <h2>Search Results</h2>
                <p>Showing matches for &ldquo;{searchQuery}&rdquo;</p>
              </div>
            ) : (
              <div className="settings-section-header">
                <h2>{getTabDisplayName(activeSection)}</h2>
                <p className="section-desc text-secondary">
                  {activeSection === "agent_mode" && "Workflows, logging, and diagnostics defaults for agent runs."}
                  {activeSection === "cli_providers" && "Configure external agent providers and CLI launch paths."}
                  {activeSection === "agent_models" && "Map models to agent types and configure local system defaults."}
                  {activeSection === "agent_permissions" && "Configure direct permissions and subagent operation rules."}
                  {activeSection === "agent_workflows" && "Manage custom agent execution workflows and featured prompts."}
                  {activeSection === "context_builder" && "Configure model overrides and settings for context builder compilation."}
                  {activeSection === "mcp" && "MCP configurations, recommend presets, and tool preferences."}
                  {activeSection === "mcp_tools" && "Inspect registered tools and configure per-tool execution properties."}
                  {activeSection === "workspace_approvals" && "Configure workspace directories, project mappings, and active roots."}
                  {activeSection === "model_presets" && "Manage custom model presets for MCP servers and direct tasks."}
                  {activeSection === "models" && "Configure API keys for OpenAI, Anthropic, Gemini, DeepSeek, and built-in model overrides."}
                  {activeSection === "openrouter" && "Set OpenRouter API Key and configure model availability rules."}
                  {activeSection === "custom_api" && "Set up custom OpenAI-compatible endpoints and credentials."}
                  {activeSection === "model_config" && "Custom system instructions and model parameter overrides."}
                  {activeSection === "benchmark" && "Run automated benchmark tasks to verify model planning capability."}
                  {activeSection === "manage_workspaces" && "Create, delete, and list workspace definitions."}
                  {activeSection === "manage_presets" && "Configure workspace default configuration templates."}
                  {activeSection === "ui" && "Configure appearance, fonts, tooltips, and file packaging layout options."}
                  {activeSection === "updates" && "Check for software updates and configure release channels."}
                  {activeSection === "keyboard_shortcuts" && "Global keyboard bindings to summon RepoPrompt or run tasks."}
                  {activeSection === "advanced" && "Configure repository ignore rules, empty folder visibility, and other file substrate settings."}
                  {activeSection === "chat_settings" && "Configure default chat UI layouts, prompts, and auto-completions."}
                  {activeSection === "workflow_presets" && "Manage shared presets for chat templates and copy workflows."}
                  {activeSection === "prompt_order" && "Configure sequencing of markdown fields inside compiled prompts."}
                </p>
              </div>
            )}

            {/* Unsupported / Planned Tabs View */}
            {!isSupported && !searchQuery ? (
              <div className="unsupported-tab-view animate-fade-in">
                <div className="settings-card glass">
                  <div className="unsupported-icon-container">
                    <AlertTriangle size={24} className="text-warning animate-pulse" />
                  </div>
                  <h3>Planned Feature Parity</h3>
                  <p className="text-secondary mb-4">
                    The &ldquo;{getTabDisplayName(activeSection)}&rdquo; panel exists in the macOS SwiftUI client but is not yet active in the Vite React port.
                  </p>
                  <div className="badge-row flex justify-center gap-2">
                    <span className="badge badge-warning">Port WIP</span>
                    <span className="badge badge-secondary">Daemon API Ready</span>
                  </div>
                </div>
              </div>
            ) : searchQuery ? (
              renderDefaultSettingsList()
            ) : activeSection === "agent_mode" ? (
              <div className="overview-dashboard animate-fade-in">
                {/* Oracle Model */}
                <button className="dashboard-row" onClick={() => setActiveSection("agent_models")}>
                  <div className="dashboard-icon">
                    <Brain size={18} />
                  </div>
                  <div className="dashboard-content">
                    <div className="dashboard-title">Oracle Model</div>
                    <div className="dashboard-desc">
                      The analysis model for planning and review. Reasons over your current file selection and chat history — no tools, no file edits. Currently: {getSettingValue("models.planning_model", "Claude Sonnet 4.5")}.
                    </div>
                  </div>
                  <ChevronRight size={16} className="dashboard-chevron" />
                </button>

                {/* Context Builder Agent */}
                <button className="dashboard-row" onClick={() => setActiveSection("agent_models")}>
                  <div className="dashboard-icon">
                    <Sparkles size={18} />
                  </div>
                  <div className="dashboard-content">
                    <div className="dashboard-title">Context Builder Agent</div>
                    <div className="dashboard-desc">
                      Curates Oracle's file selection. Explores your codebase and aggregates the most relevant files so Oracle can reason efficiently when producing plans. Currently: {getSettingValue("context_builder.agent", "Claude Code")} · {getSettingValue("context_builder.model", "Opus Latest")}.
                    </div>
                  </div>
                  <ChevronRight size={16} className="dashboard-chevron" />
                </button>

                {/* Sub-Agent Role Defaults */}
                <button className="dashboard-row" onClick={() => setActiveSection("agent_models")}>
                  <div className="dashboard-icon">
                    <Users size={18} />
                  </div>
                  <div className="dashboard-content">
                    <div className="dashboard-title">Sub-Agent Role Defaults</div>
                    <div className="dashboard-desc">
                      Preset models per orchestration role. Pair is the primary worker — pick your smartest model here. Design handles UI and copy work. Explore and Engineer fill out the rest of the lineup.
                    </div>
                  </div>
                  <ChevronRight size={16} className="dashboard-chevron" />
                </button>

                {/* CLI Providers */}
                <button className="dashboard-row" onClick={() => setActiveSection("cli_providers")}>
                  <div className="dashboard-icon">
                    <Terminal size={18} />
                  </div>
                  <div className="dashboard-content">
                    <div className="dashboard-title">CLI Providers</div>
                    <div className="dashboard-desc">
                      Connect a CLI agent (Claude Code, Codex, OpenCode, Cursor) to run anything in Agent Mode.
                    </div>
                    <div className="dashboard-chips">
                      <div className={`status-chip ${isKeyConfigured("keys.openai") ? "connected" : "disconnected"}`}>
                        <div className="status-dot"></div>
                        <span>Codex CLI</span>
                      </div>
                      <div className={`status-chip ${isKeyConfigured("keys.anthropic") ? "connected" : "disconnected"}`}>
                        <div className="status-dot"></div>
                        <span>Claude Code</span>
                      </div>
                      <div className={`status-chip ${isKeyConfigured("keys.openai") ? "connected" : "disconnected"}`}>
                        <div className="status-dot"></div>
                        <span>OpenCode</span>
                      </div>
                      <div className={`status-chip ${isKeyConfigured("keys.openai") ? "connected" : "disconnected"}`}>
                        <div className="status-dot"></div>
                        <span>Cursor CLI</span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight size={16} className="dashboard-chevron" />
                </button>

                {/* Agent Permissions Grouped */}
                <div className="permissions-group-card">
                  <div className="permissions-group-header">
                    <div className="dashboard-icon">
                      <Lock size={18} />
                    </div>
                    <div>
                      <div className="dashboard-title" style={{ marginBottom: "2px" }}>Agent Permissions</div>
                      <div className="dashboard-desc">
                        Permission controls for agents you run directly, plus the sandbox policy for sub-agents launched through MCP.
                      </div>
                    </div>
                  </div>

                  <div className="permissions-sub-list border-top" style={{ paddingTop: "8px", marginTop: "8px" }}>
                    {/* Direct Agents */}
                    <button className="permissions-sub-row" onClick={() => setActiveSection("agent_permissions")}>
                      <ShieldCheck size={14} className="permissions-sub-icon" />
                      <div className="dashboard-content">
                        <div className="dashboard-title" style={{ fontSize: "13px" }}>Direct Agents</div>
                        <div className="dashboard-desc" style={{ fontSize: "11px" }}>
                          Claude Bash, Codex sandbox, ACP session mode, and MCP strict mode for agents you run directly from RepoPrompt.
                        </div>
                      </div>
                      <ChevronRight size={12} className="dashboard-chevron" />
                    </button>

                    {/* Sub-Agents */}
                    <button className="permissions-sub-row" onClick={() => setActiveSection("agent_permissions")}>
                      <ShieldCheck size={14} className="permissions-sub-icon" />
                      <div className="dashboard-content">
                        <div className="dashboard-title" style={{ fontSize: "13px" }}>Sub-Agents (Safe Managed)</div>
                        <div className="dashboard-desc" style={{ fontSize: "11px" }}>
                          Sub-agents launched through MCP run with Safe Managed overrides by default.
                        </div>
                      </div>
                      <ChevronRight size={12} className="dashboard-chevron" />
                    </button>
                  </div>
                </div>

                {/* Context Builder Budgets & Timeouts */}
                <button className="dashboard-row" onClick={() => setActiveSection("context_builder")}>
                  <div className="dashboard-icon">
                    <FileCode size={18} />
                  </div>
                  <div className="dashboard-content">
                    <div className="dashboard-title">Context Builder Budgets & Timeouts</div>
                    <div className="dashboard-desc">
                      Token budgets, enhancement mode, and clarifying-question behavior for the Context Builder agent.
                    </div>
                  </div>
                  <ChevronRight size={16} className="dashboard-chevron" />
                </button>

                {/* Agent Workflows */}
                <button className="dashboard-row" onClick={() => setActiveSection("agent_workflows")}>
                  <div className="dashboard-icon">
                    <Zap size={18} />
                  </div>
                  <div className="dashboard-content">
                    <div className="dashboard-title">Agent Workflows</div>
                    <div className="dashboard-desc">
                      Manage built-in workflow visibility, featured workflows, custom markdown workflows, and cleanup guidance. Cleanup guidance is currently {getSettingValue("agent_mode.show_built_in_workflow_cleanup_guidance") === true ? "On" : "Off"}.
                    </div>
                  </div>
                  <ChevronRight size={16} className="dashboard-chevron" />
                </button>
              </div>
            ) : activeSection === "cli_providers" ? (
              renderCLIProviders()
            ) : activeSection === "agent_models" ? (
              renderAgentModels()
            ) : activeSection === "agent_permissions" ? (
              renderAgentPermissions()
            ) : activeSection === "agent_workflows" ? (
              renderAgentWorkflows()
            ) : activeSection === "context_builder" ? (
              renderContextBuilder()
            ) : activeSection === "mcp_tools" ? (

              renderMCPTools()
            ) : activeSection === "model_presets" ? (
              renderModelPresets()
            ) : activeSection === "custom_api" ? (
              renderCustomAPI()
            ) : activeSection === "model_config" ? (
              renderModelConfig()
            ) : activeSection === "benchmark" ? (
              renderBenchmark()
            ) : activeSection === "manage_workspaces" ? (
              renderManageWorkspaces()
            ) : activeSection === "manage_presets" ? (
              renderManagePresets()
            ) : activeSection === "updates" ? (
              renderUpdates()
            ) : activeSection === "keyboard_shortcuts" ? (
              renderKeyboardShortcuts()
            ) : activeSection === "chat_settings" ? (
              renderChatSettings()
            ) : activeSection === "workflow_presets" ? (
              renderWorkflowPresets()
            ) : activeSection === "prompt_order" ? (
              renderPromptOrder()
            ) : activeSection === "workspace_approvals" ? (
              renderWorkspaceApprovals()
            ) : (
              renderDefaultSettingsList()
            )}
          </div>
        )}
      </div>
    </div>
  );
}
