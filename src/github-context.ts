import * as core from '@actions/core';
import * as github from '@actions/github';

export interface GitHubContext {
  repository: string;
  ref: string;
  sha: string;
  workflow: string;
  actor: string;
  runNumber: string;
  runId: string;
  runAttempt: string;
  eventName: string;
  serverUrl: string;
  isDeployment: boolean;
}

export function getGitHubContext(explicitIsDeployment?: boolean): GitHubContext {
  const env = process.env;

  const baseContext = {
    repository: env.GITHUB_REPOSITORY || 'unknown/unknown',
    ref: env.GITHUB_REF || 'unknown',
    sha: env.GITHUB_SHA || 'unknown',
    workflow: env.GITHUB_WORKFLOW || 'unknown',
    actor: env.GITHUB_ACTOR || 'unknown',
    runNumber: env.GITHUB_RUN_NUMBER || '0',
    runId: env.GITHUB_RUN_ID || '0',
    runAttempt: env.GITHUB_RUN_ATTEMPT || '1',
    eventName: env.GITHUB_EVENT_NAME || 'unknown',
    serverUrl: env.GITHUB_SERVER_URL || 'https://github.com'
  };

  return {
    ...baseContext,
    isDeployment: explicitIsDeployment ?? detectDeployment(baseContext.eventName, baseContext.ref)
  };
}

function detectDeployment(eventName: string, ref: string): boolean {
  // Direct deployment events
  if (eventName === 'deployment' || eventName === 'deployment_status') {
    core.info(`Detected deployment: direct deployment event (${eventName})`);
    return true;
  }

  // Tag releases are typically deployments
  if (ref.startsWith('refs/tags/')) {
    core.info(`Detected deployment: tag release (${ref})`);
    return true;
  }

  // Check if there's an environment configured in the webhook payload
  const payload = github.context.payload;
  core.info(`Checking deployment detection - event: ${eventName}, ref: ${ref}`);

  if (payload) {
    if (payload.environment || payload.inputs?.environment || payload.deployment?.environment) {
      core.info('Detected deployment: environment found in payload');
      return true;
    }
  }

  core.info('Not detected as deployment');
  return false;
}

export function getShaShort(sha: string): string {
  return sha.slice(0, 7);
}

export function getRunUrl(context: GitHubContext): string {
  return `${context.serverUrl}/${context.repository}/actions/runs/${context.runId}`;
}
