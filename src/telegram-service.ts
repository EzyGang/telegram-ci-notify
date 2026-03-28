import * as core from '@actions/core';

const API_BASE = 'https://api.telegram.org/bot';

export interface TelegramService {
  sendMessage(chatId: string, text: string, messageThreadId?: string): Promise<number>;
  editMessage(
    chatId: string,
    messageId: number,
    text: string,
    messageThreadId?: string
  ): Promise<void>;
  pinMessage(chatId: string, messageId: number, messageThreadId?: string): Promise<void>;
}

export function createTelegramService(botToken: string): TelegramService {
  const apiUrl = `${API_BASE}${botToken}`;

  async function apiCall<T>(method: string, body: unknown): Promise<T> {
    const response = await fetch(`${apiUrl}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Telegram API error (${response.status}): ${error}`);
    }

    const data = (await response.json()) as { ok: boolean; result?: T; description?: string };
    if (!data.ok) {
      throw new Error(`Telegram API error: ${data.description || 'Unknown error'}`);
    }

    return data.result as T;
  }

  return {
    async sendMessage(chatId, text, messageThreadId) {
      const body: Record<string, unknown> = {
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      };

      if (messageThreadId) {
        body.message_thread_id = parseInt(messageThreadId, 10);
      }

      const result = await apiCall<{ message_id: number }>('sendMessage', body);
      core.info(`Message sent with ID: ${result.message_id}`);
      return result.message_id;
    },

    async editMessage(chatId, messageId, text, messageThreadId) {
      const body: Record<string, unknown> = {
        chat_id: chatId,
        message_id: messageId,
        text,
        parse_mode: 'HTML'
      };

      if (messageThreadId) {
        body.message_thread_id = parseInt(messageThreadId, 10);
      }

      await apiCall('editMessageText', body);
      core.info(`Message ${messageId} edited`);
    },

    async pinMessage(chatId, messageId, messageThreadId) {
      const body: Record<string, unknown> = {
        chat_id: chatId,
        message_id: messageId,
        disable_notification: true
      };

      if (messageThreadId) {
        body.message_thread_id = parseInt(messageThreadId, 10);
      }

      await apiCall('pinChatMessage', body);
      core.info(`Message ${messageId} pinned`);
    }
  };
}
