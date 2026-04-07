const statusBadge = document.getElementById('statusBadge');
const errorText = document.getElementById('errorText');
const serverUrlText = document.getElementById('serverUrl');
const diagnosticsList = document.getElementById('diagnosticsList');

const audioStatusBadge = document.getElementById('audioStatusBadge');
const audioPathStatus = document.getElementById('audioPathStatus');
const audioModeStatus = document.getElementById('audioModeStatus');
const audioLastCheckStatus = document.getElementById('audioLastCheckStatus');
const checkAudioHealthBtn = document.getElementById('checkAudioHealthBtn');
const runAudioTestBtn = document.getElementById('runAudioTestBtn');
const muteAudioBtn = document.getElementById('muteAudioBtn');
const testFollowAlertBtn = document.getElementById('testFollowAlertBtn');
const testSubscriptionAlertBtn = document.getElementById('testSubscriptionAlertBtn');
const testCheerAlertBtn = document.getElementById('testCheerAlertBtn');

const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const logsBtn = document.getElementById('logsBtn');
const diagnosticsBtn = document.getElementById('diagnosticsBtn');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const restartServerBtn = document.getElementById('restartServerBtn');
const copyAllRoutesBtn = document.getElementById('copyAllRoutesBtn');
const settingsErrorText = document.getElementById('settingsErrorText');
const settingsDirtyIndicator = document.getElementById('settingsDirtyIndicator');

const baseHostInput = document.getElementById('baseHostInput');
const portInput = document.getElementById('portInput');
const envPathInput = document.getElementById('envPathInput');
const credsPathInput = document.getElementById('credsPathInput');
const audioOwnerToggle = document.getElementById('audioOwnerToggle');
const desktopTtsToggle = document.getElementById('desktopTtsToggle');
const audioModeSelect = document.getElementById('audioModeSelect');
const obsAutoOpenFullToggle = document.getElementById('obsAutoOpenFullToggle');
const obsShowSizeHintsToggle = document.getElementById('obsShowSizeHintsToggle');
const obsSizeHints = document.getElementById('obsSizeHints');
const browseEnvBtn = document.getElementById('browseEnvBtn');
const browseCredsBtn = document.getElementById('browseCredsBtn');
const followAudioFileInput = document.getElementById('followAudioFileInput');
const subscriptionAudioFileInput = document.getElementById('subscriptionAudioFileInput');
const browseFollowAudioBtn = document.getElementById('browseFollowAudioBtn');
const browseSubscriptionAudioBtn = document.getElementById('browseSubscriptionAudioBtn');
const settingsTabs = document.querySelectorAll('.settings-tab');
const settingsPanels = document.querySelectorAll('.settings-panel');
const appTabs = document.querySelectorAll('.app-tab');
const appTabPanes = document.querySelectorAll('.app-tab-pane');

const checkServerStatus = document.getElementById('checkServerStatus');
const checkEnvStatus = document.getElementById('checkEnvStatus');
const checkCredsStatus = document.getElementById('checkCredsStatus');
const checkAuthStatus = document.getElementById('checkAuthStatus');
const checkFollowAudioStatus = document.getElementById('checkFollowAudioStatus');
const checkSubscriptionAudioStatus = document.getElementById('checkSubscriptionAudioStatus');

const quickStartServerBtn = document.getElementById('quickStartServerBtn');
const quickOpenSettingsPathsBtn = document.getElementById('quickOpenSettingsPathsBtn');
const quickOpenSettingsCredsBtn = document.getElementById('quickOpenSettingsCredsBtn');
const quickOpenAuthBtn = document.getElementById('quickOpenAuthBtn');
const quickRunDiagnosticsBtn = document.getElementById('quickRunDiagnosticsBtn');
const quickOpenFullBtn = document.getElementById('quickOpenFullBtn');
const quickCopyRoutesBtn = document.getElementById('quickCopyRoutesBtn');
const quickOpenSettingsFollowAudioBtn = document.getElementById('quickOpenSettingsFollowAudioBtn');
const quickOpenSettingsSubscriptionAudioBtn = document.getElementById('quickOpenSettingsSubscriptionAudioBtn');

const streamChatFrame = document.getElementById('streamChatFrame');
const streamAlertsFrame = document.getElementById('streamAlertsFrame');
const streamFullFrame = document.getElementById('streamFullFrame');
const obsReconnectBanner = document.getElementById('obsReconnectBanner');
const obsReconnectMessage = document.getElementById('obsReconnectMessage');
const connectObsBtn = document.getElementById('connectObsBtn');
const obsRewardRefreshBtn = document.getElementById('obsRewardRefreshBtn');
const obsRewardRegisterBtn = document.getElementById('obsRewardRegisterBtn');
const obsRewardTitleInput = document.getElementById('obsRewardTitleInput');
const obsRewardSourceInput = document.getElementById('obsRewardSourceInput');
const obsRewardSource2Input = document.getElementById('obsRewardSource2Input');
const obsRewardMappingsList = document.getElementById('obsRewardMappingsList');
const unconfiguredRewardBanner = document.getElementById('unconfiguredRewardBanner');
const unconfiguredRewardList = document.getElementById('unconfiguredRewardList');

let latestState = null;
let desktopTtsSocket = null;
let desktopTtsSocketBaseUrl = '';
let desktopTtsQueue = [];
let desktopTtsPlaying = false;
let settingsInitialized = false;
let lastAppliedSettings = null;
let lastRenderedServerStatus = 'stopped';
let latestObsStatus = null;
let obsStatusRefreshInFlight = false;
let latestObsRewardMappings = [];
let obsRewardMappingsRefreshInFlight = false;
let unconfiguredRewardEvents = [];

function normalizeSettings(settings) {
  return {
    baseHost: String(settings?.baseHost || 'localhost').trim(),
    port: Number.parseInt(String(settings?.port || 3000), 10),
    envFilePath: String(settings?.envFilePath || '').trim(),
    userCredsPath: String(settings?.userCredsPath || '').trim(),
    followAudioFilePath: String(settings?.followAudioFilePath || '').trim(),
    subscriptionAudioFilePath: String(settings?.subscriptionAudioFilePath || '').trim(),
    obsAudioOwnerMode: Boolean(settings?.obsAudioOwnerMode),
    desktopTtsEnabled: settings?.desktopTtsEnabled !== false,
    audioMode: String(settings?.audioMode || 'auto'),
    obsAutoOpenFullOnStart: Boolean(settings?.obsAutoOpenFullOnStart),
    obsShowSizeHints: Boolean(settings?.obsShowSizeHints),
  };
}

function areSettingsEqual(a, b) {
  return a.baseHost === b.baseHost
    && a.port === b.port
    && a.envFilePath === b.envFilePath
    && a.userCredsPath === b.userCredsPath
    && a.followAudioFilePath === b.followAudioFilePath
    && a.subscriptionAudioFilePath === b.subscriptionAudioFilePath
    && a.obsAudioOwnerMode === b.obsAudioOwnerMode
    && a.desktopTtsEnabled === b.desktopTtsEnabled
    && a.audioMode === b.audioMode
    && a.obsAutoOpenFullOnStart === b.obsAutoOpenFullOnStart
    && a.obsShowSizeHints === b.obsShowSizeHints;
}

function hasUnsavedSettingsChanges() {
  if (!settingsInitialized || !lastAppliedSettings) {
    return false;
  }

  return !areSettingsEqual(getSettingsPayload(), lastAppliedSettings);
}

function renderSettingsDirtyIndicator() {
  if (!settingsDirtyIndicator) {
    return;
  }

  settingsDirtyIndicator.hidden = !hasUnsavedSettingsChanges();
}

async function loadSocketIoClient(baseUrl) {
  if (window.io) {
    return true;
  }

  const scriptId = 'desktop-socket-io-client';
  const existing = document.getElementById(scriptId);
  if (existing) {
    return Boolean(window.io);
  }

  try {
    const response = await fetch(`${baseUrl}/socket.io/socket.io.js`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      return false;
    }

    const scriptText = await response.text();
    const trimmed = String(scriptText || '').trimStart().toLowerCase();

    // When socket.io is not ready, server may return HTML fallback. Do not execute it.
    if (trimmed.startsWith('<!doctype') || trimmed.startsWith('<html') || trimmed.startsWith('<')) {
      return false;
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.textContent = scriptText;
    document.head.appendChild(script);

    return Boolean(window.io);
  } catch (_) {
    return false;
  }
}

function acknowledgeDesktopTts(id) {
  if (!desktopTtsSocket || !desktopTtsSocket.connected) {
    return;
  }
  desktopTtsSocket.emit('tts-complete', id);
}

function processDesktopTtsQueue() {
  if (desktopTtsPlaying || desktopTtsQueue.length === 0) {
    return;
  }

  if (!latestState || !latestState.settings?.desktopTtsEnabled) {
    while (desktopTtsQueue.length > 0) {
      const nextId = desktopTtsQueue.shift();
      acknowledgeDesktopTts(nextId);
    }
    return;
  }

  const nextId = desktopTtsQueue.shift();
  if (!nextId || !latestState.serverUrl) {
    return;
  }

  desktopTtsPlaying = true;
  const audio = new Audio(`${latestState.serverUrl}/assets/audio/${nextId}.mp3`);

  const finish = () => {
    acknowledgeDesktopTts(nextId);
    desktopTtsPlaying = false;
    processDesktopTtsQueue();
  };

  audio.onended = finish;
  audio.onerror = finish;
  audio.play().catch(() => {
    finish();
  });
}

function disconnectDesktopTtsSocket() {
  if (desktopTtsSocket) {
    desktopTtsSocket.off('tts-desktop-message');
    desktopTtsSocket.off('reward-unconfigured');
    desktopTtsSocket.disconnect();
    desktopTtsSocket = null;
  }
  desktopTtsSocketBaseUrl = '';
  desktopTtsQueue = [];
  desktopTtsPlaying = false;
}

async function ensureDesktopTtsConnection(state) {
  const serverRunning = state?.serverStatus === 'running';
  const baseUrl = state?.serverUrl;

  if (!serverRunning || !baseUrl) {
    disconnectDesktopTtsSocket();
    return;
  }

  if (desktopTtsSocket && desktopTtsSocket.connected && desktopTtsSocketBaseUrl === baseUrl) {
    return;
  }

  if (desktopTtsSocket && desktopTtsSocketBaseUrl !== baseUrl) {
    disconnectDesktopTtsSocket();
  }

  const loaded = await loadSocketIoClient(baseUrl);
  if (!loaded || !window.io) {
    return;
  }

  desktopTtsSocket = window.io(baseUrl, {
    transports: ['websocket', 'polling'],
    reconnection: true,
  });
  desktopTtsSocketBaseUrl = baseUrl;

  desktopTtsSocket.on('tts-desktop-message', (id) => {
    desktopTtsQueue.push(id);
    processDesktopTtsQueue();
  });

  desktopTtsSocket.on('reward-unconfigured', (payload) => {
    if (!payload || !payload.rewardTitle) {
      return;
    }

    const entry = {
      rewardTitle: String(payload.rewardTitle || ''),
      userName: String(payload.userName || 'Unknown user'),
      redeemedAt: String(payload.redeemedAt || new Date().toISOString()),
    };

    unconfiguredRewardEvents = [entry, ...unconfiguredRewardEvents].slice(0, 12);
    renderUnconfiguredRewardBanner();
    showInlineMessage(`Reward '${entry.rewardTitle}' is not mapped to OBS yet. Redemption was refunded.`);
  });
}

function showInlineMessage(message) {
  errorText.hidden = false;
  errorText.textContent = message;
}

function hideInlineMessage() {
  errorText.hidden = true;
  errorText.textContent = '';
}

function showSettingsError(message) {
  settingsErrorText.hidden = false;
  settingsErrorText.textContent = message;
}

function hideSettingsError() {
  settingsErrorText.hidden = true;
  settingsErrorText.textContent = '';
}

function markFieldInvalid(field, invalid) {
  if (!field) {
    return;
  }
  field.classList.toggle('input-invalid', invalid);
}

function setMiniBadge(element, ok, pendingLabel, okLabel = 'Ready') {
  element.classList.remove('ok', 'warn', 'pending');
  if (ok) {
    element.classList.add('ok');
    element.textContent = okLabel;
    return;
  }

  element.classList.add('warn');
  element.textContent = pendingLabel;
}

function diagnosticIncludes(fragment) {
  if (!latestState || !Array.isArray(latestState.diagnostics)) {
    return false;
  }

  return latestState.diagnostics.some((d) => String(d.message || '').includes(fragment));
}

function updateQuickSetupChecklist(state) {
  const serverOk = state.serverStatus === 'running';
  const envOk = !diagnosticIncludes('Missing .env');
  const credsOk = !diagnosticIncludes('Missing user-creds.json');
  const authOk = credsOk;
  const followAudioOk = !diagnosticIncludes('Follow audio file is not configured')
    && !diagnosticIncludes('Configured follow audio file is missing');
  const subscriptionAudioOk = !diagnosticIncludes('Subscription audio file is not configured')
    && !diagnosticIncludes('Configured subscription audio file is missing');

  setMiniBadge(checkServerStatus, serverOk, 'Start needed', 'Running');
  setMiniBadge(checkEnvStatus, envOk, 'Missing');
  setMiniBadge(checkCredsStatus, credsOk, 'Missing');
  setMiniBadge(checkAuthStatus, authOk, 'Run auth', 'Ready');
  setMiniBadge(checkFollowAudioStatus, followAudioOk, 'Missing');
  setMiniBadge(checkSubscriptionAudioStatus, subscriptionAudioOk, 'Missing');

  quickStartServerBtn.disabled = serverOk || state.serverStatus === 'starting';
}

function setStatus(status) {
  statusBadge.textContent = status;
  statusBadge.className = `badge badge-${status}`;
}

function activateSettingsTab(tabName) {
  settingsTabs.forEach((tab) => {
    const active = tab.getAttribute('data-tab') === tabName;
    tab.classList.toggle('active', active);
    tab.setAttribute('aria-selected', active ? 'true' : 'false');
  });

  settingsPanels.forEach((panel) => {
    const active = panel.getAttribute('data-panel') === tabName;
    panel.classList.toggle('active', active);
    panel.hidden = !active;
  });
}

function activateAppTab(tabName) {
  appTabs.forEach((tab) => {
    const active = tab.getAttribute('data-app-tab') === tabName;
    tab.classList.toggle('active', active);
    tab.setAttribute('aria-selected', active ? 'true' : 'false');
  });

  appTabPanes.forEach((pane) => {
    const active = pane.getAttribute('data-app-pane') === tabName;
    pane.classList.toggle('active', active);
    pane.hidden = !active;
  });
}

function setAccordionState(card, expanded) {
  const trigger = card.querySelector('.accordion-trigger');
  const body = card.querySelector('.accordion-body');
  if (!trigger || !body) {
    return;
  }

  trigger.setAttribute('aria-expanded', expanded ? 'true' : 'false');
  body.hidden = !expanded;
}

function initializeAccordions() {
  const accordionCards = document.querySelectorAll('.accordion-card');

  accordionCards.forEach((card) => {
    if (card.dataset.accordionReady === 'true') {
      return;
    }

    const title = String(card.dataset.accordionTitle || 'Section').trim();
    const openByDefault = card.dataset.accordionOpen === 'true';

    const body = document.createElement('div');
    body.className = 'accordion-body';

    while (card.firstChild) {
      body.appendChild(card.firstChild);
    }

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'accordion-trigger';
    trigger.innerHTML = `<span>${title}</span><span class="accordion-chevron">></span>`;

    trigger.addEventListener('click', () => {
      const expanded = trigger.getAttribute('aria-expanded') === 'true';
      setAccordionState(card, !expanded);
    });

    card.appendChild(trigger);
    card.appendChild(body);
    card.dataset.accordionReady = 'true';
    setAccordionState(card, openByDefault);
  });
}

function setDiagnostics(diagnostics) {
  diagnosticsList.innerHTML = '';

  if (!diagnostics || diagnostics.length === 0) {
    const item = document.createElement('li');
    item.className = 'ok';
    item.textContent = 'No startup issues detected.';
    diagnosticsList.appendChild(item);
    return;
  }

  for (const diagnostic of diagnostics) {
    const item = document.createElement('li');
    item.className = diagnostic.level === 'warning' ? 'warn' : 'ok';
    item.textContent = diagnostic.message;
    diagnosticsList.appendChild(item);
  }
}

function render(state) {
  latestState = state;
  setStatus(state.serverStatus);

  const transitionedToRunning =
    state.serverStatus === 'running' && lastRenderedServerStatus !== 'running';

  const running = state.serverStatus === 'running';
  const busy = state.serverStatus === 'starting' || state.serverStatus === 'stopping';

  startBtn.disabled = running || busy;
  stopBtn.disabled = !running && state.serverStatus !== 'starting';

  if (state.lastError) {
    showInlineMessage(state.lastError);
  } else {
    hideInlineMessage();
  }

  serverUrlText.textContent = `Base URL: ${state.serverUrl}`;
  setDiagnostics(state.diagnostics || []);
  renderSettings(state.settings || {}, {
    preserveDraft: hasUnsavedSettingsChanges(),
  });
  renderAudioStatus(state);
  renderStreamManager(state, { forceReload: transitionedToRunning });
  renderObsReconnectBanner(state, latestObsStatus);
  renderObsRewardMappingControls(state);
  renderObsRewardMappings(latestObsRewardMappings);
  renderUnconfiguredRewardBanner();
  refreshObsStatus(state).catch(() => {
    // Ignore transient OBS status polling failures.
  });
  refreshObsRewardMappings(state).catch(() => {
    // Ignore transient reward mapping fetch failures.
  });
  ensureDesktopTtsConnection(state).catch(() => {
    // Ignore connection setup errors to avoid noisy UI interruptions.
  });
  processDesktopTtsQueue();
  restartServerBtn.hidden = !state.settingsRestartRequired;
  updateQuickSetupChecklist(state);

  lastRenderedServerStatus = state.serverStatus;
}

function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderObsRewardMappingControls(state) {
  const serverRunning = state?.serverStatus === 'running';

  if (obsRewardRefreshBtn) {
    obsRewardRefreshBtn.disabled = !serverRunning;
  }

  if (obsRewardRegisterBtn) {
    obsRewardRegisterBtn.disabled = !serverRunning;
  }
}

function renderObsRewardMappings(mappings) {
  if (!obsRewardMappingsList) {
    return;
  }

  const items = Array.isArray(mappings) ? mappings : [];
  if (items.length === 0) {
    obsRewardMappingsList.innerHTML = '<p class="hint">No OBS reward mappings registered yet.</p>';
    return;
  }

  const rows = items.map((item) => {
    const sourceText = Array.isArray(item.sources)
      ? item.sources.map((name) => escapeHtml(name)).join(' | ')
      : escapeHtml(item.sourceName);

    const driverSourceText = item.driverSource
      ? ` · Driver source: ${escapeHtml(item.driverSource)}`
      : '';

    return `
      <div class="obs-reward-row">
        <div>
          <div class="obs-reward-title">${escapeHtml(item.rewardTitle)}</div>
          <div class="obs-reward-meta">OBS Sources: <strong>${sourceText}</strong>${driverSourceText}</div>
        </div>
        <button class="button" data-action="remove-obs-reward" data-reward-title="${escapeHtml(item.rewardTitle)}">Remove</button>
      </div>
    `;
  });

  obsRewardMappingsList.innerHTML = rows.join('');
}

function renderUnconfiguredRewardBanner() {
  if (!unconfiguredRewardBanner || !unconfiguredRewardList) {
    return;
  }

  if (!Array.isArray(unconfiguredRewardEvents) || unconfiguredRewardEvents.length === 0) {
    unconfiguredRewardBanner.hidden = true;
    unconfiguredRewardList.innerHTML = '';
    return;
  }

  const rows = unconfiguredRewardEvents.map((item) => {
    const time = new Date(item.redeemedAt).toLocaleTimeString();
    return `
      <div class="obs-reward-row">
        <div>
          <div class="obs-reward-title">${escapeHtml(item.rewardTitle)}</div>
          <div class="obs-reward-meta">Redeemed by ${escapeHtml(item.userName)} at ${escapeHtml(time)}. Configure this reward in OBS Video Reward Mappings below.</div>
        </div>
      </div>
    `;
  });

  unconfiguredRewardList.innerHTML = rows.join('');
  unconfiguredRewardBanner.hidden = false;
}

async function refreshObsRewardMappings(state) {
  const serverRunning = state?.serverStatus === 'running';
  if (!serverRunning) {
    latestObsRewardMappings = [];
    renderObsRewardMappings(latestObsRewardMappings);
    return;
  }

  if (obsRewardMappingsRefreshInFlight) {
    return;
  }

  obsRewardMappingsRefreshInFlight = true;
  try {
    const result = await window.desktopAPI.getObsRewardMappings();
    if (result.ok && Array.isArray(result.mappings)) {
      latestObsRewardMappings = result.mappings;
      renderObsRewardMappings(latestObsRewardMappings);
    }
  } finally {
    obsRewardMappingsRefreshInFlight = false;
  }
}

function describeObsStatus(status) {
  if (!status) {
    return 'Checking OBS websocket status...';
  }

  if (status.connected) {
    return 'OBS websocket connected.';
  }

  if (status.connecting) {
    return 'Attempting to connect to OBS websocket...';
  }

  const retries = Number.isInteger(status.retryCount) ? status.retryCount : 0;
  const maxRetries = Number.isInteger(status.maxRetries) ? status.maxRetries : 0;
  const targetPort = Number.isInteger(status.targetPort) ? status.targetPort : 4455;
  const targetText = String(targetPort);
  const errorText = status.lastError ? ` Last error: ${status.lastError}` : '';

  if (status.gaveUp) {
    return `Automatic retries exhausted (${retries}/${maxRetries}). Attempted OBS websocket port ${targetText}. Check OBS WebSocket Server settings, then click Connect OBS.${errorText}`;
  }

  return `OBS websocket disconnected. Retrying (${retries}/${maxRetries}) on port ${targetText}...${errorText}`;
}

function renderObsReconnectBanner(state, obsStatus) {
  if (!obsReconnectBanner || !obsReconnectMessage || !connectObsBtn) {
    return;
  }

  const serverRunning = state?.serverStatus === 'running';
  const shouldShow =
    serverRunning
    && obsStatus
    && !obsStatus.connected
    && Boolean(obsStatus.gaveUp);

  obsReconnectBanner.hidden = !shouldShow;
  obsReconnectMessage.textContent = describeObsStatus(obsStatus);
  connectObsBtn.disabled = !serverRunning;
}

async function refreshObsStatus(state) {
  const serverRunning = state?.serverStatus === 'running';
  if (!serverRunning) {
    latestObsStatus = null;
    renderObsReconnectBanner(state, latestObsStatus);
    return;
  }

  if (obsStatusRefreshInFlight) {
    return;
  }

  obsStatusRefreshInFlight = true;

  try {
    const result = await window.desktopAPI.getObsStatus();
    if (result.ok && result.status) {
      latestObsStatus = result.status;
      renderObsReconnectBanner(state, latestObsStatus);
    }
  } finally {
    obsStatusRefreshInFlight = false;
  }
}

function setFrameSource(frame, url, options = {}) {
  if (!frame || !url) {
    return;
  }

  const forceReload = Boolean(options.forceReload);

  if (!forceReload && frame.dataset.currentSrc === url) {
    return;
  }

  frame.src = url;
  frame.dataset.currentSrc = url;

}

function renderStreamManager(state, options = {}) {
  const routes = state?.routes;
  if (!routes || state?.serverStatus !== 'running') {
    return;
  }

  const forceReload = Boolean(options.forceReload);

  setFrameSource(streamChatFrame, routes.chat, { forceReload });
  setFrameSource(streamAlertsFrame, routes.alerts, { forceReload });
  setFrameSource(streamFullFrame, routes.full, { forceReload });
}

function renderSettings(settings, options = {}) {
  const preserveDraft = Boolean(options.preserveDraft);

  if (!preserveDraft) {
    const normalized = normalizeSettings(settings);
    baseHostInput.value = normalized.baseHost;
    portInput.value = normalized.port;
    envPathInput.value = normalized.envFilePath;
    credsPathInput.value = normalized.userCredsPath;
    if (followAudioFileInput) {
      followAudioFileInput.value = normalized.followAudioFilePath;
    }
    if (subscriptionAudioFileInput) {
      subscriptionAudioFileInput.value = normalized.subscriptionAudioFilePath;
    }
    audioOwnerToggle.checked = normalized.obsAudioOwnerMode;
    if (desktopTtsToggle) {
      desktopTtsToggle.checked = normalized.desktopTtsEnabled;
    }
    audioModeSelect.value = normalized.audioMode;
    obsAutoOpenFullToggle.checked = normalized.obsAutoOpenFullOnStart;
    obsShowSizeHintsToggle.checked = normalized.obsShowSizeHints;
    lastAppliedSettings = normalized;
    settingsInitialized = true;
  }

  obsSizeHints.hidden = !obsShowSizeHintsToggle.checked;
  renderSettingsDirtyIndicator();
}

function renderAudioStatus(state) {
  const audioHealthy = state.audioHealthy;
  const audioPath = state.audioPathActive || 'none';
  const audioMode = state.settings?.audioMode || 'auto';

  // Update badge
  audioStatusBadge.className = audioHealthy ? 'badge badge-running' : 'badge badge-inactive';
  audioStatusBadge.textContent = audioHealthy ? 'Healthy' : 'Checking...';

  // Update details
  audioPathStatus.textContent = audioPath === 'none' ? 'Not available' : audioPath.toUpperCase();
  audioPathStatus.className = `audio-path audio-path-${audioPath}`;

  audioModeStatus.textContent = audioMode;

  if (state.lastAudioHealthCheck) {
    const checkTime = new Date(state.lastAudioHealthCheck);
    const now = new Date();
    const diffSeconds = Math.floor((now - checkTime) / 1000);
    if (diffSeconds < 60) {
      audioLastCheckStatus.textContent = `${diffSeconds}s ago`;
    } else if (diffSeconds < 3600) {
      audioLastCheckStatus.textContent = `${Math.floor(diffSeconds / 60)}m ago`;
    } else {
      audioLastCheckStatus.textContent = checkTime.toLocaleTimeString();
    }
  }

  const serverRunning = state.serverStatus === 'running';
  checkAudioHealthBtn.disabled = !serverRunning;
  runAudioTestBtn.disabled = !serverRunning;
  muteAudioBtn.disabled = !serverRunning;
  testFollowAlertBtn.disabled = !serverRunning;
  testSubscriptionAlertBtn.disabled = !serverRunning;
  testCheerAlertBtn.disabled = !serverRunning;
}

async function hydrate() {
  const state = await window.desktopAPI.getState();
  render(state);
}

function getSettingsPayload() {
  return {
    baseHost: String(baseHostInput.value || '').trim(),
    port: Number.parseInt(String(portInput.value || ''), 10),
    envFilePath: String(envPathInput.value || '').trim(),
    userCredsPath: String(credsPathInput.value || '').trim(),
    followAudioFilePath: String(followAudioFileInput?.value || '').trim(),
    subscriptionAudioFilePath: String(subscriptionAudioFileInput?.value || '').trim(),
    obsAudioOwnerMode: audioOwnerToggle.checked,
    desktopTtsEnabled: desktopTtsToggle ? desktopTtsToggle.checked : true,
    audioMode: audioModeSelect.value || 'auto',
    obsAutoOpenFullOnStart: obsAutoOpenFullToggle.checked,
    obsShowSizeHints: obsShowSizeHintsToggle.checked,
  };
}

const settingsInputs = [
  baseHostInput,
  portInput,
  envPathInput,
  credsPathInput,
  followAudioFileInput,
  subscriptionAudioFileInput,
  audioOwnerToggle,
  desktopTtsToggle,
  audioModeSelect,
  obsAutoOpenFullToggle,
  obsShowSizeHintsToggle,
].filter(Boolean);

settingsInputs.forEach((input) => {
  input.addEventListener('input', () => {
    renderSettingsDirtyIndicator();
  });

  input.addEventListener('change', () => {
    renderSettingsDirtyIndicator();
  });
});

function validateSettingsPayload(payload) {
  const errors = [];

  const hostInvalid = !payload.baseHost;
  const portInvalid = !Number.isInteger(payload.port) || payload.port < 1 || payload.port > 65535;
  const envInvalid = !payload.envFilePath;
  const credsInvalid = !payload.userCredsPath;

  markFieldInvalid(baseHostInput, hostInvalid);
  markFieldInvalid(portInput, portInvalid);
  markFieldInvalid(envPathInput, envInvalid);
  markFieldInvalid(credsPathInput, credsInvalid);

  if (hostInvalid) {
    errors.push('Base Host is required.');
  }

  if (portInvalid) {
    errors.push('Port must be an integer between 1 and 65535.');
  }

  if (envInvalid) {
    errors.push('.env Path is required.');
  }

  if (credsInvalid) {
    errors.push('User Creds Path is required.');
  }

  return errors;
}

async function copyRoutesSummary() {
  if (!latestState || !latestState.routes) {
    return;
  }

  const routes = latestState.routes;
  const payload = [
    `full: ${routes.full}`,
    `chat: ${routes.chat}`,
    `alerts: ${routes.alerts}`,
    `audioManager: ${routes.audioManager}`,
    `auth: ${routes.auth}`,
  ].join('\n');

  const result = await window.desktopAPI.copyText(payload);
  if (result.ok) {
    showInlineMessage('Copied all route URLs to clipboard.');
  }
}

startBtn.addEventListener('click', async () => {
  await window.desktopAPI.startServer();
});

stopBtn.addEventListener('click', async () => {
  await window.desktopAPI.stopServer();
});

logsBtn.addEventListener('click', async () => {
  const result = await window.desktopAPI.openLogs();
  if (!result.ok && result.error) {
    errorText.hidden = false;
    errorText.textContent = result.error;
  }
});

diagnosticsBtn.addEventListener('click', async () => {
  const result = await window.desktopAPI.runDiagnostics();
  if (result.ok) {
    setDiagnostics(result.diagnostics || []);
  }
});

document.querySelectorAll('.route-btn').forEach((button) => {
  button.addEventListener('click', async () => {
    const routePath = button.getAttribute('data-route') || '/full';
    await window.desktopAPI.openOverlay(routePath);
  });
});

document.querySelectorAll('.route-copy-btn').forEach((button) => {
  button.addEventListener('click', async () => {
    const key = button.getAttribute('data-copy');
    if (!latestState || !latestState.routes || !key) {
      return;
    }
    const value = latestState.routes[key];
    if (!value) {
      return;
    }

    const result = await window.desktopAPI.copyText(value);
    if (result.ok) {
      showInlineMessage(`Copied ${key} route to clipboard.`);
    }
  });
});

settingsTabs.forEach((tabButton) => {
  tabButton.addEventListener('click', () => {
    const tabName = tabButton.getAttribute('data-tab') || 'general';
    activateSettingsTab(tabName);
  });
});

appTabs.forEach((tabButton) => {
  tabButton.addEventListener('click', () => {
    const tabName = tabButton.getAttribute('data-app-tab') || 'setup';
    activateAppTab(tabName);
  });
});

browseEnvBtn.addEventListener('click', async () => {
  const result = await window.desktopAPI.pickFile({
    fileType: 'env',
    defaultPath: envPathInput.value || undefined,
  });

  if (result && result.ok && result.filePath) {
    envPathInput.value = result.filePath;
    markFieldInvalid(envPathInput, false);
  }
});

browseCredsBtn.addEventListener('click', async () => {
  const result = await window.desktopAPI.pickFile({
    fileType: 'json',
    defaultPath: credsPathInput.value || undefined,
  });

  if (result && result.ok && result.filePath) {
    credsPathInput.value = result.filePath;
    markFieldInvalid(credsPathInput, false);
  }
});

if (browseFollowAudioBtn) {
  browseFollowAudioBtn.addEventListener('click', async () => {
    const result = await window.desktopAPI.pickFile({
      fileType: 'any',
      defaultPath: followAudioFileInput?.value || undefined,
    });

    if (result && result.ok && result.filePath && followAudioFileInput) {
      followAudioFileInput.value = result.filePath;
    }
  });
}

if (browseSubscriptionAudioBtn) {
  browseSubscriptionAudioBtn.addEventListener('click', async () => {
    const result = await window.desktopAPI.pickFile({
      fileType: 'any',
      defaultPath: subscriptionAudioFileInput?.value || undefined,
    });

    if (result && result.ok && result.filePath && subscriptionAudioFileInput) {
      subscriptionAudioFileInput.value = result.filePath;
    }
  });
}

copyAllRoutesBtn.addEventListener('click', async () => {
  await copyRoutesSummary();
});

quickStartServerBtn.addEventListener('click', async () => {
  await window.desktopAPI.startServer();
});

quickOpenSettingsPathsBtn.addEventListener('click', () => {
  activateAppTab('setup');
  activateSettingsTab('paths');
});

quickOpenSettingsCredsBtn.addEventListener('click', () => {
  activateAppTab('setup');
  activateSettingsTab('paths');
});

quickOpenAuthBtn.addEventListener('click', async () => {
  await window.desktopAPI.openOverlay('/auth');
});

if (quickOpenSettingsFollowAudioBtn) {
  quickOpenSettingsFollowAudioBtn.addEventListener('click', () => {
    activateAppTab('setup');
    activateSettingsTab('obs');
    followAudioFileInput?.focus();
  });
}

if (quickOpenSettingsSubscriptionAudioBtn) {
  quickOpenSettingsSubscriptionAudioBtn.addEventListener('click', () => {
    activateAppTab('setup');
    activateSettingsTab('obs');
    subscriptionAudioFileInput?.focus();
  });
}

quickRunDiagnosticsBtn.addEventListener('click', async () => {
  const result = await window.desktopAPI.runDiagnostics();
  if (result.ok) {
    setDiagnostics(result.diagnostics || []);
    if (latestState) {
      latestState.diagnostics = result.diagnostics || [];
      updateQuickSetupChecklist(latestState);
    }
  }
});

quickOpenFullBtn.addEventListener('click', async () => {
  activateAppTab('stream');
  await window.desktopAPI.openOverlay('/full');
});

quickCopyRoutesBtn.addEventListener('click', async () => {
  await copyRoutesSummary();
});

obsShowSizeHintsToggle.addEventListener('change', () => {
  obsSizeHints.hidden = !obsShowSizeHintsToggle.checked;
});

saveSettingsBtn.addEventListener('click', async () => {
  hideSettingsError();

  const payload = getSettingsPayload();
  const validationErrors = validateSettingsPayload(payload);
  if (validationErrors.length > 0) {
    showSettingsError(validationErrors.join(' '));
    return;
  }

  const result = await window.desktopAPI.saveSettings(payload);
  if (!result.ok) {
    if (Array.isArray(result.validationErrors) && result.validationErrors.length > 0) {
      showSettingsError(result.validationErrors.join(' '));
    }
    showInlineMessage(`Failed to save settings: ${result.error}`);
    return;
  }

  if (result.restartRequired) {
    lastAppliedSettings = normalizeSettings(payload);
    renderSettingsDirtyIndicator();
    showInlineMessage('Settings saved. Restart server to apply runtime changes.');
    return;
  }

  lastAppliedSettings = normalizeSettings(payload);
  renderSettingsDirtyIndicator();
  showInlineMessage('Settings saved.');
});

restartServerBtn.addEventListener('click', async () => {
  hideSettingsError();
  const result = await window.desktopAPI.restartServer();
  if (!result.ok) {
    showInlineMessage(`Restart failed: ${result.error}`);
    return;
  }

  showInlineMessage('Server restarted with updated settings.');
});

audioModeSelect.addEventListener('change', async () => {
  const newMode = audioModeSelect.value;
  const result = await window.desktopAPI.setAudioMode(newMode);
  if (!result.ok) {
    showInlineMessage(`Failed to change audio mode: ${result.error}`);
    return;
  }

  showInlineMessage(`Audio mode changed to ${newMode}.`);
});

checkAudioHealthBtn.addEventListener('click', async () => {
  const result = await window.desktopAPI.checkAudioHealth();
  if (!result.ok) {
    showInlineMessage(`Audio health check failed: ${result.error}`);
    return;
  }

  const status = result.audioHealthy ? 'Healthy' : 'Unhealthy';
  const path = result.audioPathActive || 'none';
  showInlineMessage(`Audio health: ${status} (path: ${path})`);
});

runAudioTestBtn.addEventListener('click', async () => {
  runAudioTestBtn.disabled = true;
  const result = await window.desktopAPI.runAudioTest();
  runAudioTestBtn.disabled = false;

  if (!result.ok) {
    showInlineMessage(`Audio test failed: ${result.error}`);
    return;
  }

  const tested = result.testsQueued || 0;
  showInlineMessage(`Audio test sequence started (${tested} sounds queued).`);
});

muteAudioBtn.addEventListener('click', async () => {
  muteAudioBtn.disabled = true;
  const result = await window.desktopAPI.muteAudio();
  muteAudioBtn.disabled = false;

  if (!result.ok) {
    showInlineMessage(`Mute failed: ${result.error}`);
    return;
  }

  const cleared = result.eventsCleared || 0;
  showInlineMessage(`All audio muted (${cleared} events cleared from queue).`);
});

async function runAlertTest(type) {
  const result = await window.desktopAPI.runAlertTest(type);
  if (!result.ok) {
    showInlineMessage(`Alert test failed: ${result.error}`);
    return;
  }

  const label = (result.alertType || type || '').toUpperCase();
  showInlineMessage(`${label} alert test triggered.`);
}

testFollowAlertBtn.addEventListener('click', async () => {
  testFollowAlertBtn.disabled = true;
  await runAlertTest('follow');
  testFollowAlertBtn.disabled = false;
});

testSubscriptionAlertBtn.addEventListener('click', async () => {
  testSubscriptionAlertBtn.disabled = true;
  await runAlertTest('subscription');
  testSubscriptionAlertBtn.disabled = false;
});

testCheerAlertBtn.addEventListener('click', async () => {
  testCheerAlertBtn.disabled = true;
  await runAlertTest('cheer');
  testCheerAlertBtn.disabled = false;
});

if (connectObsBtn) {
  connectObsBtn.addEventListener('click', async () => {
    connectObsBtn.disabled = true;

    const result = await window.desktopAPI.connectObs();
    if (!result.ok || result.status?.connected !== true) {
      const message = result.error || result.status?.lastError || 'Unable to connect to OBS websocket.';
      showInlineMessage(`OBS reconnect failed: ${message}`);
      connectObsBtn.disabled = false;
      await refreshObsStatus(latestState);
      return;
    }

    showInlineMessage('OBS websocket connected.');
    latestObsStatus = result.status;
    renderObsReconnectBanner(latestState, latestObsStatus);
    connectObsBtn.disabled = false;
  });
}

if (obsRewardRefreshBtn) {
  obsRewardRefreshBtn.addEventListener('click', async () => {
    await refreshObsRewardMappings(latestState);
  });
}

if (obsRewardRegisterBtn) {
  obsRewardRegisterBtn.addEventListener('click', async () => {
    const rewardTitle = String(obsRewardTitleInput?.value || '').trim();
    const primarySourceName = String(obsRewardSourceInput?.value || '').trim();
    const secondarySourceName = String(obsRewardSource2Input?.value || '').trim();

    const sources = [];
    if (primarySourceName) {
      sources.push({ sourceName: primarySourceName });
    }

    if (secondarySourceName) {
      sources.push({ sourceName: secondarySourceName });
    }

    if (!rewardTitle) {
      showInlineMessage('Reward title is required to register an OBS mapping.');
      return;
    }

    if (sources.length === 0) {
      showInlineMessage('At least one OBS source name is required to register an OBS mapping.');
      return;
    }

    obsRewardRegisterBtn.disabled = true;
    const result = await window.desktopAPI.registerObsRewardMapping({
      rewardTitle,
      sources,
    });
    obsRewardRegisterBtn.disabled = false;

    if (!result.ok || result.mapping == null) {
      const message = result.error || 'Failed to register OBS reward mapping.';
      showInlineMessage(message);
      return;
    }

    showInlineMessage(`Registered OBS mapping for reward '${rewardTitle}'.`);
    await refreshObsRewardMappings(latestState);
  });
}

if (obsRewardMappingsList) {
  obsRewardMappingsList.addEventListener('click', async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const action = target.getAttribute('data-action');
    if (action !== 'remove-obs-reward') {
      return;
    }

    const rewardTitle = String(target.getAttribute('data-reward-title') || '').trim();
    if (!rewardTitle) {
      return;
    }

    target.setAttribute('disabled', 'true');

    const result = await window.desktopAPI.removeObsRewardMapping(rewardTitle);
    if (!result.ok || result.removed !== true) {
      const message = result.error || `Could not remove mapping for '${rewardTitle}'.`;
      showInlineMessage(message);
      target.removeAttribute('disabled');
      return;
    }

    showInlineMessage(`Removed OBS mapping for reward '${rewardTitle}'.`);
    await refreshObsRewardMappings(latestState);
  });
}

window.desktopAPI.onStateChanged((state) => {
  render(state);
});

initializeAccordions();
activateSettingsTab('general');
activateAppTab('stream');

hydrate().catch((error) => {
  errorText.hidden = false;
  errorText.textContent = `Failed to initialize UI: ${error.message}`;
});
