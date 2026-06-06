import React, { useState, useEffect } from "react";
import {
  Sliders, Terminal, Layers, Cpu, Folder, FileCode,
  Search, X, Loader2, HardDrive, Plus, Trash2
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
}

export default function SettingsPanel({ isConnected, roots, onRefreshRoots }: SettingsPanelProps) {
  const [activeSection, setActiveSection] = useState<string>("agent_mode");
  const [searchQuery, setSearchQuery] = useState("");
  const [settings, setSettings] = useState<SettingItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingKeys, setSavingKeys] = useState<Record<string, boolean>>({});
  const [newFolderPath, setNewFolderPath] = useState("");
  const [workspaces, setWorkspaces] = useState<any[]>([]);

  useEffect(() => {
    if (isConnected) {
      fetchSettings();
      fetchWorkspaces();
    }
  }, [isConnected]);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await mcpClient.callTool("app_settings", { op: "list", detailed: true });
      if (res && !res.isError && res.content && res.content[0]?.text) {
        // Parse settings output
        // The output of app_settings list detailed=true is markdown-ish or plain text structured.
        // Wait, is there a way to get the settings as raw JSON?
        // Let's check the CLI help again: "rpce-cli-debug --raw-json" is CLI option,
        // but for tool call, does it return JSON or structured text?
        // Let's call the tool and see how we can parse it, or check if the tool returns a JSON string in content.
        // Wait, the MCP tool returns a text representation by default. Let's look at the output we got from the run_command:
        // "## App Settings ✅\n- **Scope**: all groups • 32 settings..."
        // Ah! The tool returns structured markdown.
        // Wait! Let's check if we can call "get" operation with a group name, e.g. {"op": "get", "group": "ui"}, does it return JSON?
        // Let's run a test in WSL using repoprompt-mcp to see what get returns!
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Wait! Let's define the settings catalog explicitly so we don't have to parse markdown!
  // We can fetch the current values using op="get" for each group:
  // ui, prompt_packaging, models, context_builder, mcp, code_maps, file_system, agent_mode.
  // And the get operation returns a clean JSON object!
  // Let's verify this. Let's fetch settings by calling app_settings get for each group.
  const fetchAllSettings = async () => {
    setLoading(true);
    const groups = ["ui", "prompt_packaging", "models", "context_builder", "mcp", "code_maps", "file_system", "agent_mode"];
    const loadedSettings: SettingItem[] = [];

    try {
      for (const group of groups) {
        const res = await mcpClient.callTool("app_settings", { op: "get", group });
        if (res && !res.isError && res.content && res.content[0]?.text) {
          const parsed = safeParseJSON(res.content[0].text);
          if (parsed && typeof parsed === "object") {
            Object.entries(parsed).forEach(([subKey, value]) => {
              const fullKey = `${group}.${subKey}`;
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

  useEffect(() => {
    if (isConnected) {
      fetchAllSettings();
    }
  }, [isConnected]);

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
    // Check if the user really wants to remove it
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
          description: "Default daemon CLI agent backend driver.",
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

  const getSectionIcon = (section: string) => {
    switch (section) {
      case "agent_mode": return <Terminal size={16} />;
      case "mcp": return <Layers size={16} />;
      case "models": return <Cpu size={16} />;
      case "workspaces": return <Folder size={16} />;
      case "file_system": return <FileCode size={16} />;
      default: return <Sliders size={16} />;
    }
  };

  const getSectionDisplayName = (section: string) => {
    switch (section) {
      case "agent_mode": return "Agent Mode";
      case "mcp": return "MCP & Approvals";
      case "models": return "Models & Providers";
      case "workspaces": return "Workspaces";
      case "file_system": return "File System";
      case "ui": return "Appearance UI";
      case "prompt_packaging": return "Prompt Packaging";
      default: return section.toUpperCase();
    }
  };

  // Filter settings based on active tab or search query
  const filteredSettings = settings.filter(s => {
    // If search query is active, ignore active section and search everywhere
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return (
        s.name.toLowerCase().includes(query) ||
        s.key.toLowerCase().includes(query) ||
        s.description.toLowerCase().includes(query)
      );
    }
    // Otherwise filter by section
    if (activeSection === "ui") {
      return s.group === "ui" || s.group === "prompt_packaging";
    }
    return s.group === activeSection;
  });

  // Unique sections list from loaded settings + manual additions (workspaces)
  const sections = Array.from(new Set(settings.map(s => s.group === "prompt_packaging" ? "ui" : s.group)));
  if (!sections.includes("workspaces")) {
    sections.push("workspaces");
  }

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
          {sections.map((sec) => (
            <button
              key={sec}
              className={`category-btn ${activeSection === sec && !searchQuery ? 'active' : ''}`}
              onClick={() => {
                setActiveSection(sec);
                setSearchQuery("");
              }}
            >
              {getSectionIcon(sec)}
              <span>{getSectionDisplayName(sec)}</span>
            </button>
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
                <h2>{getSectionDisplayName(activeSection)}</h2>
                <p className="section-desc text-secondary">
                  {activeSection === "agent_mode" && "Workflows, logging, and diagnostics defaults for agent runs."}
                  {activeSection === "mcp" && "MCP configurations, recommend presets, and approval controls."}
                  {activeSection === "models" && "Planning endpoints, Compose Chat overrides, and API parameters."}
                  {activeSection === "workspaces" && "Configure workspace directories, project mappings, and active roots."}
                  {activeSection === "file_system" && "Configure repository gitignore checks, patterns, and folder filters."}
                  {activeSection === "ui" && "Configure appearance, fonts, tooltips, and file packaging layout options."}
                </p>
              </div>
            )}

            {/* Workspaces Specific Tab */}
            {activeSection === "workspaces" && !searchQuery ? (
              <div className="workspaces-settings-view">
                {/* Active Workspace Folders */}
                <div className="settings-card glass">
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
                          <div key={i} className="root-item flex justify-between items-center">
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
                    <button type="submit" className="btn btn-primary">
                      <Plus size={14} /> Add Folder
                    </button>
                  </form>
                </div>

                {/* Workspace List from Daemon */}
                <div className="settings-card glass">
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
            ) : (
              /* Settings Items List */
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
            )}
          </div>
        )}
      </div>
    </div>
  );
}
