/**
 * Flow Feature Flags Configuration
 * 
 * Provides centralized flags controlling application capabilities and security boundaries.
 */

/**
 * Checks whether the unstick micro-activation feature (/unstick and /api/unstick)
 * is publicly accessible without requiring an authenticated or whitelisted session.
 * 
 * Configuration Precedence:
 * 1. NEXT_PUBLIC_ALLOW_PUBLIC_UNSTICK ('true' | '1' | 'false' | '0')
 * 2. ALLOW_PUBLIC_UNSTICK ('true' | '1' | 'false' | '0')
 * 3. Default fallback:
 *    - In test environments (NODE_ENV === 'test'), defaults to false to preserve strict
 *      boundary test invariants unless explicitly set.
 *    - In all other environments (production / development), defaults to true.
 */
export function isPublicUnstickEnabled(): boolean {
  const envVal =
    process.env.NEXT_PUBLIC_ALLOW_PUBLIC_UNSTICK ??
    process.env.ALLOW_PUBLIC_UNSTICK;

  if (envVal !== undefined) {
    const normalized = envVal.trim().toLowerCase();
    return normalized === 'true' || normalized === '1';
  }

  return process.env.NODE_ENV !== 'test';
}

export const featureFlags = {
  /**
   * Whether unstick is accessible without authentication.
   */
  get allowPublicUnstick(): boolean {
    return isPublicUnstickEnabled();
  },
};
