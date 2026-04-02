const statusBadge = document.getElementById('statusBadge');
const errorText = document.getElementById('errorText');
const serverUrlText = document.getElementById('serverUrl');
const diagnosticsList = document.getElementById('diagnosticsList');

const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const logsBtn = document.getElementById('logsBtn');
const diagnosticsBtn = document.getElementById('diagnosticsBtn');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const restartServerBtn = document.getElementById('restartServerBtn');
const copyAllRoutesBtn = document.getElementById('copyAllRoutesBtn');
const settingsErrorText = document.getElementById('settingsErrorText');

const baseHostInput = document.getElementById('baseHostInput');
const portInput = document.getElementById('portInput');
const envPathInput = document.getElementById('envPathInput');
const credsPathInput = document.getElementById('credsPathInput');
const audioOwnerToggle = document.getElementById('audioOwnerToggle');
const browseEnvBtn = document.getElementById('browseEnvBtn');
const browseCredsBtn = document.getElementById('browseCredsBtn');
const settingsTabs = document.querySelectorAll('.settings-tab');
const settingsPanels = document.querySelectorAll('.settings-panel');

let latestState = null;

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
  renderSettings(state.settings || {});
  restartServerBtn.hidden = !state.settingsRestartRequired;
}

function renderSettings(settings) {
  baseHostInput.value = settings.baseHost || 'localhost';
  portInput.value = settings.port || 3000;
  envPathInput.value = settings.envFilePath || '';
  credsPathInput.value = settings.userCredsPath || '';
  audioOwnerToggle.checked = Boolean(settings.obsAudioOwnerMode);
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
    obsAudioOwnerMode: audioOwnerToggle.checked,
  };
}

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
    `redemptions: ${routes.redemptions}`,
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

copyAllRoutesBtn.addEventListener('click', async () => {
  await copyRoutesSummary();
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
    showInlineMessage('Settings saved. Restart server to apply runtime changes.');
    return;
  }

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

window.desktopAPI.onStateChanged((state) => {
  render(state);
});

hydrate().catch((error) => {
  errorText.hidden = false;
  errorText.textContent = `Failed to initialize UI: ${error.message}`;
});

activateSettingsTab('general');
