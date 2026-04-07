# Electron Migration Roadmap

## Goal
Package the Twitch Widgets project as a Windows desktop app so streaming workflows do not require manual command-line startup.

## Current Status (April 2, 2026)
- Milestone 1: Completed
- Milestone 2: Completed
- Milestone 3: Completed
- Audio Reliability Feature Roadmap: Completed
- Milestone 4: Functionally complete for local-only usage
- Active Focus: Shelved (local-only maintenance mode)

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

## Feature Roadmap - Audio Reliability (OBS-First + Electron Fallback)
Status: Completed

### Objective
Create a single, predictable audio path for alerts by defaulting to OBS-hosted playback, while preserving a safe Electron playback fallback if OBS browser audio fails.

### Why This Direction
- Reduces duplicated audio behavior across widget routes.
- Improves stream-day reliability with one persistent OBS audio source.
- Keeps a fallback path so alerts are never silent.

### Phase A - Unified OBS Audio Manager Route
#### Outcomes
- A dedicated always-on audio manager route in NigredoServer handles alert sound playback.
- Alert routes publish audio events to one queue rather than playing local audio independently.

#### Tasks
1. Add a dedicated route (for example: `/audio-manager`) that can receive/play queued audio events.
2. Add a server-side audio event queue service with:
   - event id
   - file path
   - volume
   - priority
   - cooldown/debounce support
3. Refactor alert/reward/chat audio emitters to publish queue events instead of direct playback.
4. Add a desktop helper action to open/copy the new OBS audio route.
5. Add minimal queue diagnostics in desktop UI (queue length, last played event, errors).

#### Exit Criteria
- All alert audio is audible through one OBS browser source using `/audio-manager`.
- No double-playback occurs when OBS mode is active.

### Phase B - Electron Fallback and Failover
#### Outcomes
- Automatic fallback to Electron playback when OBS audio manager is unavailable.
- Manual override toggle for stream troubleshooting.

#### Tasks
1. Add heartbeat/health checks between desktop app and `/audio-manager`.
2. Add failover policy:
   - Primary: OBS audio manager
   - Fallback: Electron local playback
3. Add settings toggle for fallback mode (`auto`, `obs-only`, `electron-only`).
4. Add status indicator in desktop UI showing active audio path.
5. Log failover transitions for troubleshooting.

#### Exit Criteria
- If OBS audio route breaks, alerts still play through Electron within one event cycle.
- User can force audio path mode from settings without restarting app.

### Phase C - Mix Safety and Stream-Day Controls
#### Outcomes
- Safer default levels and cleaner mix behavior in OBS.
- Faster pre-stream checks for audio readiness.

#### Tasks
1. Add per-event volume profiles (alerts, redemptions, TTS, misc).
2. Add optional limiter-safe output cap guidance in UI text.
3. Add one-click audio test sequence from desktop checklist.
4. Add quick mute/unmute all alert audio action.
5. Add diagnostics export entries for recent audio errors/events.

#### Exit Criteria
- Stream-day audio test confirms both primary and fallback paths.
- No clipping or silent-failure regressions in test session.

### Validation Plan
1. Start desktop app and server.
2. Add `/audio-manager` as OBS browser source audio input.
3. Trigger sample events: cheer, sub/resub, redemption, TTS.
4. Verify queue ordering and per-event volume behavior.
5. Simulate OBS route failure and verify auto failover to Electron.
6. Restore OBS route and verify return to primary path (if in `auto`).

### Implementation Order
1. Phase A (route + queue + event publisher refactor)
2. Phase B (health checks + failover)
3. Phase C (mix tooling + checklist)

## Milestone 4 - Build, Signing, and Distribution
Status: Shelved (Local-Only Complete)

### Progress Snapshot
- Completed:
   - Electron builder config added for Windows targets (NSIS + portable).
   - Packaged runtime pathing added so Electron resolves `NigredoServer` from `process.resourcesPath` when bundled.
   - Backend resources included via `extraResources` in electron-builder config.
   - Local build validation passed with `desktop:build`.
   - Distribution artifact generation passed with `desktop:dist`.
- Remaining:
   - Deferred until multi-user/public release is needed:
      - Add explicit code-signing placeholder values for release docs/process.
      - Add release notes template and semantic versioning flow documentation.

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
5. Desktop lifecycle preference: optional "Quit app when window is closed" toggle (instead of tray-only background behavior on Windows).
6. Alert presentation polish: add configurable fade/slide transition animations for queued alerts.
7. UX friendliness upgrade: preserve unsaved settings drafts during state refresh, show explicit "not saved" indicator, and add clearer apply/restart guidance.
8. Stream Manager preview dark mode: add optional `?darkMode=true` query parameter to `/chat`, `/alerts`, and `/full` routes so desktop Stream Manager preview frames render with dark backgrounds instead of default white backgrounds.
9. **Icon Branding for Desktop App** — Status: **Completed**. Designed and wired multi-resolution icon set (16/20/24/32 px for system tray; 32–256 px for desktop window and installer). Applied tray icon via `buildTrayIcon()` with fallback chain and desktop window icon via `BrowserWindow` icon property. Updated Electron-builder Windows config to include assets in packaged application.

## Backlog - Angular Legacy Cleanup (Post OBS-First Rewards)
Status: Deferred / Track in Maintenance

### Why
- Redemptions are now OBS-first and managed outside Angular routes/components.
- Angular still contains legacy redemption components and socket plumbing that are likely no longer used.

### Candidate Cleanup Items
1. Remove `PointRedemptionsComponent` and `RewardMediaComponent` from Angular module declarations/imports.
2. Remove unused redemption component files under `AlbedoClient/src/app/components/point-redemptions/` if no longer referenced.
3. Remove redemption socket pipeline from `SocketService` (`point-redeem` listener and `fulfillPointReward`).
4. Remove `RedemptionEvent` model/types if no longer referenced.
5. Remove legacy rewards data table (`rewards.data.ts`) and related dead references.

### Validation After Cleanup
1. Angular build succeeds with no missing symbol/import errors.
2. `/full`, `/chat`, and `/alerts` continue to function as expected.
3. Follow/sub/cheer visuals still render correctly.
4. OBS-first redemption flow remains unaffected.

## Suggested Execution Order
1. Milestone 1
2. Milestone 2
3. Milestone 3
4. Feature Roadmap - Audio Reliability
5. Milestone 4
6. Milestone 5
7. Milestone 6

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
