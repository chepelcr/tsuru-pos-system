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
  getCurrentUser,
  fetchAuthSession,
} from "aws-amplify/auth";
import "../lib/amplify";
import { api, userPath } from "../lib/api";

export type UserRole = "cajero" | "gerente" | "supervisor";

interface AuthUser {
  userId: string;
  email: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
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
      const result = await signIn({ username: email, password });
      if (result.isSignedIn) {
        const cognitoUser = await getCurrentUser();
        const profile = await api.get<AuthUser>(
          userPath(cognitoUser.userId, "/profile")
        );
        setUser({ ...profile, userId: cognitoUser.userId });
      }
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

  return (
    <AuthContext.Provider
      value={{ user, isLoading, error, login, logout }}
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
