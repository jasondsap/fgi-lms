/**
 * States that have their own portal (Jason, 9-7-26). People in South Carolina
 * and Colorado kept registering through the FGI link, which stamps their
 * account `registered_surface = fgi` and locks them out of their state portal.
 * When someone picks one of these states on the FGI registration form, the
 * form offers to register them with the portal instead (ticked by default);
 * registerAction re-stamps the surface, the sign-in lands on the portal, and
 * a courtesy email carries the link.
 *
 * Plain module (no 'use client') — shared by the client form, the server
 * action and the email template.
 */
export interface StatePortal {
  /** Tenant slug — also the users.registered_surface value. */
  slug: 'scarr' | 'colorado';
  /** State name for the copy. */
  stateName: string;
  /** Short partner name used in the copy. */
  partner: string;
  /** Full partner name. */
  partnerLong: string;
  /** Portal name as people will hear it. */
  portalName: string;
  /** Human-readable portal link (no scheme). */
  link: string;
}

export const STATE_PORTALS: Record<string, StatePortal> = {
  SC: {
    slug: 'scarr',
    stateName: 'South Carolina',
    partner: 'SCARR',
    partnerLong: 'South Carolina Alliance for Recovery Residences',
    portalName: 'SCARR Learning Center',
    link: 'fgilearn.org/scarr',
  },
  CO: {
    slug: 'colorado',
    stateName: 'Colorado',
    partner: 'ORH-CO',
    partnerLong: 'Ohio Recovery Housing – Colorado',
    portalName: 'Colorado Learning Center',
    link: 'fgilearn.org/colorado',
  },
};

export function portalForState(stateCode: string | null | undefined): StatePortal | null {
  return (stateCode && STATE_PORTALS[stateCode]) || null;
}
