import { beforeEach, describe, expect, it, vi } from "vitest";

const amplify = vi.hoisted(() => ({ signIn: vi.fn(), confirmSignIn: vi.fn(), signOut: vi.fn(), setTokens: vi.fn() }));
vi.mock("aws-amplify", () => ({ Amplify: { getConfig: () => ({ Auth: { Cognito: { userPoolId: "us-east-1_pool", userPoolClientId: "client-1" } } }) } }));
vi.mock("aws-amplify/auth", () => ({ signIn: amplify.signIn, confirmSignIn: amplify.confirmSignIn, signOut: amplify.signOut }));
vi.mock("aws-amplify/auth/cognito", () => ({ cognitoUserPoolsTokenProvider: { tokenOrchestrator: { setTokens: amplify.setTokens } } }));
import { completeMagicLink, confirmSignUpAndSignIn, readMagicLink, requestMagicLink } from "./passwordless";

const jwt = (payload: object) => `h.${btoa(JSON.stringify(payload)).replace(/=+$/, "")}.s`;
const reply = (status: number, body: object) => ({ ok: status < 400, status, json: async () => body });

describe("passwordless sign-in", () => {
  beforeEach(() => { vi.clearAllMocks(); amplify.signOut.mockResolvedValue(undefined); });

  it("reads the link fragment", () => {
    expect(readMagicLink("#u=abc-123&t=tok_en")).toEqual({ username: "abc-123", token: "tok_en" });
    expect(readMagicLink("#u=abc-123")).toBeNull();
  });

  it("requests a link for this app's origin and never reveals unknown accounts", async () => {
    amplify.signIn.mockResolvedValueOnce({ nextStep: { signInStep: "CONFIRM_SIGN_IN_WITH_CUSTOM_CHALLENGE" } });
    amplify.confirmSignIn.mockResolvedValueOnce({ isSignedIn: false, nextStep: { signInStep: "CONFIRM_SIGN_IN_WITH_CUSTOM_CHALLENGE" } });
    expect(await requestMagicLink("a@b.co")).toBe(true);
    // InitiateAuth metadata never reaches the challenge triggers: it rides on the answer.
    expect(amplify.confirmSignIn).toHaveBeenCalledWith({ challengeResponse: "__request_link__", options: { clientMetadata: { mode: "request", redirect: window.location.origin } } });
    amplify.signIn.mockRejectedValueOnce(Object.assign(new Error("x"), { name: "NotAuthorizedException" }));
    expect(await requestMagicLink("ghost@b.co")).toBe(true);
    amplify.signIn.mockRejectedValueOnce(Object.assign(new Error("x"), { name: "UserNotConfirmedException" }));
    expect(await requestMagicLink("new@b.co")).toBe(false);
  });

  it("answers the challenge in verify mode without mailing again", async () => {
    amplify.signIn.mockResolvedValue({ nextStep: { signInStep: "CONFIRM_SIGN_IN_WITH_CUSTOM_CHALLENGE" } });
    amplify.confirmSignIn.mockResolvedValue({ isSignedIn: true });
    await completeMagicLink("abc-123", "tok");
    expect(amplify.signIn.mock.calls[0][0]).toEqual({ username: "abc-123", options: { authFlowType: "CUSTOM_WITHOUT_SRP" } });
    expect(amplify.confirmSignIn).toHaveBeenCalledWith({ challengeResponse: "tok" });
    amplify.confirmSignIn.mockResolvedValue({ isSignedIn: false });
    await expect(completeMagicLink("abc-123", "used")).rejects.toThrow();
  });

  it("confirms the code and signs in from the ConfirmSignUp session, without a password", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(reply(200, { Session: "sess" }))
      .mockResolvedValueOnce(reply(200, { AuthenticationResult: { AccessToken: jwt({ username: "abc-123", iat: 1 }), IdToken: jwt({ sub: "abc-123" }), RefreshToken: "r" } }));
    vi.stubGlobal("fetch", fetchMock);
    expect(await confirmSignUpAndSignIn("a@b.co", "123456")).toBe(true);
    const [, confirm] = fetchMock.mock.calls[0];
    expect(confirm.headers["X-Amz-Target"]).toBe("AWSCognitoIdentityProviderService.ConfirmSignUp");
    const initiate = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(initiate).toEqual({ ClientId: "client-1", AuthFlow: "USER_AUTH", AuthParameters: { USERNAME: "a@b.co" }, Session: "sess" });
    expect(amplify.setTokens.mock.calls[0][0].tokens).toMatchObject({ username: "abc-123", refreshToken: "r" });
  });

  it("surfaces a wrong code with Cognito's error name and stays signed out", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(reply(400, { __type: "CodeMismatchException", message: "Invalid code" })));
    await expect(confirmSignUpAndSignIn("a@b.co", "000000")).rejects.toMatchObject({ name: "CodeMismatchException" });
    expect(amplify.setTokens).not.toHaveBeenCalled();
  });
});
