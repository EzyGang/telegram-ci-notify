import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GitHubContext } from '../src/github-context';

// Create a mutable mock payload object
const mockPayload: Record<string, unknown> = {};

// Mock @actions/core
vi.mock('@actions/core', () => ({
  info: vi.fn(),
  warning: vi.fn(),
  error: vi.fn(),
  debug: vi.fn()
}));

// Mock @actions/github - must use factory function for hoisted mock
vi.mock('@actions/github', () => ({
  context: {
    payload: mockPayload
  }
}));

describe('getGitHubContext', () => {
  const originalEnv = process.env;
  let getGitHubContext: typeof import('../src/github-context').getGitHubContext;

  beforeEach(async () => {
    vi.resetModules();
    process.env = { ...originalEnv };
    vi.clearAllMocks();
    // Clear mock payload
    for (const key of Object.keys(mockPayload)) {
      delete mockPayload[key];
    }
    // Re-import to get fresh module with cleared mocks
    const module = await import('../src/github-context');
    getGitHubContext = module.getGitHubContext;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns context with environment variables', () => {
    process.env.GITHUB_REPOSITORY = 'owner/repo';
    process.env.GITHUB_REF = 'refs/heads/main';
    process.env.GITHUB_SHA = 'abc123def456';
    process.env.GITHUB_WORKFLOW = 'Test Workflow';
    process.env.GITHUB_ACTOR = 'testuser';
    process.env.GITHUB_RUN_NUMBER = '42';
    process.env.GITHUB_RUN_ID = '123456';
    process.env.GITHUB_RUN_ATTEMPT = '1';
    process.env.GITHUB_EVENT_NAME = 'push';
    process.env.GITHUB_SERVER_URL = 'https://github.com';

    const context = getGitHubContext();

    expect(context.repository).toBe('owner/repo');
    expect(context.ref).toBe('refs/heads/main');
    expect(context.sha).toBe('abc123def456');
    expect(context.workflow).toBe('Test Workflow');
    expect(context.actor).toBe('testuser');
    expect(context.runNumber).toBe('42');
    expect(context.runId).toBe('123456');
    expect(context.runAttempt).toBe('1');
    expect(context.eventName).toBe('push');
    expect(context.serverUrl).toBe('https://github.com');
  });

  it('uses default values for missing environment variables', () => {
    // Clear all GitHub environment variables to test defaults
    process.env.GITHUB_REPOSITORY = undefined;
    process.env.GITHUB_REF = undefined;
    process.env.GITHUB_SHA = undefined;
    process.env.GITHUB_WORKFLOW = undefined;
    process.env.GITHUB_ACTOR = undefined;
    process.env.GITHUB_RUN_NUMBER = undefined;
    process.env.GITHUB_RUN_ID = undefined;
    process.env.GITHUB_RUN_ATTEMPT = undefined;
    process.env.GITHUB_EVENT_NAME = undefined;
    process.env.GITHUB_SERVER_URL = undefined;

    const context = getGitHubContext();

    expect(context.repository).toBe('unknown/unknown');
    expect(context.ref).toBe('unknown');
    expect(context.sha).toBe('unknown');
    expect(context.workflow).toBe('unknown');
    expect(context.actor).toBe('unknown');
    expect(context.runNumber).toBe('0');
    expect(context.runId).toBe('0');
    expect(context.runAttempt).toBe('1');
    expect(context.eventName).toBe('unknown');
    expect(context.serverUrl).toBe('https://github.com');
  });

  it('detects deployment from explicit flag', () => {
    const context = getGitHubContext(true);
    expect(context.isDeployment).toBe(true);
  });

  it('detects deployment from deployment event', () => {
    process.env.GITHUB_EVENT_NAME = 'deployment';
    const context = getGitHubContext();
    expect(context.isDeployment).toBe(true);
  });

  it('detects deployment from deployment_status event', () => {
    process.env.GITHUB_EVENT_NAME = 'deployment_status';
    const context = getGitHubContext();
    expect(context.isDeployment).toBe(true);
  });

  it('detects deployment from tag ref', () => {
    process.env.GITHUB_REF = 'refs/tags/v1.0.0';
    const context = getGitHubContext();
    expect(context.isDeployment).toBe(true);
  });

  it('detects deployment from workflow_dispatch with environment', () => {
    process.env.GITHUB_EVENT_NAME = 'workflow_dispatch';
    mockPayload.inputs = { environment: 'production' };

    const context = getGitHubContext();
    expect(context.isDeployment).toBe(true);
  });

  it('detects deployment from environment in payload', () => {
    process.env.GITHUB_EVENT_NAME = 'push';
    mockPayload.environment = 'staging';

    const context = getGitHubContext();
    expect(context.isDeployment).toBe(true);
  });

  it('detects deployment from deployment object in payload', () => {
    process.env.GITHUB_EVENT_NAME = 'push';
    mockPayload.deployment = { environment: 'production' };

    const context = getGitHubContext();
    expect(context.isDeployment).toBe(true);
  });

  it('does not detect deployment for regular push', () => {
    process.env.GITHUB_EVENT_NAME = 'push';
    process.env.GITHUB_REF = 'refs/heads/main';
    // No payload set

    const context = getGitHubContext();
    expect(context.isDeployment).toBe(false);
  });
});

describe('getShaShort', () => {
  it('returns first 7 characters of SHA', async () => {
    const { getShaShort } = await import('../src/github-context');
    expect(getShaShort('abc123def456789')).toBe('abc123d');
  });

  it('handles short SHAs', async () => {
    const { getShaShort } = await import('../src/github-context');
    expect(getShaShort('abc')).toBe('abc');
  });
});

describe('getRunUrl', () => {
  it('constructs correct run URL', async () => {
    const { getRunUrl } = await import('../src/github-context');
    const context: GitHubContext = {
      repository: 'owner/repo',
      ref: 'refs/heads/main',
      sha: 'abc123',
      workflow: 'Test',
      actor: 'user',
      runNumber: '1',
      runId: '123',
      runAttempt: '1',
      eventName: 'push',
      serverUrl: 'https://github.com',
      isDeployment: false
    };

    expect(getRunUrl(context)).toBe('https://github.com/owner/repo/actions/runs/123');
  });
});
