import { describe, expect, it } from 'vitest';
import type { GitHubContext } from '../src/github-context';
import { buildCompleteMessage, buildStartMessage, escapeHtml } from '../src/message-builder';

describe('escapeHtml', () => {
  it('escapes HTML special characters', () => {
    expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
    expect(escapeHtml('&')).toBe('&amp;');
    expect(escapeHtml('"')).toBe('&quot;');
    expect(escapeHtml('>')).toBe('&gt;');
  });

  it('preserves allowed tags', () => {
    expect(escapeHtml('<b>text</b>')).toBe('<b>text</b>');
    expect(escapeHtml('<strong>bold</strong>')).toBe('<strong>bold</strong>');
    expect(escapeHtml('<i>italic</i>')).toBe('<i>italic</i>');
    expect(escapeHtml('<em>emphasis</em>')).toBe('<em>emphasis</em>');
    expect(escapeHtml('<u>underline</u>')).toBe('<u>underline</u>');
    expect(escapeHtml('<ins>inserted</ins>')).toBe('<ins>inserted</ins>');
    expect(escapeHtml('<s>strikethrough</s>')).toBe('<s>strikethrough</s>');
    expect(escapeHtml('<strike>strike</strike>')).toBe('<strike>strike</strike>');
    expect(escapeHtml('<del>deleted</del>')).toBe('<del>deleted</del>');
    expect(escapeHtml('<code>code</code>')).toBe('<code>code</code>');
    expect(escapeHtml('<pre>preformatted</pre>')).toBe('<pre>preformatted</pre>');
  });

  it('preserves anchor tags with href', () => {
    expect(escapeHtml('<a href="http://example.com">link</a>')).toBe(
      '<a href="http://example.com">link</a>'
    );
  });

  it('escapes disallowed tags', () => {
    expect(escapeHtml('<div>text</div>')).toBe('&lt;div&gt;text&lt;/div&gt;');
    expect(escapeHtml('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  it('handles empty strings', () => {
    expect(escapeHtml('')).toBe('');
    expect(escapeHtml(null as unknown as string)).toBe('');
  });
});

describe('buildStartMessage', () => {
  const baseContext: GitHubContext = {
    repository: 'owner/repo',
    ref: 'refs/heads/main',
    sha: 'abc123def456',
    workflow: 'Test Workflow',
    actor: 'testuser',
    runNumber: '42',
    runId: '123456',
    runAttempt: '1',
    eventName: 'push',
    serverUrl: 'https://github.com',
    isDeployment: false
  };

  it('builds correct message for CI run', () => {
    const message = buildStartMessage(baseContext);

    expect(message).toContain('⏳ Workflow started...');
    expect(message).toContain('📦');
    expect(message).toContain('owner/repo');
    expect(message).toContain('🔀');
    expect(message).toContain('main');
    expect(message).toContain('abc123d');
    expect(message).toContain('⚡');
    expect(message).toContain('Test Workflow');
    expect(message).toContain('👤');
    expect(message).toContain('testuser');
    expect(message).toContain('🔢');
    expect(message).toContain('42');
    expect(message).toContain('🕐');
    expect(message).toContain('UTC');
    expect(message).toContain(
      '<a href="https://github.com/owner/repo/actions/runs/123456">View run</a>'
    );
  });

  it('builds correct message for deployment', () => {
    const deploymentContext = { ...baseContext, isDeployment: true, ref: 'refs/tags/v1.0.0' };
    const message = buildStartMessage(deploymentContext);

    expect(message).toContain('🚀 Deployment in progress...');
    expect(message).toContain('📦');
    expect(message).toContain('v1.0.0');
  });

  it('handles tag refs correctly', () => {
    const tagContext = { ...baseContext, ref: 'refs/tags/v2.0.0' };
    const message = buildStartMessage(tagContext);

    expect(message).toContain('Tag:');
    expect(message).toContain('v2.0.0');
  });
});

describe('buildCompleteMessage', () => {
  const baseContext: GitHubContext = {
    repository: 'owner/repo',
    ref: 'refs/heads/main',
    sha: 'abc123def456',
    workflow: 'Test Workflow',
    actor: 'testuser',
    runNumber: '42',
    runId: '123456',
    runAttempt: '1',
    eventName: 'push',
    serverUrl: 'https://github.com',
    isDeployment: false
  };

  it('builds success message', () => {
    const message = buildCompleteMessage(baseContext, 'success');

    expect(message).toContain('✨ Workflow completed');
    expect(message).toContain('📦');
    expect(message).toContain('owner/repo');
    expect(message).toContain('🏁');
    expect(message).toContain('UTC');
    expect(message).toContain('View run');
  });

  it('builds failure message', () => {
    const message = buildCompleteMessage(baseContext, 'failure');

    expect(message).toContain('🔴 Workflow failed');
  });

  it('builds cancelled message', () => {
    const message = buildCompleteMessage(baseContext, 'cancelled');

    expect(message).toContain('🚫 Workflow cancelled');
  });

  it('builds deployment success message', () => {
    const deploymentContext = { ...baseContext, isDeployment: true };
    const message = buildCompleteMessage(deploymentContext, 'success');

    expect(message).toContain('🚀 Deployment successful');
  });

  it('builds deployment failure message', () => {
    const deploymentContext = { ...baseContext, isDeployment: true };
    const message = buildCompleteMessage(deploymentContext, 'failure');

    expect(message).toContain('💥 Deployment failed');
  });

  it('includes duration when provided', () => {
    const message = buildCompleteMessage(baseContext, 'success', '125');

    expect(message).toContain('⏱️');
    expect(message).toContain('2m 5s');
  });

  it('formats short durations', () => {
    const message = buildCompleteMessage(baseContext, 'success', '45');

    expect(message).toContain('⏱️');
    expect(message).toContain('45s');
  });

  it('formats long durations', () => {
    const message = buildCompleteMessage(baseContext, 'success', '3665');

    expect(message).toContain('⏱️');
    expect(message).toContain('1h 1m');
  });

  it('handles unknown status', () => {
    const message = buildCompleteMessage(baseContext, 'unknown');

    expect(message).toContain('❓ Workflow unknown');
  });
});
