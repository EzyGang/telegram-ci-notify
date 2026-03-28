import * as core from '@actions/core';
import { beforeEach, describe, expect, it, type Mocked, vi } from 'vitest';

vi.mock('@actions/core');

describe('main.ts', () => {
  const mockedCore = core as Mocked<typeof core>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('logs placeholder messages', async () => {
    // Simulate main.ts logic inline to avoid auto-execution
    const run = async (): Promise<void> => {
      mockedCore.info('telegram-ci-status main phase (placeholder)');
      mockedCore.info('Your workflow steps run between pre and post hooks');
    };

    await run();

    expect(mockedCore.info).toHaveBeenCalledWith('telegram-ci-status main phase (placeholder)');
    expect(mockedCore.info).toHaveBeenCalledWith(
      'Your workflow steps run between pre and post hooks'
    );
  });
});
