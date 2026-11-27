# Kabaddi Scoreboard Overlay

This project is the **OBS overlay only**. It does not provide score-entry controls, match presets, an event log, or a fullscreen operator application. Keep using the scoreboard/controller app on the other laptop to edit team names, scores, and the raid timer.

## How it connects

The overlay opens one WebSocket connection to the operator laptop and listens for the same JSON fields used by the five earlier HTML overlays:

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

The optional `raiding_team` field is also understood. Supported values are `left` / `team1` / `1`, `right` / `team2` / `2`, and `none` / `off`.

The WebSocket server must be reachable from the OBS computer at TCP port `8765` and broadcast the JSON state to connected clients. The overlay is read-only: it receives values but never changes the controller app.

## Run locally

1. Install Node.js, then open this project folder in a terminal.
2. Run `npm install`.
3. Run `npm run dev`.
4. Add an OBS **Browser Source** with this URL (replace the IP with the operator laptop's current LAN IPv4 address):

   `http://127.0.0.1:3000/?host=192.168.220.6&port=8765`

5. Set the Browser Source dimensions to your stream canvas, for example `1920 x 1080`. The page background is transparent.

## Changing the operator laptop IP

The previous five HTML files did not all point to the same address: the name and timer pages used `192.168.220.6`, while the two score pages used `192.168.220.4` and `192.168.220.3`. A single combined overlay must use the **one IP address of the laptop running the WebSocket server**. The app defaults to `192.168.220.6` because that address appeared on three of the five pages, but change it in the OBS URL when the operator laptop has a different address:

`http://127.0.0.1:3000/?host=YOUR_OPERATOR_LAPTOP_IP&port=8765`

You can also pass a complete WebSocket URL with the `ws` query parameter, for example `?ws=ws%3A%2F%2F192.168.220.6%3A8765`.

Make sure the operator laptop's WebSocket server listens on the LAN interface (not only `127.0.0.1`) and that Windows Firewall allows inbound TCP port `8765`. Both laptops must be on the same reachable network.

## Build

Run `npm run build`. The production site is written to `dist/`. Serve that folder over HTTP and use the same OBS Browser Source URL, including the `host` and `port` query parameters.
