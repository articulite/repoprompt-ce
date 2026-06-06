import { AlertTriangle, ArrowRight } from "lucide-react";

interface ApprovalOverlaysProps {
  showConnectionError: boolean;
  onRetry: () => void;
}

export default function ApprovalOverlays({ showConnectionError, onRetry }: ApprovalOverlaysProps) {
  if (!showConnectionError) return null;

  return (
    <div className="overlay-portal animate-fade-in">
      <div className="overlay-card glass">
        <div className="icon-badge warning-badge">
          <AlertTriangle size={32} />
        </div>

        <h2>WSL Daemon Connection Warning</h2>
        <p className="description">
          The GUI client lost connection to the guest-side Swift execution daemon (`RepoPromptDaemon`) inside WSL 2.
        </p>

        <div className="info-box">
          <h3>Common Troubleshooting Steps:</h3>
          <ul>
            <li>Ensure the daemon is running in WSL (run: `wsl make dev-run` or `.build/debug/RepoPromptDaemon`)</li>
            <li>Check if the socket `~/.repoprompt/repoprompt_bootstrap.sock` is active in WSL</li>
            <li>Confirm the Vite development server has permission to bind to loopback endpoints</li>
          </ul>
        </div>

        <div className="action-buttons">
          <button className="btn btn-secondary" onClick={() => window.location.reload()}>
            Reload Browser Page
          </button>
          <button className="btn btn-primary" onClick={onRetry}>
            Attempt Reconnection <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
