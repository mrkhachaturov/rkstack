import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

declare const VERSION: string;

/**
 * Resolve the version string.
 * At build time: injected via `bun build --define "VERSION=\"x.y.z\""`.
 * At test/dev time (no --define): reads from VERSION file at repo root.
 */
function resolveVersion(): string {
  try {
    return VERSION; // ReferenceError if --define was not used
  } catch {
    const dir = dirname(fileURLToPath(import.meta.url));
    return readFileSync(join(dir, '..', '..', '..', 'VERSION'), 'utf8').trim();
  }
}

export const VERSION_STRING = resolveVersion();

export function run(): void {
  console.log(VERSION_STRING);
}
