// Shared terminal helper utilities
const disabledCommands = {
  beta: {
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
