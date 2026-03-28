import * as core from '@actions/core';
import { getConfig } from './config';
import { getGitHubContext } from './github-context';
import { buildStartMessage } from './message-builder';
import { createTelegramService } from './telegram-service';

async function run(): Promise<void> {
  try {
    const config = getConfig();
    const github = getGitHubContext(config.isDeployment);
    const telegram = createTelegramService(config.botToken);

    const text = buildStartMessage(github);
    const messageId = await telegram.sendMessage(config.chatId, text, config.messageThreadId);

    // Save state for post hook
    const startTime = Date.now();
    core.saveState('message_id', messageId.toString());
    core.saveState('is_deployment', github.isDeployment.toString());
    core.saveState('chat_id', config.chatId);
    core.saveState('message_thread_id', config.messageThreadId || '');
    core.saveState('bot_token', config.botToken);
    core.saveState('pin_on_success', config.pinOnSuccess.toString());
    core.saveState('start_time', startTime.toString());

    core.info(`Telegram notification sent. Message ID: ${messageId}`);
    core.setOutput('message_id', messageId.toString());
    core.setOutput('is_deployment', github.isDeployment.toString());
  } catch (error) {
    core.setFailed(`Pre hook failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

run();
