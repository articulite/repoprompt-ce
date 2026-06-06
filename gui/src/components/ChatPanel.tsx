import React, { useState, useEffect, useRef } from "react";
import { Send, User, Brain, AlertCircle, Coins, Loader2 } from "lucide-react";
import { mcpClient } from "../mcpClient";

interface Message {
  role: "user" | "assistant" | "system";
  text: string;
  timestamp: Date;
}

interface ChatPanelProps {
  isConnected: boolean;
}

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

  useEffect(() => {
    if (isConnected) {
      loadAgents();
    }
  }, [isConnected]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

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
        const parsed = JSON.parse(res.content[0].text);
        if (parsed.task_labels) {
          setRoles(parsed.task_labels);
          // Auto select first role label
          if (parsed.task_labels.length > 0) {
            setSelectedRole(parsed.task_labels[0].label);
          }
        }
      }
    } catch (err) {
      console.error("Failed to list roles", err);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading || !isConnected) return;

    const userPrompt = input.trim();
    setInput("");
    setError(null);
    setLoading(true);

    // Add user message
    setMessages((prev) => [
      ...prev,
      { role: "user", text: userPrompt, timestamp: new Date() },
    ]);

    try {
      // Start the run synchronously (detach: false)
      const res = await mcpClient.callTool("agent_run", {
        op: "start",
        message: userPrompt,
        model_id: selectedRole,
        detach: false,
      });

      if (res.isError) {
        setError(res.content?.[0]?.text || "Agent run encountered an error.");
      } else if (res.content && res.content[0]?.text) {
        // Parse results
        const text = res.content[0].text;
        let assistantReply = text;

        try {
          const parsedResult = JSON.parse(text);
          if (parsedResult.summary) {
            assistantReply = parsedResult.summary;
          }
          if (parsedResult.usage) {
            // Update token counters
            const inT = parsedResult.usage.input_tokens || 0;
            const outT = parsedResult.usage.output_tokens || 0;
            const computedCost = inT * 0.000003 + outT * 0.000015; // Estimator
            setTokenCost({
              inputTokens: inT,
              outputTokens: outT,
              cost: Number(computedCost.toFixed(4)),
            });
          }
        } catch (e) {
          // Keep as plain text if it failed to parse
        }

        setMessages((prev) => [
          ...prev,
          { role: "assistant", text: assistantReply, timestamp: new Date() },
        ]);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to communicate with agent run tool.");
    } finally {
      setLoading(false);
    }
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
              <span className="bubble-text">{msg.text}</span>
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

            {/* Input field */}
            <input
              type="text"
              className="input"
              placeholder={isConnected ? "Ask code questions or run refactoring..." : "Waiting for connection..."}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading || !isConnected}
            />

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
