# Kabaddi Scoreboard Overlay (Windows)

A standalone Windows tray application that serves the existing Kabaddi SVG scoreboard as a transparent **OBS Browser Source**. It does not replace or control the Python Kabaddi scoreboard application.

## How it works

- Enter the IP address of the computer running the existing Python scoreboard.
- The app keeps the Python controller connection settings and starts a small local HTTP server on the streaming PC (normally port 3210).
- Add the generated local URL as a Browser Source in OBS.
- The OBS Browser Source connects by WebSocket to the Python scoreboard's port 8765 and receives team names, scores and timer updates.
- The Windows app can be closed to the system tray. Its local server keeps running.
- The graphic appears only inside OBS. It does not create an always-on-top window or cover your desktop.

## Install

A Windows x64 installer is built by the GitHub Actions workflow:

1. Open the repository's Actions tab.
2. Open the latest **Build Windows installer** run.
3. Download the `Kabaddi-Scoreboard-Overlay-Windows` artifact.
4. Extract the ZIP and run `Kabaddi-Scoreboard-Overlay-Setup-1.0.0.exe`.

## Use

1. Start your existing Python Kabaddi scoreboard on the operator computer. Its WebSocket server listens on port `8765`.
2. Open **Kabaddi Scoreboard Overlay** on the streaming PC.
3. Enter the operator computer's IPv4 address and keep the Python port at `8765`. Use `127.0.0.1` when testing both apps on the same computer.
4. Click **Start Overlay Service** and copy the generated OBS Browser Source URL.
5. In OBS, add a **Browser Source** and paste the URL.
6. Set the Browser Source width and height to your canvas, for example `1920 x 1080`. Keep its background transparent.
7. Close the connection settings window to send the app to the system tray. The Browser Source continues working in OBS.

## Network requirements

- Both computers must be on the same reachable local network.
- The Python controller must listen on the LAN interface. The supplied Python script uses `0.0.0.0:8765`.
- Allow inbound TCP port `8765` through Windows Defender Firewall on the computer running the Python controller.
- The local overlay server binds only to `127.0.0.1`; OBS on the same streaming PC opens it through the generated URL.
- The application tries local ports 3210 through 3230 and displays the actual Browser Source URL.

## Build the Windows installer

Install Node.js 22.12+ or a current Node.js 24 release.

```bat
npm install
npm run dist:win
```

The installer is generated in the `release` folder.

For app development with a live Vite server:

```bat
npm install
npm run app:dev
```

## Data format

The overlay listens for the same JSON fields already emitted by the Python scoreboard:

```json
{
  "team1_name": "TEAM 1",
  "team1_score": 0,
  "team2_name": "TEAM 2",
  "team2_score": 0,
  "timer": 30,
  "timer_running": false
}
```

An optional `raiding_team` field is also supported (`left`, `right`, or `none`).
