import * as core from '@actions/core';
import { beforeEach, describe, expect, it, type Mocked, vi } from 'vitest';
import { getConfig } from '../src/config';

vi.mock('@actions/core');

describe('getConfig', () => {
  const mockedCore = core as Mocked<typeof core>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns config with required inputs', () => {
    mockedCore.getInput.mockImplementation((name: string) => {
      if (name === 'bot_token') return 'test-token';
      if (name === 'chat_id') return '123456';
      return '';
    });

    const config = getConfig();

    expect(config).toEqual({
      botToken: 'test-token',
      chatId: '123456',
      messageThreadId: undefined,
      isDeployment: undefined,
      pinOnSuccess: false
    });
  });

  it('parses optional inputs correctly', () => {
    mockedCore.getInput.mockImplementation((name: string) => {
      const inputs: Record<string, string> = {
        bot_token: 'test-token',
        chat_id: '123456',
        message_thread_id: '789',
        is_deployment: 'true',
        pin_on_success: 'true'
      };
      return inputs[name] || '';
    });

    const config = getConfig();

    expect(config).toEqual({
      botToken: 'test-token',
      chatId: '123456',
      messageThreadId: '789',
      isDeployment: true,
      pinOnSuccess: true
    });
  });

  it('parses boolean false correctly', () => {
    mockedCore.getInput.mockImplementation((name: string) => {
      const inputs: Record<string, string> = {
        bot_token: 'test-token',
        chat_id: '123456',
        is_deployment: 'false',
        pin_on_success: 'false'
      };
      return inputs[name] || '';
    });

    const config = getConfig();

    expect(config.isDeployment).toBe(false);
    expect(config.pinOnSuccess).toBe(false);
  });

  it('requires bot_token', () => {
    mockedCore.getInput.mockImplementation((name: string, options?: { required?: boolean }) => {
      if (name === 'bot_token' && options?.required) {
        throw new Error('Input required and not supplied: bot_token');
      }
      return '';
    });

    expect(() => getConfig()).toThrow('Input required and not supplied: bot_token');
  });

  it('requires chat_id', () => {
    mockedCore.getInput.mockImplementation((name: string, options?: { required?: boolean }) => {
      if (name === 'bot_token') return 'test-token';
      if (name === 'chat_id' && options?.required) {
        throw new Error('Input required and not supplied: chat_id');
      }
      return '';
    });

    expect(() => getConfig()).toThrow('Input required and not supplied: chat_id');
  });
});
