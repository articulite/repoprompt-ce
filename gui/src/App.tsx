import { useState, useEffect } from "react";
import { mcpClient } from "./mcpClient";
import { safeParseJSON } from "./utils";
import WorkspaceEntryView from "./components/WorkspaceEntryView";
import MainShell from "./components/MainShell";
import ApprovalOverlays from "./components/ApprovalOverlays";

function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [activeWorkspace, setActiveWorkspace] = useState<string | null>(null);
  const [showErrorOverlay, setShowErrorOverlay] = useState(false);

  useEffect(() => {
    // Register status callbacks
    mcpClient.onConnect(() => {
      setIsConnected(true);
      setShowErrorOverlay(false);
      checkActiveWorkspace();
    });

    mcpClient.onDisconnect(() => {
      setIsConnected(false);
      // Wait 5 seconds before showing connection error overlay
      setTimeout(() => {
        setIsConnected((current) => {
          if (!current) {
            setShowErrorOverlay(true);
          }
          return current;
        });
      }, 5000);
    });
  }, []);

  const checkActiveWorkspace = async () => {
    try {
      // Find out if a workspace is already loaded in the daemon
      const res = await mcpClient.callTool("workspace_context", {});
      if (res && !res.isError && res.content && res.content[0]?.text) {
        const text = res.content[0].text;
        // Parse loaded roots or workspace names
        if (text.includes("Loaded roots:") && !text.includes("No workspace is currently loaded")) {
          // A workspace is loaded! Let's query list to match its name
          const listRes = await mcpClient.callTool("manage_workspaces", { action: "list" });
          if (listRes && !listRes.isError && listRes.content && listRes.content[0]?.text) {
            const parsed = safeParseJSON(listRes.content[0].text);
            const activeWS = parsed?.workspaces?.find((ws: any) => ws.showingWindowIDs?.length > 0);
            if (activeWS) {
              setActiveWorkspace(activeWS.name);
            } else if (parsed?.workspaces?.length > 0) {
              // Fall back to first workspace
              setActiveWorkspace(parsed.workspaces[0].name);
            } else {
              setActiveWorkspace("Active Workspace");
            }
          }
        }
      }
    } catch (err) {
      console.error("Failed to check workspace context", err);
    }
  };

  const handleWorkspaceSelected = (name: string) => {
    setActiveWorkspace(name);
  };

  const handleExitWorkspace = () => {
    setActiveWorkspace(null);
  };

  const handleRetryConnection = () => {
    window.location.reload();
  };

  return (
    <>
      {!activeWorkspace ? (
        <WorkspaceEntryView
          onWorkspaceSelected={handleWorkspaceSelected}
          isConnected={isConnected}
        />
      ) : (
        <MainShell
          workspaceName={activeWorkspace}
          onExitWorkspace={handleExitWorkspace}
          isConnected={isConnected}
        />
      )}

      <ApprovalOverlays
        showConnectionError={showErrorOverlay}
        onRetry={handleRetryConnection}
      />
    </>
  );
}

export default App;
