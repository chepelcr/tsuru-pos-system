/**
 * Cognito error → user-facing message, with the next step the page can offer.
 *
 * Why this exists: every auth page used to do
 *
 *     const message = error instanceof Error ? error.message : t("...error");
 *     add({ ..., bodyKey: message });
 *
 * which passes a raw Cognito string ("User already exists") as an i18n KEY, and
 * sends it to the notification bell — a component that only renders inside the
 * dashboard shell. On `AuthLayout` there is no bell, so the user saw literally
 * nothing when registration failed. A tester hit `UsernameExistsException`
 * three times in a row with no feedback at all (roadmap TSR-309).
 *
 * `describeAuthError` maps the exception to a real translation key and to an
 * `action` the page can turn into a button, so a dead end becomes a way out.
 */

/** Affordance the page should offer beside the message. */
export type AuthErrorAction = "verify" | "login" | "register" | "resend" | "forgotPassword" | null;

export interface AuthErrorInfo {
  /** i18n key for the message shown to the user (always a real key). */
  messageKey: string;
  /** Cognito exception name, or "" when it could not be determined. */
  name: string;
  /** Suggested next step, or null when there is nothing useful to offer. */
  action: AuthErrorAction;
  /**
   * Raw provider message, set ONLY when the error is unmapped. Pages render it
   * as a muted second line: untranslated detail beats a silent failure, and it
   * is the string we need if someone reports the screen.
   */
  detail?: string;
}

interface Mapping {
  messageKey: string;
  action?: AuthErrorAction;
}

/**
 * Keyed by Cognito exception name. Amplify v6 sets these on `error.name`; the
 * raw `__type` also appears in some wrapped messages, so we match both.
 */
const BY_NAME: Record<string, Mapping> = {
  // ── Sign-up ───────────────────────────────────────────────────────────────
  // The account may be UNCONFIRMED (the common case: a previous attempt created
  // it and the mail never arrived) or CONFIRMED. The FE cannot tell them apart
  // without an endpoint, so we offer both ways out.
  UsernameExistsException: { messageKey: "auth.errors.usernameExists", action: "verify" },
  InvalidPasswordException: { messageKey: "auth.errors.invalidPassword" },
  AliasExistsException: { messageKey: "auth.errors.aliasExists", action: "login" },

  // ── Sign-in ───────────────────────────────────────────────────────────────
  NotAuthorizedException: { messageKey: "auth.errors.notAuthorized" },
  UserNotFoundException: { messageKey: "auth.errors.userNotFound", action: "register" },
  UserNotConfirmedException: { messageKey: "auth.errors.userNotConfirmed", action: "verify" },
  PasswordResetRequiredException: {
    messageKey: "auth.errors.passwordResetRequired",
    action: "forgotPassword",
  },

  // ── Codes ─────────────────────────────────────────────────────────────────
  CodeMismatchException: { messageKey: "auth.errors.codeMismatch" },
  ExpiredCodeException: { messageKey: "auth.errors.expiredCode", action: "resend" },
  LimitExceededException: { messageKey: "auth.errors.limitExceeded" },
  TooManyRequestsException: { messageKey: "auth.errors.limitExceeded" },
  TooManyFailedAttemptsException: { messageKey: "auth.errors.limitExceeded" },

  // ── The mail itself could not be produced or delivered ────────────────────
  // These are the pool's CustomMessage trigger Lambda failing (or SES refusing
  // the recipient), not anything the user did. It is a real, recurring failure
  // here — see TSR-137/TSR-308 — and it must not read as "wrong password".
  UnexpectedLambdaException: { messageKey: "auth.errors.emailUnavailable" },
  InvalidLambdaResponseException: { messageKey: "auth.errors.emailUnavailable" },
  UserLambdaValidationException: { messageKey: "auth.errors.emailUnavailable" },
  CodeDeliveryFailureException: { messageKey: "auth.errors.emailUnavailable" },

  // ── Transport / session ───────────────────────────────────────────────────
  NetworkError: { messageKey: "auth.errors.network" },
  UserAlreadyAuthenticatedException: { messageKey: "auth.errors.alreadyAuthenticated", action: "login" },
};

/**
 * `InvalidParameterException` is Cognito's catch-all and means different things
 * per flow, distinguishable only by its message text. Two matter to us:
 *  - password reset requested for a user with no verified email (i.e. the
 *    sign-up code never arrived, which is exactly how TSR-308 presented);
 *  - a verification resend for an account that is already confirmed.
 */
function mapInvalidParameter(message: string): Mapping {
  const text = message.toLowerCase();
  if (text.includes("no registered/verified") || text.includes("verified email")) {
    return { messageKey: "auth.errors.resetUnverified", action: "verify" };
  }
  if (text.includes("already confirmed")) {
    return { messageKey: "auth.errors.alreadyConfirmed", action: "login" };
  }
  return { messageKey: "auth.errors.invalidParameter" };
}

const KNOWN_NAMES = Object.keys(BY_NAME);

/** Pull the exception name off the error, or find it inside a wrapped message. */
function resolveName(error: unknown, message: string): string {
  const name = (error as { name?: string })?.name ?? "";
  if (name && (BY_NAME[name] || name === "InvalidParameterException")) return name;
  if (message.includes("InvalidParameterException")) return "InvalidParameterException";
  return KNOWN_NAMES.find((candidate) => message.includes(candidate)) ?? name;
}

/**
 * Describe a caught auth error.
 *
 * @param fallbackKey i18n key used when the error is not one we recognise.
 */
export function describeAuthError(error: unknown, fallbackKey: string): AuthErrorInfo {
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  const name = resolveName(error, message);

  const mapping =
    name === "InvalidParameterException" ? mapInvalidParameter(message) : BY_NAME[name];

  if (!mapping) {
    // Unmapped: show the page's own fallback, and keep the provider text as a
    // second line so the screen still says something concrete.
    return { messageKey: fallbackKey, name, action: null, detail: message || undefined };
  }

  return { messageKey: mapping.messageKey, name, action: mapping.action ?? null };
}
