import type { Resolver } from './types';
import { generatePreamble } from './preamble';

/**
 * Registry of all placeholder resolvers.
 * Key = placeholder name (without braces), value = resolver function.
 *
 * To add a new placeholder:
 * 1. Create a resolver function in the appropriate file under resolvers/
 * 2. Register it here
 * 3. Use {{PLACEHOLDER_NAME}} in any .tmpl file
 */
export const RESOLVERS: Record<string, Resolver> = {
  PREAMBLE: generatePreamble,
};
