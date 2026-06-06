/**
 * Authentication DTOs for Pollos Sales
 */

export type UserRole = "cajero" | "gerente" | "supervisor";

export interface AuthUser {
  userId: string;
  email: string;
  name: string;
  role?: UserRole;
}

export interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}
