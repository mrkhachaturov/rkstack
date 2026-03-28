import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';

type ConfigObject = Record<string, unknown>;

function readConfig(filePath: string): ConfigObject {
  if (!existsSync(filePath)) return {};
  try {
    return JSON.parse(readFileSync(filePath, 'utf8')) as ConfigObject;
  } catch {
    return {};
  }
}

function writeConfig(filePath: string, data: ConfigObject): void {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

/** Validate a dotted key: non-empty, no empty segments, no leading/trailing dots. */
export function isValidKey(key: string): boolean {
  if (!key || key.startsWith('.') || key.endsWith('.') || key.includes('..')) return false;
  return key.split('.').every(part => part.length > 0);
}

/** Traverse a dotted key path into a nested object, returning the value as string or ''. */
export function configGet(filePath: string, key: string): string {
  const data = readConfig(filePath);
  const parts = key.split('.');
  let node: unknown = data;
  for (const part of parts) {
    if (node === null || typeof node !== 'object') return '';
    node = (node as Record<string, unknown>)[part];
  }
  if (node === undefined || node === null) return '';
  if (typeof node === 'object') return '';
  return String(node);
}

/** Set a dotted key path in the config file. Creates the file if missing. */
export function configSet(filePath: string, key: string, value: string): void {
  if (!isValidKey(key)) {
    process.stderr.write(`Invalid config key: "${key}". Keys must be non-empty with no empty segments.\n`);
    return;
  }
  const data = readConfig(filePath);
  const parts = key.split('.');
  let node: Record<string, unknown> = data;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (node[part] !== undefined && (typeof node[part] !== 'object' || node[part] === null)) {
      process.stderr.write(`Warning: overwriting non-object value at "${parts.slice(0, i + 1).join('.')}" with nested object.\n`);
      node[part] = {};
    } else if (node[part] === undefined) {
      node[part] = {};
    }
    node = node[part] as Record<string, unknown>;
  }
  node[parts[parts.length - 1]] = value;
  writeConfig(filePath, data);
}

/** Flatten nested config to `key = value` lines. Returns '' if file is missing. */
export function configList(filePath: string): string {
  if (!existsSync(filePath)) return '';
  const data = readConfig(filePath);
  const lines: string[] = [];

  function flatten(obj: unknown, prefix: string): void {
    if (obj === null || typeof obj !== 'object') {
      lines.push(`${prefix} = ${String(obj)}`);
      return;
    }
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      const fullKey = prefix ? `${prefix}.${k}` : k;
      if (typeof v === 'object' && v !== null) {
        flatten(v, fullKey);
      } else {
        lines.push(`${fullKey} = ${String(v)}`);
      }
    }
  }

  flatten(data, '');
  return lines.join('\n');
}

export function run(args: string[], configFilePath: string): void {
  const [subcommand, ...rest] = args;
  switch (subcommand) {
    case 'get': {
      const [key] = rest;
      if (!key) { process.stderr.write('Usage: rkstack config get <key>\n'); process.exit(1); }
      console.log(configGet(configFilePath, key));
      break;
    }
    case 'set': {
      const [key, value] = rest;
      if (!key || value === undefined) { process.stderr.write('Usage: rkstack config set <key> <value>\n'); process.exit(1); }
      configSet(configFilePath, key, value);
      break;
    }
    case 'list': {
      const output = configList(configFilePath);
      if (output) console.log(output);
      break;
    }
    default:
      process.stderr.write(`Unknown config subcommand: ${subcommand ?? '(none)'}. Use get, set, or list.\n`);
      process.exit(1);
  }
}
