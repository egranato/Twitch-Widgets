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

## Checkpoint EXE (Stream-Night Quick Build)

Use this when you want a packaged desktop binary for tonight's stream.

From repo root, run:

1. Build/deploy Angular overlay assets to server public folder:
	`./build-and-deploy.ps1`
2. Ensure Electron dependencies are installed:
	`npm run desktop:install`
3. Build Windows distributables (installer + portable):
	`npm run desktop:dist`

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
