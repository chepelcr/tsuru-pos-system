import { Amplify } from "aws-amplify";
import { confirmSignIn, signIn, signOut } from "aws-amplify/auth";
import { cognitoUserPoolsTokenProvider } from "aws-amplify/auth/cognito";

/**
 * Passwordless helpers shared by the Tsuru apps (POS, admin console, Account).
 *
 * Magic links use Cognito CUSTOM_AUTH served by be/cognito-templates. Cognito
 * passes InitiateAuth's metadata to no challenge trigger, so a request answers
 * the first challenge with REQUEST_ANSWER plus the metadata, and the second
 * round mails a single-use link to `${origin}/auth/magic`. Opening the link
 * answers a fresh sign-in's first challenge with the token.
 */

const REQUEST_ANSWER = "__request_link__";

/** Hash fragment of a magic link: `#u=<cognito username>&t=<token>`. */
export function readMagicLink(hash: string): { username: string; token: string } | null {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const username = params.get("u");
  const token = params.get("t");
  return username && token ? { username, token } : null;
}

async function clearSession() {
  try { await signOut(); } catch { /* no active session */ }
}

/**
 * Mail a sign-in link. Resolves false when the account still needs its email
 * confirmed; unknown addresses resolve true so the UI never reveals them.
 */
export async function requestMagicLink(email: string): Promise<boolean> {
  await clearSession();
  try {
    const started = await signIn({ username: email, options: { authFlowType: "CUSTOM_WITHOUT_SRP" } });
    if (started.nextStep.signInStep === "CONFIRM_SIGN_UP") return false;
    if (started.nextStep.signInStep !== "CONFIRM_SIGN_IN_WITH_CUSTOM_CHALLENGE") {
      throw new Error("Unsupported sign-in challenge");
    }
    await confirmSignIn({
      challengeResponse: REQUEST_ANSWER,
      options: { clientMetadata: { mode: "request", redirect: window.location.origin } },
    });
    return true;
  } catch (error) {
    const name = (error as { name?: string })?.name;
    if (name === "UserNotConfirmedException") return false;
    if (name === "UserNotFoundException" || name === "NotAuthorizedException") return true;
    throw error;
  }
}

/** Complete a magic link; the token is consumed whether or not it works. */
export async function completeMagicLink(username: string, token: string): Promise<void> {
  await clearSession();
  const started = await signIn({ username, options: { authFlowType: "CUSTOM_WITHOUT_SRP" } });
  if (started.nextStep.signInStep !== "CONFIRM_SIGN_IN_WITH_CUSTOM_CHALLENGE") {
    throw new Error("Unsupported sign-in challenge");
  }
  const result = await confirmSignIn({ challengeResponse: token });
  if (!result.isSignedIn) throw Object.assign(new Error("Magic link expired"), { name: "MagicLinkExpired" });
}

// ── Confirm sign-up and sign in, even after a page reload ────────────────────
// Amplify's autoSignIn keeps its state in memory, so a reload on the
// verification step used to strand the user at the login page. Cognito returns
// a sign-in Session from ConfirmSignUp itself; trading it for tokens through
// USER_AUTH needs no password, so nothing secret has to survive the reload.

function cognitoClient() {
  const cognito = Amplify.getConfig().Auth?.Cognito;
  if (!cognito?.userPoolId || !cognito.userPoolClientId) throw new Error("Cognito is not configured");
  const region = cognito.userPoolId.split("_")[0];
  return { clientId: cognito.userPoolClientId, endpoint: `https://cognito-idp.${region}.amazonaws.com/` };
}

async function cognitoCall<T>(target: string, body: Record<string, unknown>): Promise<T> {
  const { endpoint } = cognitoClient();
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-amz-json-1.1",
      "X-Amz-Target": `AWSCognitoIdentityProviderService.${target}`,
    },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    // Same error shape Amplify raises, so describeAuthError keeps working.
    const name = String(data.__type ?? "UnknownError").split("#").pop() as string;
    throw Object.assign(new Error(data.message ?? data.Message ?? name), { name });
  }
  return data as T;
}

function decodeJwt(token: string) {
  const part = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
  const json = decodeURIComponent(
    Array.from(atob(part), (c) => `%${c.charCodeAt(0).toString(16).padStart(2, "0")}`).join(""),
  );
  return { payload: JSON.parse(json), toString: () => token };
}

interface AuthenticationResult {
  AccessToken: string;
  IdToken?: string;
  RefreshToken?: string;
}

/**
 * Confirm the sign-up code and sign the user in without their password.
 * Resolves false when the code was accepted but no session could be opened
 * (the caller then sends the user to the login page).
 */
export async function confirmSignUpAndSignIn(email: string, code: string): Promise<boolean> {
  const { clientId } = cognitoClient();
  const { Session } = await cognitoCall<{ Session?: string }>("ConfirmSignUp", {
    ClientId: clientId,
    Username: email,
    ConfirmationCode: code,
  });
  if (!Session) return false;
  try {
    await clearSession();
    const { AuthenticationResult: tokens } = await cognitoCall<{ AuthenticationResult?: AuthenticationResult }>(
      "InitiateAuth",
      { ClientId: clientId, AuthFlow: "USER_AUTH", AuthParameters: { USERNAME: email }, Session },
    );
    if (!tokens?.AccessToken) return false;
    const accessToken = decodeJwt(tokens.AccessToken);
    const issuedAt = (accessToken.payload.iat ?? 0) * 1000;
    await cognitoUserPoolsTokenProvider.tokenOrchestrator.setTokens({
      tokens: {
        accessToken,
        idToken: tokens.IdToken ? decodeJwt(tokens.IdToken) : undefined,
        refreshToken: tokens.RefreshToken,
        clockDrift: issuedAt > 0 ? issuedAt - Date.now() : 0,
        username: accessToken.payload.username as string,
      },
    });
    return true;
  } catch {
    // The account is confirmed; signing in by hand stays a safe fallback.
    return false;
  }
}
