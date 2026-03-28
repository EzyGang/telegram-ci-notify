import * as core from '@actions/core';

export interface Config {
  botToken: string;
  chatId: string;
  messageThreadId?: string;
  isDeployment?: boolean;
  pinOnSuccess: boolean;
}

export function getConfig(): Config {
  return {
    botToken: core.getInput('bot_token', { required: true }),
    chatId: core.getInput('chat_id', { required: true }),
    messageThreadId: core.getInput('message_thread_id') || undefined,
    isDeployment: parseBoolean(core.getInput('is_deployment')),
    pinOnSuccess: parseBoolean(core.getInput('pin_on_success')) ?? false
  };
}

function parseBoolean(value: string): boolean | undefined {
  if (!value) return undefined;
  return value.toLowerCase() === 'true';
}
