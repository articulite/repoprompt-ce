import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { WebSocketServer } from "ws";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function mcpBridgePlugin() {
  return {
    name: "mcp-bridge",
    configureServer(server: any) {
      const wss = new WebSocketServer({ noServer: true });

      server.httpServer?.on("upgrade", (request: any, socket: any, head: any) => {
        const url = new URL(request.url || "", `http://${request.headers.host}`);
        if (url.pathname === "/mcp") {
          wss.handleUpgrade(request, socket, head, (ws) => {
            wss.emit("connection", ws, request);
          });
        }
      });

      wss.on("connection", (ws) => {
        console.log("[MCP Bridge] WebSocket client connected");
        const cliPath = path.resolve(__dirname, "../.build/debug/repoprompt-mcp");
        console.log(`[MCP Bridge] Spawning CLI at: ${cliPath}`);

        const child = spawn(cliPath, [], {
          cwd: path.resolve(__dirname, ".."),
          env: { ...process.env },
        });

        let stdoutBuffer = "";
        child.stdout.on("data", (data) => {
          stdoutBuffer += data.toString();
          let newlineIndex;
          while ((newlineIndex = stdoutBuffer.indexOf("\n")) !== -1) {
            const line = stdoutBuffer.slice(0, newlineIndex).trim();
            stdoutBuffer = stdoutBuffer.slice(newlineIndex + 1);
            if (line) {
              ws.send(line);
            }
          }
        });

        child.stderr.on("data", (data) => {
          console.error(`[MCP CLI Stderr]: ${data.toString().trim()}`);
        });

        ws.on("message", (message) => {
          child.stdin.write(message.toString() + "\n");
        });

        ws.on("close", () => {
          console.log("[MCP Bridge] WebSocket client disconnected");
          child.kill();
        });

        child.on("close", (code) => {
          console.log(`[MCP Bridge] CLI process exited with code ${code}`);
          ws.close();
        });

        child.on("error", (err) => {
          console.error("[MCP Bridge] CLI process error:", err);
          ws.close();
        });
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), mcpBridgePlugin()],
  server: {
    port: 5173,
    host: "0.0.0.0", // Allow connection from Windows host browser
  },
});
