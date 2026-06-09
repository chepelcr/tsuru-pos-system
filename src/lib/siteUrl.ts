/**
 * Site URL construction — ported from the dashboard (dashboard/src/utils/siteUrl.ts).
 *
 * Builds the public store URL for an organization from its domain configuration.
 */

/** Domain configuration interface for constructing site URLs. */
export interface DomainConfig {
  customDomain?: string | null;
  domainVerified?: boolean;
  subdomain?: string | null;
}

/**
 * Constructs the site URL based on domain configuration priority logic.
 *
 * Priority:
 * 1. If customDomain exists AND domainVerified is true: return https://{customDomain}
 * 2. Otherwise, if subdomain exists: return https://{subdomain}.j-markets.jcampos.dev
 * 3. Otherwise: return null
 *
 * @param config - Domain configuration object
 * @returns The constructed site URL or null if no valid configuration exists
 */
export function constructSiteUrl(config: DomainConfig): string | null {
  // Priority 1: Verified custom domain
  if (config.customDomain && config.domainVerified) {
    return `https://${config.customDomain}`;
  }

  // Priority 2: Subdomain fallback
  if (config.subdomain) {
    return `https://${config.subdomain}.j-markets.jcampos.dev`;
  }

  // No valid domain configuration
  return null;
}
