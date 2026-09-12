/* AXIOM — first-entry flag. One tiny cookie, nothing else.
   axiom_seen=true means "Welcome was already shown".
   The cookie NEVER holds project/course/Guided/settings data and NEVER
   touches axiom_projects, axiom_completed or axiom_guided. */

const NAME = "axiom_seen";
const YEAR = 60 * 60 * 24 * 365;

export function hasSeenWelcome(): boolean {
  try {
    return document.cookie.split(";").some((c) => c.trim() === `${NAME}=true`);
  } catch {
    return false;
  }
}

export function markWelcomeSeen(): void {
  try {
    document.cookie = `${NAME}=true; path=/; max-age=${YEAR}; SameSite=Lax`;
  } catch {
    /* cookies unavailable — welcome will simply show again */
  }
}

/** Dev-only reset for the first-entry state (browser console tooling).
    Expiring the cookie deletes NOTHING else: all localStorage user data
    (projects, progress, Guided) stays completely intact. */
export function clearWelcomeCookie(): void {
  try {
    document.cookie = `${NAME}=; path=/; max-age=0; SameSite=Lax`;
  } catch {
    /* ignore */
  }
}

if ((import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV) {
  (window as unknown as { axiomClearWelcome?: () => void }).axiomClearWelcome =
    clearWelcomeCookie;
}
