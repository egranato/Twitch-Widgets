# Electron Migration Roadmap

## Goal
Package the Twitch Widgets project as a Windows desktop app so streaming workflows do not require manual command-line startup.

## Current Status (April 2, 2026)
- Milestone 1: Completed
- Milestone 2: Completed
- Milestone 3: Completed
- Active Focus: Milestone 4

## Success Criteria
- Desktop app starts with a double-click and launches services reliably.
- Overlay routes remain available at http://localhost:3000.
- OBS scenes work without URL changes.
- Crash recovery and logs are visible from the app UI.
- Production build can be generated as an installer and portable executable.

## Milestone 1 - Foundation and Project Structure
Status: Completed

### Outcomes
- Electron shell scaffolded in a dedicated app folder.
- Existing Node server can be launched and stopped by Electron.
- Local dev run command starts both Electron shell and backend services.

### Tasks
1. Create an Electron app workspace at `/DesktopApp` or `/ElectronApp` in the repo.
2. Add dependencies: electron, electron-builder, concurrently, wait-on, cross-env.
3. Implement main process bootstrap with lifecycle hooks.
4. Spawn NigredoServer process from Electron main process.
5. Add health check for `http://localhost:3000` before opening BrowserWindow.
6. Add graceful shutdown logic to kill child server process on app quit.
7. Add root scripts to run desktop dev mode.

### Exit Criteria
- Running one command starts desktop shell and backend.
- Closing app cleanly stops backend process.
- No orphan Node processes after exit.

### Completion Notes
- Electron workspace created at `/ElectronApp`.
- Root scripts added for desktop install/dev/build/dist.
- Main process launches and shuts down `NigredoServer` process.
- Startup waits for `http://localhost:3000` readiness before app load.

## Milestone 2 - Runtime Controls and Stability
Status: Completed

### Outcomes
- Basic control UI for app status and actions.
- Observable logs and clear startup errors.
- Better reliability for stream-day usage.

### Tasks
1. Create a minimal desktop control window:
   - Service status
   - Start/Stop server buttons
   - Open Overlay URL button
   - Open Log Folder button
2. Add structured startup diagnostics:
   - Port in use detection
   - Missing env file detection
   - Missing credentials detection
3. Add app-level error handling and crash dialog.
4. Add tray icon with quick actions (start, stop, open OBS routes).
5. Add single-instance lock to prevent duplicate app launches.

### Exit Criteria
- User can manage service lifecycle from UI only.
- Common startup failures provide actionable messages.
- App remains stable for a full test stream session.

### Completion Notes
- Desktop control window implemented with service state and controls.
- IPC bridge and renderer UI added for Start/Stop, route open, log folder open.
- Startup diagnostics include:
   - Port in use detection
   - Missing `.env` detection
   - Missing `user-creds.json` detection
- Tray menu added with quick actions.
- Single-instance lock implemented.
- Main-process uncaught error/rejection handling added with dialogs.

## Milestone 3 - Configuration and OBS Experience
Status: Completed

### Progress Snapshot
- Completed:
   - Base host + port settings persisted in app data.
   - Configurable `.env` and `user-creds.json` paths persisted and applied at runtime.
   - OBS route helper with per-route open/copy and copy-all actions.
   - Auth route helper (`/auth`) with open/copy and copy-all support.
   - Restart-required detection after runtime settings changes.
   - One-click Restart Server action in desktop UI.
   - Validation for settings fields (host/port/paths).
   - OBS audio-owner mode toggle persisted in settings.
   - Tabbed settings UX (General / Paths / OBS) implemented.
    - Additional OBS toggles implemented:
       - Auto-open `/full` after server start
       - Show/hide OBS 1080p size hints
    - Stream-Day quick setup checklist with status indicators and actions implemented.
- Remaining:
   - None for Milestone 3.

### Recent Update
- Added file-picker UX for `.env` and `user-creds.json` paths in desktop settings.
- Added stream-day checklist card and expanded OBS settings toggles.

### Outcomes
- Streamer-friendly settings management.
- One-click copy/open for routes used in OBS.
- Optional audio ownership controls to avoid overlap.

### Tasks
1. Build Settings page:
   - Base URL and port
   - Twitch credentials paths
   - OBS integration toggles
2. Add routes helper panel:
   - Chat: `http://localhost:3000/chat`
   - Alerts: `http://localhost:3000/alerts`
   - Redemptions: `http://localhost:3000/redemptions`
   - Full: `http://localhost:3000/full`
3. Add copy-to-clipboard and open-in-browser actions.
4. Add optional "audio owner" mode guidance and toggle docs.
5. Persist user settings in app data directory.

### Exit Criteria
- No manual editing needed for normal setup changes.
- OBS source URLs are easy to discover and copy.

### Completion Notes
- Settings are stored in Electron user data as `desktop-settings.json`.
- NigredoServer now respects `PORT` and `USER_CREDS_PATH` from desktop runtime config.
- Desktop checklist provides one-click actions for start, diagnostics, auth, and route helpers.
- OBS tab now includes optional automatic opening of `/full` on server start.

## Milestone 4 - Build, Signing, and Distribution
### Outcomes
- Repeatable production builds for Windows.
- Installer and portable EXE generated from CI/local scripts.

### Tasks
1. Configure electron-builder targets:
   - NSIS installer
   - Portable executable
2. Include required assets and static files in build output.
3. Verify backend files are packaged and runtime-accessible.
4. Add code signing placeholder configuration.
5. Add release notes template and semantic versioning flow.
6. Add build scripts:
   - `desktop:build`
   - `desktop:dist`

### Exit Criteria
- Fresh machine install can launch app and serve overlays.
- Versioned artifacts generated in one command.

## Milestone 5 - Quality Gates and Stream Readiness
### Outcomes
- Confidence checks before live stream use.
- Reduced risk of failures during long sessions.

### Tasks
1. Create smoke test checklist:
   - Launch app
   - Connect Twitch bot
   - Trigger follow alert
   - Trigger redemption
   - Trigger TTS
2. Add log rotation policy for `/NigredoServer/output`.
3. Add simple telemetry-free session diagnostics bundle export.
4. Add recovery behavior for server crash:
   - Auto-restart with capped retries
   - User-visible status update
5. Run a full dress rehearsal stream test.

### Exit Criteria
- All smoke tests pass in one run.
- App remains stable for 3+ hour session.

## Milestone 6 - Nice-to-Haves
### Optional Enhancements
1. Auto-update support for desktop app.
2. Built-in route preview window for quick visual checks.
3. Built-in OBS websocket controls (scene/source toggles).
4. Profile presets for different stream layouts.

## Suggested Execution Order
1. Milestone 1
2. Milestone 2
3. Milestone 4
4. Milestone 3
5. Milestone 5
6. Milestone 6

## Tracking Template
Use this lightweight template each time work starts on a milestone.

### Current Milestone
- Name:
- Owner:
- Start Date:
- Target Date:

### Progress
- Completed:
- In Progress:
- Blockers:

### Validation Notes
- What was tested:
- Result:
- Follow-up actions:
