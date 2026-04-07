# Twitch Widgets

All-in-one Twitch overlay + automation stack for OBS.

Base local URL: `http://localhost:3000`

## Current Run Modes

1. Desktop app mode (recommended): Electron control window launches and manages the server for you.
2. Legacy/manual mode: run Node + Angular flow directly.

## Desktop Mode (Recommended)

### First-time setup

1. Install root desktop dependencies:
	`npm install`
2. Install Electron app dependencies:
	`npm run desktop:install`
3. Install server dependencies:
	`cd NigredoServer; npm install`
4. Install client dependencies:
	`cd ../AlbedoClient; npm install`
5. Build/deploy Angular output to server public folder:
	`cd ..; ./build-and-deploy.ps1`

### Configure server secrets

Create `NigredoServer/.env`:

```env
BOT_USERNAME=
BOT_TOKEN=oauth:
BOT_CHANNEL=
CLIENT_ID=
CLIENT_SECRET=
```

Ensure `NigredoServer/user-creds.json` exists for your auth/session data.

Optional OBS video reward mapping (for OBS source toggles):

```env
OBS_REWARD_SOURCE_LOSER=Loser
OBS_REWARD_DURATION_LOSER_MS=4500
OBS_REWARD_SOURCE_YUPEE=Yupee
OBS_REWARD_DURATION_YUPEE_MS=4500
```

These control which OBS source names are toggled for video-style channel point rewards and how long each source stays enabled.

### Launch desktop app

From repo root:

`npm run desktop:dev`

The desktop window provides:
- Server status
- Start/Stop server controls
- Open overlay route buttons
- Open logs folder action
- Startup diagnostics

### OBS routes

- Full: `http://localhost:3000/full`
- Chat: `http://localhost:3000/chat`
- Alerts: `http://localhost:3000/alerts`
- Redemptions: `http://localhost:3000/redemptions`

## Twitch Auth Flow

1. Start app/server.
2. Open `http://localhost:3000/auth`.
3. Authorize with Twitch.

## Channel Point Reward Media Setup (Optional)

Define rewards in:
`AlbedoClient/src/app/components/point-redemptions/rewards.data.ts`

Media locations:
- `audio`: `AlbedoClient/src/assets/audio` (mp3)
- `video`: `AlbedoClient/src/assets/video` (mp4)
- `hybrid`: audio mp3 in `audio` + gif/image in `images`

## Legacy Manual Mode (Fallback)

If you do not want to use Electron:

1. Build client output:
	`cd AlbedoClient; npm run build:prod`
2. Start server:
	`cd ../NigredoServer; npm start`

## Build Scripts

From repo root:
- `npm run desktop:install`
- `npm run desktop:dev`
- `npm run desktop:build`
- `npm run desktop:dist`

## Create Channel Point Rewards (CLI)

Create rewards using the same user identity/token domain used by the app for reward fulfillment.

From repo root:

`npm run reward:create -- --title "Shotgun" --cost 5000 --prompt "Play the shotgun clip"`

Common options:
- `--channel <login>` override channel login (otherwise uses `BOT_CHANNEL` from `.env`)
- `--enabled true|false`
- `--userInputRequired true|false`
- `--backgroundColor "#9147FF"`
- `--maxPerStream <int>`
- `--maxPerUserPerStream <int>`
- `--globalCooldownSeconds <int>`

Notes:
- Requires `CLIENT_ID` and `CLIENT_SECRET` in `.env`.
- Uses `USER_CREDS_PATH` if set; otherwise `NigredoServer/user-creds.json`.
- Automatically refreshes expired user tokens and persists the refreshed creds.

## Checkpoint EXE (Stream-Night Quick Build)

Use this when you want a packaged desktop binary for tonight's stream.

From repo root, run:

1. Build/deploy Angular overlay assets to server public folder:
	`./build-and-deploy.ps1`
2. Ensure Electron dependencies are installed:
	`npm run desktop:install`
3. Build Windows distributables (installer + portable):
	`npm run desktop:dist`

`desktop:build` and `desktop:dist` automatically install NigredoServer production dependencies before packaging.

Output location:
- `ElectronApp/dist`

Recommended for quick checkpoint use:
- Use the portable `.exe` first (no install required).

Notes:
- Packaging excludes `NigredoServer/.env` and `NigredoServer/user-creds.json` by design.
- On first launch, verify Desktop Settings paths and confirm your auth/session files are available.

## Logging

Server logs are written to:
`NigredoServer/output`
