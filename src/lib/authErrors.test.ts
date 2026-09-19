import { describe, expect, it } from "vitest";
import { describeAuthError } from "./authErrors";
import { translations } from "@/locales";

/** Build an error shaped like the ones aws-amplify/auth throws. */
function cognitoError(name: string, message = name): Error {
  const error = new Error(message);
  error.name = name;
  return error;
}

const FALLBACK = "auth.register.error";

describe("describeAuthError", () => {
  it("maps the exception that broke registration, and offers a way out", () => {
    // The reported incident: a half-created UNCONFIRMED user made every retry
    // answer UsernameExistsException, and the page said nothing at all.
    const info = describeAuthError(cognitoError("UsernameExistsException", "User already exists"), FALLBACK);

    expect(info.messageKey).toBe("auth.errors.usernameExists");
    expect(info.action).toBe("verify");
    // No raw provider text leaks: a mapped error is fully translated.
    expect(info.detail).toBeUndefined();
  });

  it("reads the exception out of a wrapped message when name is absent", () => {
    // Some call paths surface the raw __type inside the message instead.
    const info = describeAuthError(new Error('{"__type":"UsernameExistsException"}'), FALLBACK);
    expect(info.messageKey).toBe("auth.errors.usernameExists");
  });

  it("separates the two InvalidParameterException meanings by message text", () => {
    const unverified = describeAuthError(
      cognitoError(
        "InvalidParameterException",
        "Cannot reset password for the user as there is no registered/verified email or phone_number",
      ),
      FALLBACK,
    );
    expect(unverified.messageKey).toBe("auth.errors.resetUnverified");
    expect(unverified.action).toBe("verify");

    const confirmed = describeAuthError(
      cognitoError("InvalidParameterException", "User is already confirmed."),
      FALLBACK,
    );
    expect(confirmed.messageKey).toBe("auth.errors.alreadyConfirmed");
    expect(confirmed.action).toBe("login");

    const other = describeAuthError(
      cognitoError("InvalidParameterException", "2 validation errors detected"),
      FALLBACK,
    );
    expect(other.messageKey).toBe("auth.errors.invalidParameter");
    expect(other.action).toBeNull();
  });

  it("does not blame the user for a mail the pool could not send", () => {
    // These are the CustomMessage trigger Lambda failing (TSR-137/TSR-308).
    // Reading them as a credentials problem sends people to reset a password
    // that was never wrong.
    for (const name of [
      "UnexpectedLambdaException",
      "InvalidLambdaResponseException",
      "UserLambdaValidationException",
      "CodeDeliveryFailureException",
    ]) {
      expect(describeAuthError(cognitoError(name), FALLBACK).messageKey).toBe(
        "auth.errors.emailUnavailable",
      );
    }
  });

  it("falls back to the page's own key and keeps the provider text as detail", () => {
    const info = describeAuthError(cognitoError("SomeFutureException", "Something new broke"), FALLBACK);

    expect(info.messageKey).toBe(FALLBACK);
    expect(info.action).toBeNull();
    // Untranslated detail beats a blank screen, and it is what a report needs.
    expect(info.detail).toBe("Something new broke");
  });

  it("handles a non-Error rejection without inventing a message", () => {
    const info = describeAuthError(undefined, FALLBACK);
    expect(info.messageKey).toBe(FALLBACK);
    expect(info.detail).toBeUndefined();
  });

  it("only ever returns keys that both dictionaries define", () => {
    // The whole point of the module is that a raw Cognito string never reaches
    // t() as a key again. Assert every message and action key really exists.
    const names = [
      "UsernameExistsException",
      "AliasExistsException",
      "InvalidPasswordException",
      "NotAuthorizedException",
      "UserNotFoundException",
      "UserNotConfirmedException",
      "PasswordResetRequiredException",
      "CodeMismatchException",
      "ExpiredCodeException",
      "LimitExceededException",
      "TooManyRequestsException",
      "TooManyFailedAttemptsException",
      "UnexpectedLambdaException",
      "InvalidLambdaResponseException",
      "UserLambdaValidationException",
      "CodeDeliveryFailureException",
      "NetworkError",
      "UserAlreadyAuthenticatedException",
      "InvalidParameterException",
    ];

    for (const name of names) {
      const info = describeAuthError(cognitoError(name), FALLBACK);
      for (const lang of ["es", "en"] as const) {
        expect(translations[lang][info.messageKey], `${name} → ${info.messageKey} (${lang})`).toBeTruthy();
        if (info.action) {
          const actionKey = `auth.errors.action.${info.action}`;
          expect(translations[lang][actionKey], `${actionKey} (${lang})`).toBeTruthy();
        }
      }
    }
  });
});
