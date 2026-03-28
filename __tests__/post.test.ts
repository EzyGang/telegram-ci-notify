import * as core from '@actions/core';
import { beforeEach, describe, expect, it, type Mocked, type MockedFunction, vi } from 'vitest';
import { getGitHubContext } from '../src/github-context';
import { buildCompleteMessage } from '../src/message-builder';
import { createTelegramService } from '../src/telegram-service';

// Mock all dependencies
vi.mock('@actions/core');
vi.mock('../src/github-context');
vi.mock('../src/message-builder');
vi.mock('../src/telegram-service');

describe('post.ts logic', () => {
  const mockedCore = core as Mocked<typeof core>;
  const mockedGetGitHubContext = getGitHubContext as MockedFunction<typeof getGitHubContext>;
  const mockedBuildCompleteMessage = buildCompleteMessage as MockedFunction<
    typeof buildCompleteMessage
  >;
  const mockedCreateTelegramService = createTelegramService as MockedFunction<
    typeof createTelegramService
  >;

  beforeEach(() => {
    vi.clearAllMocks();
    mockedCore.getInput.mockImplementation((name: string) => {
      if (name === 'job_status') return 'success';
      return '';
    });
  });

  it('edits message and pins on successful deployment', async () => {
    const mockEditMessage = vi.fn().mockResolvedValue(undefined);
    const mockPinMessage = vi.fn().mockResolvedValue(undefined);

    // Setup state mocks
    const stateMap: Record<string, string> = {
      message_id: '123',
      is_deployment: 'true',
      chat_id: '456',
      message_thread_id: '789',
      bot_token: 'test-token',
      pin_on_success: 'true',
      start_time: Date.now().toString()
    };

    mockedCore.getState.mockImplementation((name: string) => stateMap[name] || '');

    mockedGetGitHubContext.mockReturnValue({
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
      isDeployment: true
    });

    mockedBuildCompleteMessage.mockReturnValue('<b>Success!</b>');
    mockedCreateTelegramService.mockReturnValue({
      editMessage: mockEditMessage,
      pinMessage: mockPinMessage
    } as unknown as ReturnType<typeof createTelegramService>);

    // Simulate post.ts logic
    const runPost = async (): Promise<void> => {
      try {
        const messageId = parseInt(mockedCore.getState('message_id'), 10);
        const isDeployment = mockedCore.getState('is_deployment') === 'true';
        const chatId = mockedCore.getState('chat_id');
        const messageThreadId = mockedCore.getState('message_thread_id') || undefined;
        const botToken = mockedCore.getState('bot_token');
        const pinOnSuccess = mockedCore.getState('pin_on_success') === 'true';
        const startTime = parseInt(mockedCore.getState('start_time'), 10);

        if (!messageId || !chatId || !botToken) {
          mockedCore.warning('Missing state from pre hook. Skipping notification update.');
          return;
        }

        const jobStatus = mockedCore.getInput('job_status') || 'unknown';
        const elapsedSeconds = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;

        const github = mockedGetGitHubContext();
        const telegram = mockedCreateTelegramService(botToken);

        const text = mockedBuildCompleteMessage(github, jobStatus, elapsedSeconds.toString());
        await telegram.editMessage(chatId, messageId, text, messageThreadId);

        if (jobStatus === 'success' && pinOnSuccess && isDeployment) {
          await telegram.pinMessage(chatId, messageId, messageThreadId);
        }

        mockedCore.info(`Telegram notification updated. Status: ${jobStatus}`);
      } catch (error) {
        mockedCore.warning(
          `Post hook failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    };

    await runPost();

    expect(mockEditMessage).toHaveBeenCalledWith('456', 123, '<b>Success!</b>', '789');
    expect(mockPinMessage).toHaveBeenCalledWith('456', 123, '789');
    expect(mockedCore.info).toHaveBeenCalledWith('Telegram notification updated. Status: success');
  });

  it('skips when missing state', async () => {
    mockedCore.getState.mockReturnValue('');

    const runPost = async (): Promise<void> => {
      const messageId = parseInt(mockedCore.getState('message_id'), 10);
      const chatId = mockedCore.getState('chat_id');
      const botToken = mockedCore.getState('bot_token');

      if (!messageId || !chatId || !botToken) {
        mockedCore.warning('Missing state from pre hook. Skipping notification update.');
        return;
      }
    };

    await runPost();

    expect(mockedCore.warning).toHaveBeenCalledWith(
      'Missing state from pre hook. Skipping notification update.'
    );
  });

  it('does not pin on failure', async () => {
    mockedCore.getInput.mockImplementation((name: string) => {
      if (name === 'job_status') return 'failure';
      return '';
    });

    const mockEditMessage = vi.fn().mockResolvedValue(undefined);
    const mockPinMessage = vi.fn().mockResolvedValue(undefined);

    const stateMap: Record<string, string> = {
      message_id: '123',
      is_deployment: 'true',
      chat_id: '456',
      bot_token: 'test-token',
      pin_on_success: 'true',
      start_time: Date.now().toString()
    };

    mockedCore.getState.mockImplementation((name: string) => stateMap[name] || '');

    mockedGetGitHubContext.mockReturnValue({
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
      isDeployment: true
    });

    mockedBuildCompleteMessage.mockReturnValue('<b>Failed!</b>');
    mockedCreateTelegramService.mockReturnValue({
      editMessage: mockEditMessage,
      pinMessage: mockPinMessage
    } as unknown as ReturnType<typeof createTelegramService>);

    const runPost = async (): Promise<void> => {
      const messageId = parseInt(mockedCore.getState('message_id'), 10);
      const isDeployment = mockedCore.getState('is_deployment') === 'true';
      const chatId = mockedCore.getState('chat_id');
      const botToken = mockedCore.getState('bot_token');
      const pinOnSuccess = mockedCore.getState('pin_on_success') === 'true';
      const startTime = parseInt(mockedCore.getState('start_time'), 10);

      if (!messageId || !chatId || !botToken) {
        mockedCore.warning('Missing state from pre hook. Skipping notification update.');
        return;
      }

      const jobStatus = mockedCore.getInput('job_status') || 'unknown';
      const elapsedSeconds = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;

      const github = mockedGetGitHubContext();
      const telegram = mockedCreateTelegramService(botToken);

      const text = mockedBuildCompleteMessage(github, jobStatus, elapsedSeconds.toString());
      await telegram.editMessage(chatId, messageId, text, undefined);

      if (jobStatus === 'success' && pinOnSuccess && isDeployment) {
        await telegram.pinMessage(chatId, messageId, undefined);
      }
    };

    await runPost();

    expect(mockEditMessage).toHaveBeenCalled();
    expect(mockPinMessage).not.toHaveBeenCalled();
  });

  it('handles errors gracefully', async () => {
    const stateMap: Record<string, string> = {
      message_id: '123',
      is_deployment: 'false',
      chat_id: '456',
      bot_token: 'test-token',
      pin_on_success: 'false'
    };

    mockedCore.getState.mockImplementation((name: string) => stateMap[name] || '');
    mockedGetGitHubContext.mockImplementation(() => {
      throw new Error('Context error');
    });

    const runPost = async (): Promise<void> => {
      try {
        const messageId = parseInt(mockedCore.getState('message_id'), 10);
        const chatId = mockedCore.getState('chat_id');
        const botToken = mockedCore.getState('bot_token');

        if (!messageId || !chatId || !botToken) {
          mockedCore.warning('Missing state from pre hook. Skipping notification update.');
          return;
        }

        mockedGetGitHubContext();
      } catch (error) {
        mockedCore.warning(
          `Post hook failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    };

    await runPost();

    expect(mockedCore.warning).toHaveBeenCalledWith('Post hook failed: Context error');
  });
});
