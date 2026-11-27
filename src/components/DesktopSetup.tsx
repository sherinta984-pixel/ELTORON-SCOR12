import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Copy,
  Download,
  Info,
  Monitor,
  Radio,
  Server,
  Square,
  Wifi,
} from 'lucide-react';

type OverlayDesign = 'exact' | 'turbo';

const HOST_STORAGE_KEY = 'kabaddi-overlay-controller-host';
const PORT_STORAGE_KEY = 'kabaddi-overlay-controller-port';
const HALF_LABEL_STORAGE_KEY = 'kabaddi-overlay-half-label';
const DESIGN_STORAGE_KEY = 'kabaddi-overlay-design';

const VMIX_SCRIPTS = [
  { command: 'IN', file: 'Turbo_Overlay_IN.vb', title: 'Overlay IN', key: 'Your chosen key' },
  { command: 'OUT', file: 'Turbo_Overlay_OUT.vb', title: 'Overlay OUT', key: 'Your chosen key' },
  { command: 'TEAM_A_MINUS', file: 'Team_A_Player_Minus.vb', title: 'Team A · Player −', key: 'Your chosen key' },
  { command: 'TEAM_A_PLUS', file: 'Team_A_Player_Plus.vb', title: 'Team A · Player +', key: 'Your chosen key' },
  { command: 'TEAM_B_MINUS', file: 'Team_B_Player_Minus.vb', title: 'Team B · Player −', key: 'Your chosen key' },
  { command: 'TEAM_B_PLUS', file: 'Team_B_Player_Plus.vb', title: 'Team B · Player +', key: 'Your chosen key' },
];

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
  const [halfLabel, setHalfLabel] = useState(() => {
    try {
      return localStorage.getItem(HALF_LABEL_STORAGE_KEY) ?? '1ST HALF';
    } catch {
      return '1ST HALF';
    }
  });
  const [design, setDesign] = useState<OverlayDesign>(() => {
    try {
      return localStorage.getItem(DESIGN_STORAGE_KEY) === 'turbo' ? 'turbo' : 'exact';
    } catch {
      return 'exact';
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
    const cleanLabel = halfLabel.trim();

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
    if (cleanLabel.length > 18) {
      setError('Half-time label must be 18 characters or fewer.');
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
      const result = await window.kabaddiDesktop.startOverlayServer(
        cleanHost,
        cleanPort,
        design,
        cleanLabel,
      );
      if (!result.ok || !result.url) {
        setError(result.message || 'Could not start the local overlay server.');
        return;
      }

      try {
        localStorage.setItem(HOST_STORAGE_KEY, cleanHost);
        localStorage.setItem(PORT_STORAGE_KEY, String(cleanPort));
        localStorage.setItem(HALF_LABEL_STORAGE_KEY, cleanLabel);
        localStorage.setItem(DESIGN_STORAGE_KEY, design);
      } catch {
        // The generated URL is still usable for this session.
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

  const copyText = async (value: string, successMessage: string) => {
    if (!window.kabaddiDesktop) return;
    const result = await window.kabaddiDesktop.copyText(value);
    setNotice(result.ok ? successMessage : 'Could not copy text.');
  };

  const sourceBase = sourceUrl ? sourceUrl.slice(0, sourceUrl.indexOf('/overlay')) : '';
  const vmixBaseUrl = sourceBase ? `${sourceBase}/vmix?cmd=` : '';

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
          <p className="field-help">Keep this at 8765 for your existing Python scoreboard.</p>

          <label className="field-label" htmlFor="overlay-design">Scoreboard design</label>
          <select
            id="overlay-design"
            className="setup-input design-select"
            value={design}
            onChange={(event) => setDesign(event.target.value as OverlayDesign)}
          >
            <option value="exact">Design 1 — SV MEDIA Cyber Armour</option>
            <option value="turbo">Design 2 — Turbo Crystal · vMix controls</option>
          </select>
          <p className="field-help">
            Design 1 keeps its original animation and layout. Design 2 adds its own mechanical reveal,
            player counters and vMix key controls.
          </p>

          <label className="field-label" htmlFor="half-time-label">Half-time / period label</label>
          <input
            id="half-time-label"
            className="setup-input"
            type="text"
            maxLength={18}
            autoComplete="off"
            placeholder="1ST HALF, 2ND HALF, FINAL"
            value={halfLabel}
            onChange={(event) => setHalfLabel(event.target.value)}
          />
          <p className="field-help">
            This label appears on the selected design. Enter text such as 1ST HALF, 2ND HALF,
            QUARTER 1 or FINAL.
          </p>

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
              {busy ? 'Starting…' : serverRunning ? 'Update Settings / Refresh URL' : 'Start Overlay Service'}
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
              <button
                className="copy-url-button"
                type="button"
                onClick={() => void copyText(sourceUrl, 'OBS Browser Source URL copied.')}
              >
                <Copy size={15} /> Copy OBS URL
              </button>
            </div>
          )}
        </section>

        {design === 'turbo' && (
          <section className="setup-card vmix-card">
            <div className="section-heading">
              <div>
                <p className="eyebrow">DESIGN 2 ONLY</p>
                <h2>vMix animation & player controls</h2>
              </div>
              <Monitor size={21} className="muted-icon" />
            </div>

            <p className="field-help vmix-intro">
              Download these six VB.NET scripts, add each one under vMix Settings → Scripting,
              then create a Shortcut with Function <strong>ScriptStart</strong> and assign a key.
              The four player scripts affect only the Turbo design and keep each count between 0 and 7.
            </p>

            <div className="vmix-script-group">
              <h3>Animation</h3>
              {VMIX_SCRIPTS.slice(0, 2).map((script) => (
                <div className="vmix-script-row" key={script.command}>
                  <div>
                    <strong>{script.title}</strong>
                    <span>{script.file}</span>
                  </div>
                  {sourceBase && (
                    <a
                      className="script-download"
                      href={`${sourceBase}/vmix-scripts/${script.file}`}
                      download
                    >
                      <Download size={14} /> Download
                    </a>
                  )}
                </div>
              ))}
            </div>

            <div className="vmix-script-group">
              <h3>Players on court · Four separate keys</h3>
              {VMIX_SCRIPTS.slice(2).map((script) => (
                <div className="vmix-script-row" key={script.command}>
                  <div>
                    <strong>{script.title}</strong>
                    <span>{script.file}</span>
                  </div>
                  {sourceBase && (
                    <a
                      className="script-download"
                      href={`${sourceBase}/vmix-scripts/${script.file}`}
                      download
                    >
                      <Download size={14} /> Download
                    </a>
                  )}
                </div>
              ))}
            </div>

            {vmixBaseUrl && (
              <div className="vmix-endpoint-panel">
                <div className="browser-url-heading">
                  <span>VMIX COMMAND BASE URL</span>
                  <span className="url-ready"><CheckCircle2 size={13} /> LOCAL</span>
                </div>
                <div className="browser-url-value">{vmixBaseUrl}[COMMAND]</div>
                <button
                  className="copy-url-button"
                  type="button"
                  onClick={() => void copyText(vmixBaseUrl, 'vMix command base URL copied.')}
                >
                  <Copy size={15} /> Copy command base URL
                </button>
              </div>
            )}

            <div className="tip-box">
              <Info size={17} />
              <p>Use Design 2 in the selector and start the service before triggering vMix shortcuts.
              Design 1 does not listen for these vMix commands. vMix VB.NET Scripting is available in
              vMix 4K and Pro editions.</p>
            </div>
          </section>
        )}

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
            <li><span>2</span><p>Enter its IP address above, keep port <strong>8765</strong>, choose a design and click <strong>Start Overlay Service</strong>.</p></li>
            <li><span>3</span><p>Copy the generated URL and add a <strong>Browser Source</strong> in OBS. Paste the URL.</p></li>
            <li><span>4</span><p>Set Browser Source dimensions to <strong>1920 × 1080</strong> and keep its background transparent.</p></li>
          </ol>
          <div className="tip-box">
            <Info size={17} />
            <p>The graphic appears inside OBS only, not over your Windows desktop. Close this settings window to send the app to the system tray; the local server will keep running.</p>
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
