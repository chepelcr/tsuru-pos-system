/** Only an opaque POS onboarding context is persisted across sign-in/verification. */
export function partnerReturnPath(): string | null {
  const path = sessionStorage.getItem('ditsoPartnerReturn');
  return path && /^\/integraciones\/ditso\/[A-Za-z0-9_-]{43}$/.test(path) ? path : null;
}
