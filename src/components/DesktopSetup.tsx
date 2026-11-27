import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  CircleHelp,
  Monitor,
  Radio,
  Wifi,
  WifiOff,
  XCircle,
} from 'lucide-react';

type OverlayStatus = {
  connected: boolean;
  message: string;
};

const HOST_STORAGE_KEY = 'kabaddi-overlay-controller-host';
const PORT_STORAGE_KEY = 'kabaddi-overlay-controller-port';

export function DesktopSetup() {
  const [host, setHost] = useState(() => {
    try {
      return localStorage.getItem(HOST_STORAGE_KEY) || '';
    } catch {
      return '';
    }
  });
  const [port, setPort] = useState(() => {
    try {
      return localStorage.getItem(PORT_STORAGE_KEY) || '8765';
    } catch {
      return '8765';
    }
  });
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState<OverlayStatus>({
    connected: false,
    message: 'Not connected',
  });

  useEffect(() => {
    const unsubscribe = window.kabaddiDesktop?.onOverlayStatus((nextStatus) => {
      setStatus(nextStatus);
    });
    return () => unsubscribe?.();
  }, []);

  const handleOpenOverlay = async () => {
    const cleanHost = host.trim();
    const cleanPort = Number(port);

    if (!cleanHost) {
      setError('Enter the IP address of the computer running your Kabaddi scoreboard.');
      return;
    }
    if (!/^[a-zA-Z0-9.-]+$/.test(cleanHost) || cleanHost.includes('..')) {
      setError('Enter a valid IP address or computer hostname. Do not include ws://.');
      return;
    }
    if (!Number.isInteger(cleanPort) || cleanPort < 1 || cleanPort > 65535) {
      setError('Port must be a number between 1 and 65535.');
      return;
    }

    if (!window.kabaddiDesktop) {
      setError('Run the installed Windows application to open the transparent overlay window.');
      return;
    }

    setBusy(true);
    setError('');
    try {
      const result = await window.kabaddiDesktop.openOverlay(cleanHost, cleanPort);
      if (!result.ok) {
        setError(result.message || 'Could not open the overlay window.');
        return;
      }

      try {
        localStorage.setItem(HOST_STORAGE_KEY, cleanHost);
        localStorage.setItem(PORT_STORAGE_KEY, String(cleanPort));
      } catch {
        // The connection still works if local storage is unavailable.
      }

      setOverlayOpen(true);
      setStatus({
        connected: false,
        message: `Overlay opened. Connecting to ${cleanHost}:${cleanPort}…`,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open overlay.');
    } finally {
      setBusy(false);
    }
  };

  const handleCloseOverlay = async () => {
    setBusy(true);
    try {
      await window.kabaddiDesktop?.closeOverlay();
      setOverlayOpen(false);
      setStatus({ connected: false, message: 'Overlay closed' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="setup-page">
      <div className="setup-shell">
        <header className="setup-header">
          <div className="brand-mark"><Radio size={23} /></div>
          <div>
            <p className="eyebrow">SV MEDIA · BROADCAST TOOLS</p>
            <h1>Kabaddi Scoreboard Overlay</h1>
            <p className="header-subtitle">Connect your existing scoreboard controller to OBS.</p>
          </div>
        </header>

        <section className="setup-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">CONNECTION</p>
              <h2>Scoreboard computer</h2>
            </div>
            <span className={status.connected ? 'status-pill status-connected' : 'status-pill'}>
              <span className="status-dot" />
              {status.connected ? 'CONNECTED' : overlayOpen ? 'WAITING' : 'OFFLINE'}
            </span>
          </div>

          <label className="field-label" htmlFor="controller-host">IP address</label>
          <input
            id="controller-host"
            className="setup-input"
            type="text"
            autoComplete="off"
            spellCheck={false}
            placeholder="Example: 192.168.1.101"
            value={host}
            onChange={(event) => setHost(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') void handleOpenOverlay();
            }}
          />
          <p className="field-help">
            Enter the IP address of the laptop running your existing Python Kabaddi scoreboard.
            On the same PC, use <code>127.0.0.1</code>.
          </p>

          <label className="field-label" htmlFor="controller-port">WebSocket port</label>
          <input
            id="controller-port"
            className="setup-input port-input"
            type="number"
            min="1"
            max="65535"
            value={port}
            onChange={(event) => setPort(event.target.value)}
          />
          <p className="field-help">Your existing Python scoreboard uses port 8765.</p>

          {error && (
            <div className="error-message" role="alert">
              <XCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <div className="connection-status">
            {status.connected ? <Wifi size={18} /> : <WifiOff size={18} />}
            <span>{status.message}</span>
          </div>

          <div className="action-row">
            <button
              className="primary-action"
              type="button"
              onClick={() => void handleOpenOverlay()}
              disabled={busy}
            >
              <Monitor size={17} />
              {busy ? 'Opening…' : overlayOpen ? 'Reconnect / Update IP' : 'Connect & Open Overlay'}
            </button>
            <button
              className="secondary-action"
              type="button"
              onClick={() => void handleCloseOverlay()}
              disabled={busy || !overlayOpen}
            >
              Close
            </button>
          </div>
        </section>

        <section className="setup-card howto-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">OBS STUDIO</p>
              <h2>Add it to your stream</h2>
            </div>
            <Monitor size={21} className="muted-icon" />
          </div>
          <ol className="steps-list">
            <li><span>1</span><p>Start your existing Python Kabaddi scoreboard on the controller laptop.</p></li>
            <li><span>2</span><p>Enter that computer's IP address above and click <strong>Connect & Open Overlay</strong>.</p></li>
            <li><span>3</span><p>In OBS, add a <strong>Window Capture</strong> source.</p></li>
            <li><span>4</span><p>Select <strong>Kabaddi Scoreboard Overlay</strong>. Keep it above your camera or match video source.</p></li>
          </ol>
          <div className="tip-box">
            <CircleHelp size={17} />
            <p>Both computers must be on the same reachable network. Allow inbound TCP port 8765 through Windows Firewall on the controller laptop.</p>
          </div>
        </section>

        <footer className="setup-footer">
          <span><CheckCircle2 size={14} /> Overlay only — no score controls or duplicate scoreboard</span>
          <span>SV MEDIA</span>
        </footer>
      </div>
    </div>
  );
}
