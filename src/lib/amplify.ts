import { Amplify } from "aws-amplify";

/**
 * AppSync Events endpoint for real-time notifications.
 *
 * Empty when the environment does not have the Events API provisioned (local
 * dev, a preview build). `useRealtimeNotifications` treats that as "no push"
 * and the bell falls back to what the hydrate fetch loaded — degraded, but
 * never broken.
 */
function normalizeEventsEndpoint(raw: string | undefined): string {
  const value = (raw ?? "").trim().replace(/\/+$/, "");
  if (!value) return "";
  // Amplify wants the HTTP endpoint with the `/event` path. The CloudFormation
  // output is the bare host, so both spellings are accepted and normalized
  // here rather than depending on whoever set the variable getting it right.
  return value.endsWith("/event") ? value : `${value}/event`;
}

export const EVENTS_ENDPOINT: string = normalizeEventsEndpoint(
  import.meta.env.VITE_APPSYNC_EVENTS_URL,
);

const region: string = import.meta.env.VITE_AWS_REGION || "us-east-1";

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: import.meta.env.VITE_AWS_COGNITO_USER_POOL_ID,
      userPoolClientId: import.meta.env.VITE_AWS_COGNITO_CLIENT_ID,
      loginWith: {
        email: true,
      },
    },
  },
  // The Events API is configured only when it exists. Declaring it with an
  // empty endpoint makes Amplify attempt (and log) a connection to nowhere on
  // every mount.
  ...(EVENTS_ENDPOINT
    ? {
        API: {
          Events: {
            endpoint: EVENTS_ENDPOINT,
            region,
            // Subscribers present the Cognito id token they already hold —
            // there is no second credential for the app to obtain or refresh.
            defaultAuthMode: "userPool" as const,
          },
        },
      }
    : {}),
});
