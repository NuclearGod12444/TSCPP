// Shared terminal helper utilities
const disabledCommands = {
  lore: {
    code: 'E004',
    reason: 'this is an upcoming feature, which is currently unavailable',
  },
  // Add disabled commands here by name.
  // Example:
  // test: { code: 'E004', reason: 'access denied' },
};

const terminalThemes = {
  grey: { label: 'GREY' },
  blue: { label: 'BLUE' },
  green: { label: 'GREEN' },
  red: { label: 'RED' },
};

function getDisabledCommand(normalized) {
  return disabledCommands[normalized] || null;
}

function handleDisabledCommand(normalized, appendOutput) {
  const disabled = getDisabledCommand(normalized);
  if (!disabled) return false;
  appendOutput(
    `Command ${normalized} is temporarily unavailable [${disabled.code}] - ${disabled.reason}.`,
    'typing active'
  );
  return true;
}

function getBootLockState() {
  return localStorage.getItem('terminalBootLocked') === 'true';
}

function setBootLockState(value) {
  if (value) {
    localStorage.setItem('terminalBootLocked', 'true');
  } else {
    localStorage.removeItem('terminalBootLocked');
  }
}

function showBootFailure(terminalContent) {
  if (!terminalContent) return;
  terminalContent.innerHTML = '';
  const failureLine = document.createElement('div');
  failureLine.className = 'line typing active terminal-error';
  failureLine.textContent = 'terminal failed to boot';
  terminalContent.appendChild(failureLine);
}

const SESSION_TIMEOUT_MS = 20 * 60 * 1000;
const SESSION_TIMEOUT_SECONDS = 20 * 60;
let sessionTimeoutId = null;
let countdownIntervalId = null;
let sessionLocked = false;
let remainingSeconds = SESSION_TIMEOUT_SECONDS;
const TIMEOUT_MESSAGE = 'Session timed out due to inactivity. Type connect to unlock the terminal.';

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
  const secs = (seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${secs}`;
}

function updateTimeoutDisplay() {
  const timerEl = document.getElementById('timeoutTimer');
  if (!timerEl) return;
  timerEl.textContent = sessionLocked ? 'LOCKED' : formatTime(remainingSeconds);
}

function clearSessionTimers() {
  clearTimeout(sessionTimeoutId);
  clearInterval(countdownIntervalId);
}

function resetSessionTimeout(appendOutput) {
  if (sessionLocked) return;
  clearSessionTimers();
  remainingSeconds = SESSION_TIMEOUT_SECONDS;
  updateTimeoutDisplay();

  countdownIntervalId = window.setInterval(() => {
    if (sessionLocked) return;
    remainingSeconds -= 1;
    if (remainingSeconds <= 0) {
      remainingSeconds = 0;
      sessionLocked = true;
      updateTimeoutDisplay();
      appendOutput(TIMEOUT_MESSAGE, 'typing active');
      clearSessionTimers();
      return;
    }
    updateTimeoutDisplay();
  }, 1000);

  sessionTimeoutId = window.setTimeout(() => {
    sessionLocked = true;
    remainingSeconds = 0;
    updateTimeoutDisplay();
    appendOutput(TIMEOUT_MESSAGE, 'typing active');
    clearSessionTimers();
  }, SESSION_TIMEOUT_MS);
}

function initializeSessionTimeout(commandInput, appendOutput) {
  sessionLocked = false;
  resetSessionTimeout(appendOutput);
  commandInput.addEventListener('keydown', () => {
    if (!sessionLocked) {
      resetSessionTimeout(appendOutput);
    }
  });
}

function handleSessionCommand(normalized, appendOutput) {
  if (normalized === 'connect') {
    if (sessionLocked) {
      sessionLocked = false;
      resetSessionTimeout(appendOutput);
      appendOutput('Terminal unlocked. Session resumed.', 'typing active');
      return true;
    }

    appendOutput('Terminal already connected.', 'typing active');
    return true;
  }

  if (sessionLocked) {
    appendOutput(TIMEOUT_MESSAGE, 'typing active');
    return true;
  }

  return false;
}

function applyTerminalTheme(themeName) {
  const validTheme = terminalThemes[themeName] ? themeName : 'grey';
  document.body.classList.remove('theme-grey', 'theme-blue', 'theme-green', 'theme-red');
  document.body.classList.add(`theme-${validTheme}`);
  return validTheme;
}

function handleThemeCommand(normalized, appendOutput) {
  const parts = normalized.split(' ').filter(Boolean);
  const isThemeCommand = parts[0] === 'theme';
  const themeName = isThemeCommand ? parts[1] : parts[0];

  if (!isThemeCommand && !terminalThemes[normalized]) {
    return false;
  }

  if (isThemeCommand && parts.length !== 2) {
    appendOutput('Usage: theme <grey|blue|green|red>', 'typing active');
    return true;
  }

  if (!terminalThemes[themeName]) {
    appendOutput('Theme not found. Available: grey, blue, green, red.', 'typing active');
    return true;
  }

  applyTerminalTheme(themeName);
  appendOutput(`Terminal theme set to ${themeName.toUpperCase()}.`, 'typing active');
  return true;
}
