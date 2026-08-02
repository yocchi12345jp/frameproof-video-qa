const UNSAFE_OUTSIDE_QUOTES = new Set([';', '|', '&', '<', '>', '`', '\n', '\r', '\0']);

const tokenize = (value) => {
  const text = String(value ?? '').trim();
  if (!text) throw new Error('Command must not be empty');
  const tokens = [];
  let current = '';
  let quote;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (!quote && UNSAFE_OUTSIDE_QUOTES.has(char)) {
      throw new Error(`Shell operators are not supported in guarded commands: ${char === '\n' || char === '\r' ? 'newline' : char}`);
    }
    if (!quote && char === '$' && text[index + 1] === '(') throw new Error('Command substitution is not supported in guarded commands');
    if (!quote && char === '\\') {
      const next = text[index + 1];
      if (next && (/\s/.test(next) || ['\\', '"', "'"].includes(next))) { current += next; index += 1; }
      else current += char;
      continue;
    }
    if (quote && char === '\\' && quote === '"') {
      const next = text[index + 1];
      if (next && ['\\', '"'].includes(next)) { current += next; index += 1; }
      else current += char;
      continue;
    }
    if (char === '"' || char === "'") {
      if (!quote) { quote = char; continue; }
      if (quote === char) { quote = undefined; continue; }
    }
    if (!quote && /\s/.test(char)) {
      if (current) { tokens.push(current); current = ''; }
      continue;
    }
    current += char;
  }
  if (quote) throw new Error('Guarded command contains an unterminated quote');
  if (current) tokens.push(current);
  if (tokens.length === 0) throw new Error('Command must not be empty');
  return tokens;
};

export const normalizeCommandSpec = (value) => {
  if (Array.isArray(value)) {
    if (value.length === 0 || typeof value[0] !== 'string' || !value[0].trim() || value.slice(1).some((item) => typeof item !== 'string')) throw new Error('Command array requires a non-empty executable followed by string arguments');
    return {command: value[0], args: value.slice(1)};
  }
  if (value && typeof value === 'object') {
    const command = value.command;
    const args = value.args ?? [];
    if (typeof command !== 'string' || !command.trim()) throw new Error('Command object requires a non-empty command');
    if (!Array.isArray(args) || args.some((item) => typeof item !== 'string')) throw new Error('Command object args must be an array of strings');
    return {command: command.trim(), args};
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.startsWith('[')) {
      let parsed;
      try { parsed = JSON.parse(trimmed); } catch { throw new Error('JSON command must be an array of strings'); }
      return normalizeCommandSpec(parsed);
    }
    const tokens = tokenize(trimmed);
    return {command: tokens[0], args: tokens.slice(1)};
  }
  throw new Error('Command must be a string, string array, or {command,args} object');
};

const replaceTokens = (value, tokens) => String(value).replace(/\{([a-zA-Z0-9]+)\}/g, (_, key) => tokens[key] ?? `{${key}}`);

export const resolveCommandSpec = (value, tokens = {}) => {
  const spec = normalizeCommandSpec(value);
  return {command: replaceTokens(spec.command, tokens), args: spec.args.map((arg) => replaceTokens(arg, tokens))};
};

export const displayCommandSpec = (spec) => [spec.command, ...(spec.args ?? [])].map((part) => /[\s"']/.test(part) ? JSON.stringify(part) : part).join(' ');
