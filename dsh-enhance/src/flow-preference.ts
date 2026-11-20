/**
 * Default Conversation view preference for new Sessions.
 *
 * The Conversation store hydrates its `view` from localStorage when it is
 * created, so the preference must be written before the Session binding
 * resolves. This module is pure so it can be tested without a browser.
 */

export const FLOW_VIEW_ID = 'dsh-enhance.flow'
export const CONVERSATION_STORE_KEY = 'dsh.conversation'

export interface FlowPreferenceStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

/**
 * Persist the Flow view as a Session's default unless the Session already
 * chose a view. A stored draft is preserved.
 * @param sessionId - Session whose Conversation store will hydrate next.
 * @param storage - localStorage-compatible storage; omitted outside a browser.
 */
export function preferFlowView(
  sessionId: string,
  storage: FlowPreferenceStorage | undefined = typeof localStorage === 'undefined' ? undefined : localStorage,
): void {
  if (storage === undefined) return
  const key = `${CONVERSATION_STORE_KEY}.${sessionId}`
  try {
    const raw = storage.getItem(key)
    const stored: unknown = raw === null ? undefined : JSON.parse(raw)
    const record = stored !== null && typeof stored === 'object' && !Array.isArray(stored)
      ? stored as Record<string, unknown>
      : undefined
    if (typeof record?.view === 'string' && record.view !== '') return
    storage.setItem(key, JSON.stringify({
      draft: record?.draft ?? '',
      view: FLOW_VIEW_ID,
      viewRequest: null,
    }))
  } catch {
    // Unavailable storage or malformed JSON: leave the shipped default.
  }
}
