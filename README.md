# Kabaddi Scoreboard Overlay (Windows)

A standalone Windows tray application that serves either scoreboard design as a transparent **OBS Browser Source**. It does not replace or control the existing Python Kabaddi scoreboard application.

## Two selectable designs

- **Design 1 — SV MEDIA Cyber Armour:** the original overlay, retained as a separate renderer.
- **Design 2 — Turbo Crystal:** the second design imported from `wayaijun100-netizen/score-23wr3`, including its mechanical slide/unfold entrance animation and on-court player counters.

Both designs use the same Python WebSocket data connection. Design 1 does not subscribe to vMix control commands. Design 2 alone supports vMix IN/OUT animation and four player-count commands.

## How it works

- Enter the IP address of the computer running the existing Python scoreboard.
- Select a design and enter the custom half-time/period label.
- The app starts a local HTTP server on the streaming PC at `127.0.0.1:3210`.
- Add the generated local URL as a Browser Source in OBS.
- The Browser Source connects by WebSocket to the Python scoreboard on port `8765` and receives team names, scores and timer updates.
- The Windows app can be closed to the system tray; its local server keeps running.
- The graphic appears only inside OBS. It does not create an always-on-top window or cover the desktop.

## Install

A Windows x64 installer is built by the GitHub Actions workflow:

1. Open the repository's Actions tab.
2. Open the latest **Build Windows installer** run.
3. Download the `Kabaddi-Scoreboard-Overlay-Windows` artifact.
4. Extract the ZIP and run `Kabaddi-Scoreboard-Overlay-Setup-1.0.0.exe`.

## Use

1. Start your existing Python Kabaddi scoreboard on the operator computer. Its WebSocket server listens on port `8765`.
2. Open **Kabaddi Scoreboard Overlay** on the streaming PC.
3. Enter the operator computer's IPv4 address and keep the Python port at `8765`. Use `127.0.0.1` when testing both apps on the same PC.
4. Select **Design 1** or **Design 2**, and edit the half-time/period label.
5. Click **Start Overlay Service** and copy the generated OBS Browser Source URL.
6. In OBS, add a **Browser Source** and paste the URL.
7. Set the Browser Source width and height to your canvas, for example `1920 x 1080`. Keep its background transparent.
8. Close the connection settings window to send the app to the system tray. The Browser Source continues working in OBS.

When changing the design or period label, click **Update Settings / Refresh URL** and replace the Browser Source URL in OBS with the newly generated URL.

## Design 2 — vMix controls

The Turbo design supports six vMix VB.NET scripts:

| Script | Command |
|---|---|
| `Turbo_Overlay_IN` | Replays the original mechanical entrance animation |
| `Turbo_Overlay_OUT` | Runs the exit animation |
| `Team_A_Player_Minus` | Reduces Team A's on-court player count |
| `Team_A_Player_Plus` | Adds one Team A on-court player |
| `Team_B_Player_Minus` | Reduces Team B's on-court player count |
| `Team_B_Player_Plus` | Adds one Team B on-court player |

The four player-count actions are clamped between 0 and 7. Player counters start at 7 when the Browser Source loads.

The downloadable scripts are in `public/vmix-scripts/` and are also linked in the Windows app when Turbo is selected and the local service is running.

### Import scripts in vMix

For each downloaded `.vb` file:

1. Open **vMix Settings → Scripting** and add a script.
2. Give it the corresponding script name and paste the contents of the `.vb` file into the script editor.
3. Save the script.
4. Open **Settings → Shortcuts → Add**.
5. Select function **ScriptStart**, choose the matching script name and assign a key or controller button.
6. Repeat for the other five scripts.

The scripts call the overlay app's local command endpoint at `http://127.0.0.1:3210/vmix?cmd=...`. vMix and the overlay app must run on the same PC. The app must be running and the Overlay Service must be started before pressing the shortcuts.

vMix documents VB.NET scripting and support for `System.Net.WebClient`; its Scripting feature is included in the 4K and Pro editions.

## Network requirements

- Both computers must be on the same reachable local network.
- The Python controller must listen on the LAN interface. The supplied Python script uses `0.0.0.0:8765`.
- Allow inbound TCP port `8765` through Windows Defender Firewall on the computer running the Python controller.
- The local overlay HTTP server and vMix command server bind only to `127.0.0.1:3210`; OBS and vMix access them on the streaming PC.
- Port `3210` must be available on the streaming PC.

## Build the Windows installer

Install Node.js 22.12+ or a current Node.js 24 release.

```bat
npm install
npm run lint
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
