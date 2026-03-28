import * as core from '@actions/core';
import { beforeEach, describe, expect, it, type Mocked, vi } from 'vitest';
import { createTelegramService } from '../src/telegram-service';

vi.mock('@actions/core');

const mockedCore = core as Mocked<typeof core>;

describe('TelegramService', () => {
  const mockFetch = vi.fn();
  global.fetch = mockFetch;

  beforeEach(() => {
    vi.clearAllMocks();
    mockedCore.info.mockImplementation(() => {});
  });

  describe('sendMessage', () => {
    it('sends message successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, result: { message_id: 123 } })
      } as Response);

      const service = createTelegramService('test-token');
      const messageId = await service.sendMessage('chat123', '<b>Test</b>');

      expect(messageId).toBe(123);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.telegram.org/bottest-token/sendMessage',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: 'chat123',
            text: '<b>Test</b>',
            parse_mode: 'HTML',
            disable_web_page_preview: true
          })
        })
      );
      expect(mockedCore.info).toHaveBeenCalledWith('Message sent with ID: 123');
    });

    it('sends message with thread ID', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, result: { message_id: 456 } })
      } as Response);

      const service = createTelegramService('test-token');
      const messageId = await service.sendMessage('chat123', 'Test', '789');

      expect(messageId).toBe(456);
      const callArgs = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callArgs.message_thread_id).toBe(789);
    });

    it('throws error on API failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => 'Bad Request'
      } as Response);

      const service = createTelegramService('test-token');
      await expect(service.sendMessage('chat123', 'Test')).rejects.toThrow(
        'Telegram API error (400): Bad Request'
      );
    });

    it('throws error on Telegram API error response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: false, description: 'Chat not found' })
      } as Response);

      const service = createTelegramService('test-token');
      await expect(service.sendMessage('chat123', 'Test')).rejects.toThrow(
        'Telegram API error: Chat not found'
      );
    });
  });

  describe('editMessage', () => {
    it('edits message successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, result: true })
      } as Response);

      const service = createTelegramService('test-token');
      await service.editMessage('chat123', 456, 'Updated text');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.telegram.org/bottest-token/editMessageText',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: 'chat123',
            message_id: 456,
            text: 'Updated text',
            parse_mode: 'HTML'
          })
        })
      );
      expect(mockedCore.info).toHaveBeenCalledWith('Message 456 edited');
    });

    it('edits message with thread ID', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, result: true })
      } as Response);

      const service = createTelegramService('test-token');
      await service.editMessage('chat123', 456, 'Updated text', '789');

      const callArgs = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callArgs.message_thread_id).toBe(789);
      expect(mockedCore.info).toHaveBeenCalledWith('Message 456 edited');
    });
  });

  describe('pinMessage', () => {
    it('pins message successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, result: true })
      } as Response);

      const service = createTelegramService('test-token');
      await service.pinMessage('chat123', 456);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.telegram.org/bottest-token/pinChatMessage',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: 'chat123',
            message_id: 456,
            disable_notification: true
          })
        })
      );
      expect(mockedCore.info).toHaveBeenCalledWith('Message 456 pinned');
    });

    it('pins message with thread ID', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, result: true })
      } as Response);

      const service = createTelegramService('test-token');
      await service.pinMessage('chat123', 456, '789');

      const callArgs = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callArgs.message_thread_id).toBe(789);
      expect(mockedCore.info).toHaveBeenCalledWith('Message 456 pinned');
    });
  });
});
