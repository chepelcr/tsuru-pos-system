/**
 * Authentication DTOs for Pollos Sales
 */

export type UserRole = "cajero" | "gerente" | "supervisor" | "customer";

export interface AuthUser {
  userId: string;
  email: string;
  name: string;
  /** Split name fields — used by the Profile / Account page (plan 06). */
  firstName?: string;
  lastName?: string;
  /** Cognito username — editable in the Profile page. */
  username?: string;
  role?: UserRole;
}

export interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

/**
 * PUT body for the Profile / Account update (plan 06 §6).
 * `email` is intentionally excluded — it is a Cognito-managed attribute and the
 * markets-api `PUT /users/{userId}/profile` swagger accepts only these fields.
 *
 * TODO(verify-endpoint): confirmed route is `PUT /api/users/{userId}/profile`
 * (not PATCH) accepting `{ firstName, lastName, username }`. If a PATCH alias is
 * later added, switch the hook.
 */
export interface UpdateProfileData {
  firstName: string;
  lastName: string;
  username: string;
}
