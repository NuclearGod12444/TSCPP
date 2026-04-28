// Shared terminal helper utilities
const disabledCommands = {
  lore: {
    code: 'E004',
    reason: 'this is an upcoming feature, which is currently unavailable',
  },
  "theme grey": {
    code: 'E008',
    reason: 'failed to enable grey theme. Error code: E008',
  },
  grey: {
    code: 'E008',
    reason: 'failed to enable grey theme. Error code: E008',
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

function initializeVintageCursor(input) {
  const wrapper = input.closest('.input-line');
  if (!wrapper) return;

  wrapper.style.position = wrapper.style.position || 'relative';

  const cursor = document.createElement('span');
  cursor.className = 'terminal-cursor';
  const measure = document.createElement('span');
  measure.className = 'terminal-cursor-measure';
  wrapper.appendChild(cursor);
  wrapper.appendChild(measure);

  const inputStyle = window.getComputedStyle(input);
  measure.style.font = inputStyle.font;
  measure.style.letterSpacing = inputStyle.letterSpacing;
  measure.style.fontVariant = inputStyle.fontVariant;
  measure.style.fontStyle = inputStyle.fontStyle;
  measure.style.fontWeight = inputStyle.fontWeight;
  measure.style.textTransform = inputStyle.textTransform;
  measure.style.padding = inputStyle.padding;

  function updateCursor() {
    measure.textContent = input.value || '\u00a0';
    const width = measure.getBoundingClientRect().width;
    const wrapperRect = wrapper.getBoundingClientRect();
    const inputRect = input.getBoundingClientRect();
    const left = inputRect.left - wrapperRect.left + width + 2;
    cursor.style.left = `${left}px`;
    cursor.classList.toggle('hidden', !input.matches(':focus'));
  }

  input.addEventListener('input', updateCursor);
  input.addEventListener('focus', updateCursor);
  input.addEventListener('blur', updateCursor);
  updateCursor();
}

const terminalAudioContext = new (window.AudioContext || window.webkitAudioContext)();

function ensureAudioContext() {
  if (terminalAudioContext.state === 'suspended') {
    terminalAudioContext.resume().catch(() => {});
  }
}

function playTone(frequency = 880, duration = 0.016, type = 'square', volume = 0.05) {
  if (!terminalAudioContext) return;
  try {
    const oscillator = terminalAudioContext.createOscillator();
    const gain = terminalAudioContext.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.value = volume;
    oscillator.connect(gain);
    gain.connect(terminalAudioContext.destination);
    oscillator.start();
    oscillator.stop(terminalAudioContext.currentTime + duration);
  } catch (error) {
    // Audio may be blocked by browser autoplay policy.
  }
}

function isSoundEnabled() {
  return localStorage.getItem('terminalSoundEnabled') !== 'false';
}

function updateSoundToggle(button) {
  if (!button) return;
  const enabled = isSoundEnabled();
  button.classList.toggle('sound-toggle--off', !enabled);
  button.textContent = enabled ? '🔊' : '🔇';
  button.setAttribute('aria-pressed', String(enabled));
  button.title = enabled ? 'Typing sound enabled' : 'Typing sound muted';
}

function initializeSoundToggle() {
  const titleBar = document.querySelector('.title-bar');
  if (!titleBar) return null;

  let button = document.getElementById('soundToggle');
  if (!button) {
    button = document.createElement('button');
    button.id = 'soundToggle';
    button.type = 'button';
    button.className = 'sound-toggle';
    titleBar.appendChild(button);
  }

  updateSoundToggle(button);
  button.addEventListener('click', () => {
    const enabled = !isSoundEnabled();
    localStorage.setItem('terminalSoundEnabled', enabled ? 'true' : 'false');
    updateSoundToggle(button);
  });
  return button;
}

function playTypeSound() {
  if (!isSoundEnabled()) return;
  ensureAudioContext();
  playTone(900 + Math.random() * 100, 0.01, 'square', 0.03);
}

function playBootSound() {
  if (!isSoundEnabled()) return;
  ensureAudioContext();
  playTone(240, 0.08, 'sine', 0.04);
}

function createBootOverlay(screen) {
  const overlay = document.createElement('div');
  overlay.className = 'boot-overlay';
  const lines = document.createElement('div');
  lines.className = 'boot-lines';
  overlay.appendChild(lines);
  screen.appendChild(overlay);
  return overlay;
}

async function typeBootLine(overlay, text, waitFn) {
  const container = overlay.querySelector('.boot-lines');
  const line = document.createElement('div');
  line.className = 'boot-line';
  container.appendChild(line);
  for (let i = 0; i < text.length; i++) {
    line.textContent += text[i];
    playTypeSound();
    await waitFn(16 + Math.random() * 32);
  }
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
