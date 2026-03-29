import type { Resolver } from './types';
import { generatePreamble, generateTestFailureTriage } from './preamble';
import { generateBaseBranchDetect, generateCoAuthorTrailer } from './utility';
import { generateCommandReference, generateSnapshotFlags, generateBrowseSetup } from './browse';

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
  TEST_FAILURE_TRIAGE: generateTestFailureTriage,
  BASE_BRANCH_DETECT: generateBaseBranchDetect,
  CO_AUTHOR_TRAILER: generateCoAuthorTrailer,
  COMMAND_REFERENCE: generateCommandReference,
  SNAPSHOT_FLAGS: generateSnapshotFlags,
  BROWSE_SETUP: generateBrowseSetup,
};
