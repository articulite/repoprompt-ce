type ResolveFn = (value: any) => void;
type RejectFn = (reason: any) => void;

export interface MCPTool {
  name: string;
  description?: string;
  inputSchema: {
    type: string;
    properties?: Record<string, any>;
    required?: string[];
  };
}

export interface MCPCallResult {
  content: Array<{
    type: string;
    text?: string;
    data?: string;
    mimeType?: string;
  }>;
  isError?: boolean;
}

class MCPClient {
  private ws: WebSocket | null = null;
  private nextId = 1;
  private pendingRequests = new Map<number, { resolve: ResolveFn; reject: RejectFn }>();
  private listeners = new Set<(message: any) => void>();
  private onConnectCallbacks = new Set<() => void>();
  private onDisconnectCallbacks = new Set<() => void>();

  constructor() {
    this.connect();
  }

  private connect() {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/mcp`;
    console.log(`[MCP] Connecting to ${wsUrl}`);

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log("[MCP] Connected");
      this.onConnectCallbacks.forEach((cb) => cb());
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("[MCP] Received:", data);

        if (data.id !== undefined && this.pendingRequests.has(data.id)) {
          const { resolve, reject } = this.pendingRequests.get(data.id)!;
          this.pendingRequests.delete(data.id);
          if (data.error) {
            reject(data.error);
          } else {
            resolve(data.result);
          }
        } else {
          this.listeners.forEach((listener) => listener(data));
        }
      } catch (err) {
        console.error("[MCP] Failed to parse message:", event.data, err);
      }
    };

    this.ws.onclose = () => {
      console.log("[MCP] Disconnected. Reconnecting in 3 seconds...");
      this.onDisconnectCallbacks.forEach((cb) => cb());
      setTimeout(() => this.connect(), 3000);
    };

    this.ws.onerror = (err) => {
      console.error("[MCP] Socket error:", err);
    };
  }

  public onConnect(cb: () => void) {
    this.onConnectCallbacks.add(cb);
    if (this.ws?.readyState === WebSocket.OPEN) {
      cb();
    }
  }

  public onDisconnect(cb: () => void) {
    this.onDisconnectCallbacks.add(cb);
  }

  public addListener(cb: (message: any) => void) {
    this.listeners.add(cb);
  }

  public removeListener(cb: (message: any) => void) {
    this.listeners.delete(cb);
  }

  public sendRequest(method: string, params: any = {}): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error("WebSocket is not connected"));
        return;
      }

      const id = this.nextId++;
      const requestPayload = {
        jsonrpc: "2.0",
        id,
        method,
        params,
      };

      this.pendingRequests.set(id, { resolve, reject });
      console.log("[MCP] Sending:", requestPayload);
      this.ws.send(JSON.stringify(requestPayload));
    });
  }

  public async callTool(name: string, args: any = {}): Promise<MCPCallResult> {
    // Always request raw JSON output from the ToolOutputFormatter
    // so we get structured data instead of Markdown text.
    const argsWithRawJSON = { ...args, _rawJSON: true };
    return this.sendRequest("tools/call", {
      name,
      arguments: argsWithRawJSON,
    });
  }

  public async listTools(): Promise<{ tools: MCPTool[] }> {
    return this.sendRequest("tools/list");
  }
}

export const mcpClient = new MCPClient();
