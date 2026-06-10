import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import {
  signIn,
  signOut,
  signUp,
  confirmSignUp,
  resendSignUpCode,
  resetPassword,
  confirmResetPassword,
  updatePassword,
  getCurrentUser,
  fetchAuthSession,
} from "aws-amplify/auth";
import "../lib/amplify";
import { api, userPath } from "../lib/api";

// "customer" is the default role the markets-api assigns on first Cognito sync;
// org/POS roles (cajero/gerente/supervisor) are assigned later via RBAC.
export type UserRole = "cajero" | "gerente" | "supervisor" | "customer";

interface AuthUser {
  userId: string;
  email: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  role: UserRole;
}

interface SignUpArgs {
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  preferredUsername: string;
  email: string;
  /** Cognito locale attribute (language preference). Defaults to "es". */
  locale?: string;
}

interface CompleteVerificationArgs {
  userId: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<{ needsVerification: boolean }>;
  logout: () => Promise<void>;
  /** Best-effort global sign-out used to clear any stale Cognito session before auth flows. */
  forceLogout: () => Promise<void>;
  // aws-amplify/auth thin wrappers (mirror dashboard useAuth)
  signUp: (args: SignUpArgs) => Promise<{ needsVerification: boolean; userId?: string }>;
  confirmSignUp: (args: { username: string; confirmationCode: string }) => Promise<void>;
  resendSignUpCode: (args: { username: string }) => Promise<void>;
  resetPassword: (args: { username: string }) => Promise<void>;
  confirmResetPassword: (args: {
    username: string;
    confirmationCode: string;
    newPassword: string;
  }) => Promise<void>;
  getCurrentUser: typeof getCurrentUser;
  completeVerification: (args: CompleteVerificationArgs) => Promise<AuthUser>;
  /** Change the password of the currently signed-in user via Cognito. */
  updatePassword: (args: { oldPassword: string; newPassword: string }) => Promise<void>;
  /**
   * Merge a partial profile update into the cached AuthUser so the
   * sidebar/header reflect edits immediately (no refetch needed).
   */
  applyProfileUpdate: (partial: Partial<AuthUser>) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Restore session on mount
  useEffect(() => {
    let cancelled = false;
    
    console.log('[AuthContext] Initializing, checking for existing session...');
    
    (async () => {
      try {
        const cognitoUser = await getCurrentUser();
        console.log('[AuthContext] Found Cognito user:', cognitoUser.userId);
        
        const session = await fetchAuthSession();
        const token = session.tokens?.idToken;
        if (!token) throw new Error("No token");

        if (!cancelled) {
          console.log('[AuthContext] Fetching user profile...');
          const profile = await api.get<AuthUser>(
            userPath(cognitoUser.userId, "/profile")
          );
          console.log('[AuthContext] Profile loaded:', profile);
          setUser({ ...profile, userId: cognitoUser.userId });
        }
      } catch (err) {
        console.log('[AuthContext] No existing session or error:', err);
        if (!cancelled) {
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          console.log('[AuthContext] Initialization complete');
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    setIsLoading(true);
    try {
      // Clear any stale Cognito session first — amplify v6 signIn throws
      // UserAlreadyAuthenticatedException when a session already exists.
      try {
        await signOut();
      } catch {
        // Ignore if there is no session to clear.
      }

      const result = await signIn({ username: email, password });

      // Unconfirmed users resolve to CONFIRM_SIGN_UP without throwing.
      if (result.nextStep?.signInStep === "CONFIRM_SIGN_UP") {
        return { needsVerification: true };
      }

      if (result.isSignedIn) {
        const cognitoUser = await getCurrentUser();
        const profile = await api.get<AuthUser>(
          userPath(cognitoUser.userId, "/profile")
        );
        setUser({ ...profile, userId: cognitoUser.userId });
      }
      return { needsVerification: false };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al iniciar sesión";
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await signOut();
    setUser(null);
    sessionStorage.removeItem("selectedOrgId");
  }, []);

  // Best-effort global sign-out to clear a stale session before login/register.
  const forceLogout = useCallback(async () => {
    try {
      await signOut({ global: true });
    } catch {
      // Ignore — there may be no session, or the token may already be invalid.
    }
    setUser(null);
  }, []);

  // ─── aws-amplify/auth thin wrappers (mirror dashboard useAuth) ───────────

  const signUpWrapper = useCallback(
    async (args: SignUpArgs) => {
      const result = await signUp({
        username: args.username,
        password: args.password,
        options: {
          userAttributes: {
            email: args.email,
            given_name: args.firstName,
            family_name: args.lastName,
            preferred_username: args.preferredUsername,
            locale: args.locale || "es",
          },
        },
      });
      return {
        needsVerification: !result.isSignUpComplete,
        userId: result.userId,
      };
    },
    []
  );

  const confirmSignUpWrapper = useCallback(
    async (args: { username: string; confirmationCode: string }) => {
      await confirmSignUp({
        username: args.username,
        confirmationCode: args.confirmationCode,
      });
    },
    []
  );

  const resendSignUpCodeWrapper = useCallback(
    async (args: { username: string }) => {
      await resendSignUpCode({ username: args.username });
    },
    []
  );

  const resetPasswordWrapper = useCallback(
    async (args: { username: string }) => {
      await resetPassword({ username: args.username });
    },
    []
  );

  const confirmResetPasswordWrapper = useCallback(
    async (args: {
      username: string;
      confirmationCode: string;
      newPassword: string;
    }) => {
      await confirmResetPassword({
        username: args.username,
        confirmationCode: args.confirmationCode,
        newPassword: args.newPassword,
      });
    },
    []
  );

  // Change the signed-in user's password via Cognito (no backend route).
  const updatePasswordWrapper = useCallback(
    async (args: { oldPassword: string; newPassword: string }) => {
      await updatePassword({
        oldPassword: args.oldPassword,
        newPassword: args.newPassword,
      });
    },
    []
  );

  // Merge a partial profile update into the cached user so the
  // sidebar/header name updates live after a profile edit.
  const applyProfileUpdate = useCallback((partial: Partial<AuthUser>) => {
    setUser((prev) => (prev ? { ...prev, ...partial } : prev));
  }, []);

  // Sync verified Cognito user to the backend and refresh the cached profile.
  const completeVerification = useCallback(
    async (args: CompleteVerificationArgs) => {
      const profile = await api.post<AuthUser>(
        userPath(args.userId, "/verify-email-complete"),
        {
          email: args.email,
          username: args.username,
          firstName: args.firstName,
          lastName: args.lastName,
        }
      );
      const synced = { ...profile, userId: args.userId };
      setUser(synced);
      return synced;
    },
    []
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        error,
        login,
        logout,
        forceLogout,
        signUp: signUpWrapper,
        confirmSignUp: confirmSignUpWrapper,
        resendSignUpCode: resendSignUpCodeWrapper,
        resetPassword: resetPasswordWrapper,
        confirmResetPassword: confirmResetPasswordWrapper,
        getCurrentUser,
        completeVerification,
        updatePassword: updatePasswordWrapper,
        applyProfileUpdate,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext must be used within AuthProvider");
  return ctx;
}
