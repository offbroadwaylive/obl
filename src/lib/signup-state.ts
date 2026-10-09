// Remembers, per browser, that the visitor dismissed the signup slide-in or
// submitted any signup form, so the slide-in never comes back. Storage can be
// unavailable (private windows, blocked site data); then the slide-in shows
// at most once per page load.

const KEY = 'obl_signup_dismissed';
export const DISMISSED_EVENT = 'obl:signup-dismissed';

export function isSignupDismissed(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export function markSignupDismissed(source: string): void {
  try {
    localStorage.setItem(KEY, '1');
  } catch {
    // Storage unavailable: the event below still closes the slide-in for this page.
  }
  document.dispatchEvent(new CustomEvent(DISMISSED_EVENT, { detail: { source } }));
}
