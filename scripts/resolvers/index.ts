import type { Resolver } from './types';
import { generatePreamble, generateTestFailureTriage } from './preamble';
import { generateBaseBranchDetect, generateCoAuthorTrailer, generateQAMethodology } from './utility';
import { generateCommandReference, generateSnapshotFlags, generateBrowseSetup } from './browse';
import { generateDesignMethodology, generateDesignHardRules } from './design';
import { generateTestBootstrap, generateTestCoverageAuditShip, generateTestCoverageAuditReview } from './testing';
import { generateAdversarialStep, generatePlanCompletionAuditShip, generatePlanCompletionAuditReview, generatePlanVerificationExec, generateReviewDashboard } from './review';

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
  DESIGN_METHODOLOGY: generateDesignMethodology,
  DESIGN_HARD_RULES: generateDesignHardRules,
  QA_METHODOLOGY: generateQAMethodology,
  TEST_BOOTSTRAP: generateTestBootstrap,
  TEST_COVERAGE_AUDIT_SHIP: generateTestCoverageAuditShip,
  TEST_COVERAGE_AUDIT_REVIEW: generateTestCoverageAuditReview,
  ADVERSARIAL_STEP: generateAdversarialStep,
  PLAN_COMPLETION_AUDIT_SHIP: generatePlanCompletionAuditShip,
  PLAN_COMPLETION_AUDIT_REVIEW: generatePlanCompletionAuditReview,
  PLAN_VERIFICATION_EXEC: generatePlanVerificationExec,
  REVIEW_DASHBOARD: generateReviewDashboard,
};
