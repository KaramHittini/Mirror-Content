/**
 * In-memory access token store — never touches localStorage.
 * Survives navigations but not page reloads; the AuthGuard restores it
 * via the httpOnly refresh cookie on every cold load.
 */
let _token: string | null = null;

export const tokenStore = {
  get: () => _token,
  set: (t: string) => { _token = t; },
  clear: () => { _token = null; },
};
