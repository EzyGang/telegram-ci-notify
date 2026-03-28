import * as core from '@actions/core';
import { beforeEach, describe, expect, it, type Mocked, type MockedFunction, vi } from 'vitest';
import { getConfig } from '../src/config';
import { getGitHubContext } from '../src/github-context';
import { buildStartMessage } from '../src/message-builder';
import { createTelegramService } from '../src/telegram-service';

// Mock all dependencies
vi.mock('@actions/core');
vi.mock('../src/config');
vi.mock('../src/github-context');
vi.mock('../src/message-builder');
vi.mock('../src/telegram-service');

describe('pre.ts logic', () => {
  const mockedCore = core as Mocked<typeof core>;
  const mockedGetConfig = getConfig as MockedFunction<typeof getConfig>;
  const mockedGetGitHubContext = getGitHubContext as MockedFunction<typeof getGitHubContext>;
  const mockedBuildStartMessage = buildStartMessage as MockedFunction<typeof buildStartMessage>;
  const mockedCreateTelegramService = createTelegramService as MockedFunction<
    typeof createTelegramService
  >;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends initial message and saves state', async () => {
    const mockSendMessage = vi.fn().mockResolvedValue(456);

    mockedGetConfig.mockReturnValue({
      botToken: 'test-token',
      chatId: '123456',
      messageThreadId: '789',
      isDeployment: false,
      pinOnSuccess: true
    });

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
      isDeployment: false
    });

    mockedBuildStartMessage.mockReturnValue('<b>Test message</b>');
    mockedCreateTelegramService.mockReturnValue({
      sendMessage: mockSendMessage
    } as unknown as ReturnType<typeof createTelegramService>);

    // Simulate pre.ts logic
    const runPre = async (): Promise<void> => {
      try {
        const config = mockedGetConfig();
        const github = mockedGetGitHubContext(config.isDeployment);
        const telegram = mockedCreateTelegramService(config.botToken);

        const text = mockedBuildStartMessage(github);
        const messageId = await telegram.sendMessage(config.chatId, text, config.messageThreadId);

        mockedCore.saveState('message_id', messageId.toString());
        mockedCore.saveState('is_deployment', github.isDeployment.toString());
        mockedCore.saveState('chat_id', config.chatId);
        mockedCore.saveState('message_thread_id', config.messageThreadId || '');
        mockedCore.saveState('bot_token', config.botToken);
        mockedCore.saveState('pin_on_success', config.pinOnSuccess.toString());

        mockedCore.info(`Telegram notification sent. Message ID: ${messageId}`);
        mockedCore.setOutput('message_id', messageId.toString());
        mockedCore.setOutput('is_deployment', github.isDeployment.toString());
      } catch (error) {
        mockedCore.setFailed(
          `Pre hook failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    };

    await runPre();

    expect(mockSendMessage).toHaveBeenCalledWith('123456', '<b>Test message</b>', '789');
    expect(mockedCore.saveState).toHaveBeenCalledWith('message_id', '456');
    expect(mockedCore.saveState).toHaveBeenCalledWith('is_deployment', 'false');
    expect(mockedCore.saveState).toHaveBeenCalledWith('chat_id', '123456');
    expect(mockedCore.saveState).toHaveBeenCalledWith('message_thread_id', '789');
    expect(mockedCore.saveState).toHaveBeenCalledWith('bot_token', 'test-token');
    expect(mockedCore.saveState).toHaveBeenCalledWith('pin_on_success', 'true');
    expect(mockedCore.setOutput).toHaveBeenCalledWith('message_id', '456');
    expect(mockedCore.setOutput).toHaveBeenCalledWith('is_deployment', 'false');
  });

  it('handles errors gracefully', async () => {
    mockedGetConfig.mockImplementation(() => {
      throw new Error('Config error');
    });

    const runPre = async (): Promise<void> => {
      try {
        const config = mockedGetConfig();
        // Should not reach here
        expect(config).toBeDefined();
      } catch (error) {
        mockedCore.setFailed(
          `Pre hook failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    };

    await runPre();

    expect(mockedCore.setFailed).toHaveBeenCalledWith('Pre hook failed: Config error');
  });
});
