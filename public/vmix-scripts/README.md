# vMix shortcut scripts — Turbo Design 2

These scripts control **Design 2 (Turbo)** only. They do not affect Design 1.

## Before using them

1. Open Kabaddi Scoreboard Overlay on the same Windows PC as vMix.
2. Select **Design 2 — Turbo Crystal**.
3. Enter the Python scoreboard computer IP and port 8765.
4. Click **Start Overlay Service**.
5. Keep the app running in the Windows system tray.

The local app listens for vMix commands at:

`http://127.0.0.1:3210/vmix?cmd=COMMAND`

The Python scoreboard remains the source of team names, points and raid timer. These scripts only control the Turbo design animation and its on-court player counters.

## Import the scripts into vMix

For each `.vb` file:

1. In vMix, open **Settings → Scripting**.
2. Add a script with the name shown below.
3. Paste the contents of the matching `.vb` file into the script editor and save.
4. Open **Settings → Shortcuts → Add**.
5. Choose function **ScriptStart** and choose the matching Script Name.
6. Assign a keyboard key or MIDI/controller button, then save.

Suggested six shortcuts (assign keys that do not conflict with your existing setup):

| Script name | Action |
|---|---|
| Turbo_Overlay_IN | Replay the original mechanical IN animation |
| Turbo_Overlay_OUT | Animate the Turbo overlay OUT |
| Team_A_Player_Minus | Reduce Team A on-court players by one |
| Team_A_Player_Plus | Add one Team A on-court player |
| Team_B_Player_Minus | Reduce Team B on-court players by one |
| Team_B_Player_Plus | Add one Team B on-court player |

The four player-count commands are clamped to 0–7. Counts start at 7 when the Browser Source loads.

## Notes

- The VB.NET scripts use `System.Net.WebClient` to send a local HTTP request to the overlay app.
- vMix documents VB.NET scripting and the `System.Net.WebClient` class for script use. Scripting is included in vMix 4K and Pro editions.
- vMix and Kabaddi Scoreboard Overlay should run on the same PC because the command service listens on `127.0.0.1`.
- If the overlay app is stopped or the local service has not started, the vMix script will report a connection error in the vMix Script console.
