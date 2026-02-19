/**
 * User Capability Utilities
 * 
 * Capabilities are determined by Stripe connection state, not intent.
 * These are computed dynamically, not stored in the database.
 */

import { UserData } from './api-client';

/**
 * Check if user can rent items
 * Requirement: stripe_payment_method_id exists
 */
export function canRent(user: UserData | null | undefined, isAdmin: boolean = false): boolean {
  if (!user) return false;
  if (isAdmin) return true; // Admins are exempt
  return !!(user as any).stripe_payment_method_id;
}

/**
 * Check if user can list items
 * Requirement: None - allowed for everyone
 */
export function canListItems(user: UserData | null | undefined): boolean {
  if (!user) return false;
  return true; // Everyone can list items
}

/**
 * Check if user can receive payouts (lend items)
 * Requirement: stripe_account_id exists AND payouts_enabled = true
 */
export function canLend(user: UserData | null | undefined, isAdmin: boolean = false): boolean {
  if (!user) return false;
  if (isAdmin) return true; // Admins are exempt
  return !!(user as any).stripe_account_id && user.payouts_enabled === true;
}

/**
 * Get all user capabilities as an object
 */
export function getUserCapabilities(user: UserData | null | undefined, isAdmin: boolean = false) {
  return {
    can_rent: canRent(user, isAdmin),
    can_list: canListItems(user),
    can_lend: canLend(user, isAdmin),
  };
}

/**
 * Extended UserData interface with computed capabilities
 */
export interface UserDataWithCapabilities extends UserData {
  can_rent?: boolean;
  can_list?: boolean;
  can_lend?: boolean;
}

/**
 * Add computed capabilities to user data
 */
export function addCapabilitiesToUser(
  user: UserData | null | undefined,
  isAdmin: boolean = false
): UserDataWithCapabilities | null {
  if (!user) return null;
  
  return {
    ...user,
    can_rent: canRent(user, isAdmin),
    can_list: canListItems(user),
    can_lend: canLend(user, isAdmin),
  };
}
