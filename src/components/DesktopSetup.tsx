import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Clipboard,
  Copy,
  ExternalLink,
  Info,
  Monitor,
  Radio,
  Server,
  Square,
  Wifi,
} from 'lucide-react';

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
  const [serverRunning, setServerRunning] = useState(false);
  const [sourceUrl, setSourceUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const unsubscribe = window.kabaddiDesktop?.onServerStopped(() => {
      setServerRunning(false);
      setSourceUrl('');
      setNotice('Local overlay server stopped.');
    });
    return () => unsubscribe?.();
  }, []);

  const startServer = async () => {
    const cleanHost = host.trim();
    const cleanPort = Number(port);

    if (!cleanHost) {
      setError('Enter the IP address of the computer running your existing Python Kabaddi scoreboard.');
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
      setError('Open the installed Windows application to start its local Browser Source server.');
      return;
    }

    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await window.kabaddiDesktop.startOverlayServer(cleanHost, cleanPort);
      if (!result.ok || !result.url) {
        setError(result.message || 'Could not start the local overlay server.');
        return;
      }

      try {
        localStorage.setItem(HOST_STORAGE_KEY, cleanHost);
        localStorage.setItem(PORT_STORAGE_KEY, String(cleanPort));
      } catch {
        // The URL remains available for this session if local storage is disabled.
      }

      setSourceUrl(result.url);
      setServerRunning(true);
      setNotice(result.message || 'Overlay page is ready for OBS.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start the local overlay server.');
    } finally {
      setBusy(false);
    }
  };

  const stopServer = async () => {
    setBusy(true);
    try {
      await window.kabaddiDesktop?.stopOverlayServer();
      setServerRunning(false);
      setSourceUrl('');
      setNotice('Local overlay server stopped.');
    } finally {
      setBusy(false);
    }
  };

  const copyUrl = async () => {
    if (!sourceUrl || !window.kabaddiDesktop) return;
    const result = await window.kabaddiDesktop.copyText(sourceUrl);
    setNotice(result.ok ? 'OBS Browser Source URL copied.' : 'Could not copy URL.');
  };

  return (
    <div className="setup-page">
      <div className="setup-shell">
        <header className="setup-header">
          <div className="brand-mark"><Radio size={23} /></div>
          <div>
            <p className="eyebrow">SV MEDIA · BROADCAST TOOLS</p>
            <h1>Kabaddi Scoreboard Overlay</h1>
            <p className="header-subtitle">A background service for your OBS Browser Source.</p>
          </div>
        </header>

        <section className="setup-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">PYTHON CONTROLLER</p>
              <h2>Connect to scoreboard computer</h2>
            </div>
            <span className={serverRunning ? 'status-pill status-connected' : 'status-pill'}>
              <span className="status-dot" />
              {serverRunning ? 'SERVICE READY' : 'STOPPED'}
            </span>
          </div>

          <label className="field-label" htmlFor="controller-host">Scoreboard computer IP address</label>
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
              if (event.key === 'Enter') void startServer();
            }}
          />
          <p className="field-help">
            Enter the IP of the laptop running your existing Python Kabaddi scoreboard.
            For testing on this same PC, use <code>127.0.0.1</code>.
          </p>

          <label className="field-label" htmlFor="controller-port">Python WebSocket port</label>
          <input
            id="controller-port"
            className="setup-input port-input"
            type="number"
            min="1"
            max="65535"
            value={port}
            onChange={(event) => setPort(event.target.value)}
          />
          <p className="field-help">Keep this at 8765 for your current Python scoreboard.</p>

          {error && <div className="error-message" role="alert">{error}</div>}
          {notice && <div className="connection-status"><Wifi size={17} /><span>{notice}</span></div>}

          <div className="action-row">
            <button
              className="primary-action"
              type="button"
              onClick={() => void startServer()}
              disabled={busy}
            >
              <Server size={17} />
              {busy ? 'Starting…' : serverRunning ? 'Update IP / Refresh URL' : 'Start Overlay Service'}
            </button>
            <button
              className="secondary-action"
              type="button"
              onClick={() => void stopServer()}
              disabled={busy || !serverRunning}
              title="Stop the local OBS Browser Source server"
            >
              <Square size={15} /> Stop
            </button>
          </div>

          {sourceUrl && (
            <div className="browser-url-panel">
              <div className="browser-url-heading">
                <span>OBS BROWSER SOURCE URL</span>
                <span className="url-ready"><CheckCircle2 size={13} /> READY</span>
              </div>
              <div className="browser-url-value">{sourceUrl}</div>
              <button className="copy-url-button" type="button" onClick={() => void copyUrl()}>
                <Copy size={15} /> Copy OBS URL
              </button>
            </div>
          )}
        </section>

        <section className="setup-card howto-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">OBS STUDIO</p>
              <h2>Use it in your stream</h2>
            </div>
            <Monitor size={21} className="muted-icon" />
          </div>
          <ol className="steps-list">
            <li><span>1</span><p>Start your existing Python Kabaddi scoreboard on the operator computer.</p></li>
            <li><span>2</span><p>Enter its IP address above, keep port <strong>8765</strong>, then click <strong>Start Overlay Service</strong>.</p></li>
            <li><span>3</span><p>Copy the generated URL and add a <strong>Browser Source</strong> in OBS. Paste the URL there.</p></li>
            <li><span>4</span><p>Set Browser Source dimensions to <strong>1920 × 1080</strong> and keep its background transparent.</p></li>
          </ol>
          <div className="tip-box">
            <Info size={17} />
            <p>The scoreboard graphic will appear inside OBS only. It will not cover your Windows desktop. Close this settings window to send the app to the system tray; the local server will keep running.</p>
          </div>
        </section>

        <footer className="setup-footer">
          <span><CheckCircle2 size={14} /> Overlay only · No duplicate scoreboard controller</span>
          <span>SV MEDIA</span>
        </footer>
      </div>
    </div>
  );
}
