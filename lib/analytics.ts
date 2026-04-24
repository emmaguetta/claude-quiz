type ConsentState = 'granted' | 'denied'

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
    dataLayer?: unknown[]
  }
}

const CONSENT_KEY = 'claude-quiz-analytics-consent'

export function getStoredConsent(): ConsentState | null {
  if (typeof window === 'undefined') return null
  const v = localStorage.getItem(CONSENT_KEY)
  return v === 'granted' || v === 'denied' ? v : null
}

export function setConsent(state: ConsentState) {
  if (typeof window === 'undefined') return
  localStorage.setItem(CONSENT_KEY, state)
  window.gtag?.('consent', 'update', {
    analytics_storage: state,
    ad_storage: state,
    ad_user_data: state,
    ad_personalization: state,
  })
}

export function trackEvent(name: string, params?: Record<string, unknown>) {
  if (typeof window === 'undefined') return
  window.gtag?.('event', name, params)
}

export const events = {
  quizCompleted: (params: { correct: number; total: number; duration_sec: number }) =>
    trackEvent('quiz_completed', params),
  mcpSearch: (params: { query: string; results_count: number }) =>
    trackEvent('mcp_search', params),
  mcpExplain: (params: { mcp_name: string }) =>
    trackEvent('mcp_explain', params),
  faqQuestionOpened: (params: { question: string }) =>
    trackEvent('faq_question_opened', params),
}
