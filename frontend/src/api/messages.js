/** Message endpoints (swagger: /message). Pages of 20, oldest first, with nextCursor. */
import { request } from './client';

/**
 * @param {string} conversationId
 * @param {{ cursor?: string, isPoll?: boolean, initiator?: string }} [options]
 * @returns {Promise<{ data: object[], nextCursor?: string, count: number }>}
 */
export function listMessages(conversationId, { cursor, isPoll = false, initiator } = {}) {
  return request('/message', {
    query: { conversation_id: conversationId, from_message_cursor: cursor },
    isPoll,
    initiator,
  });
}

/**
 * Text, a file (fileId from uploadFile) or both. replyToId only on the Natter server.
 * @param {{ conversationId: string, content?: string, fileId?: string, replyToId?: string }} input
 */
export function sendMessage({ conversationId, content, fileId, replyToId }) {
  return request('/message', {
    method: 'POST',
    body: { conversation_id: conversationId, content, file_id: fileId, reply_to_id: replyToId },
  });
}
