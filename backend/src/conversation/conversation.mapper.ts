/** Same fields GET /conversation returns for each conversation. */
export const CONVERSATION_SELECT = {
  id: true,
  name: true,
  type: true,
  createdAt: true,
  createdBy: true,
  participants_ids: true,
  disappearSeconds: true,
} as const;

export interface ConversationFields {
  id: string;
  name: string | null;
  type: string;
  createdAt: Date;
  createdBy: string;
  participants_ids: string[];
  disappearSeconds?: number | null;
}

/** The conversation shape every route returns. disappearSeconds is 0 when the timer is off or unset. */
export function toConversationResponse(c: ConversationFields) {
  return {
    id: c.id,
    name: c.name ?? null,
    type: c.type,
    createdAt: c.createdAt,
    createdBy: c.createdBy,
    participants_ids: c.participants_ids,
    disappearSeconds: c.disappearSeconds ?? 0,
  };
}
