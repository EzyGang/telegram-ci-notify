import * as core from '@actions/core';
import { getGitHubContext } from './github-context';
import { buildCompleteMessage } from './message-builder';
import { createTelegramService } from './telegram-service';

async function run(): Promise<void> {
  try {
    // Retrieve state from pre hook
    const messageId = parseInt(core.getState('message_id'), 10);
    const isDeployment = core.getState('is_deployment') === 'true';
    const chatId = core.getState('chat_id');
    const messageThreadId = core.getState('message_thread_id') || undefined;
    const botToken = core.getState('bot_token');
    const pinOnSuccess = core.getState('pin_on_success') === 'true';
    const startTime = parseInt(core.getState('start_time'), 10);

    if (!messageId || !chatId || !botToken) {
      core.warning('Missing state from pre hook. Skipping notification update.');
      return;
    }

    // Get job status from action input (automatically set by GitHub Actions)
    const jobStatus = core.getInput('job_status') || 'unknown';

    // Calculate elapsed time
    const elapsedSeconds = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;

    // Pass isDeployment from state to ensure consistent deployment detection
    const github = getGitHubContext(isDeployment);
    const telegram = createTelegramService(botToken);

    const text = buildCompleteMessage(github, jobStatus, elapsedSeconds.toString());
    await telegram.editMessage(chatId, messageId, text, messageThreadId);

    // Pin on successful deployment
    if (jobStatus === 'success' && pinOnSuccess && isDeployment) {
      await telegram.pinMessage(chatId, messageId, messageThreadId);
    }

    core.info(`Telegram notification updated. Status: ${jobStatus}`);
  } catch (error) {
    // Don't fail the workflow if notification fails
    core.warning(`Post hook failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

run();
