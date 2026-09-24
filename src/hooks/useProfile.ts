import { useMutation } from "@tanstack/react-query";
import { api, userPath } from "@/lib/api";

/**
 * Body accepted by the markets-api profile update route.
 *
 * The backend `PUT /api/users/{userId}/profile` swagger schema accepts ONLY
 * these three fields. `email` is a Cognito-managed attribute and is NOT part
 * of this payload (changing it requires a separate Cognito updateUserAttribute
 * + re-verification flow — out of scope). See plan 06 §2.2.
 */
export interface UpdateProfileData {
  first_name: string;
  last_name: string;
  username: string;
}

/**
 * Update the signed-in user's profile on the markets-api.
 *
 * ⚠ Uses `api.put` (not PATCH): the real route is
 * `PUT /api/users/{userId}/profile` (UserController registers `router.put`).
 *
 * TODO(verify-endpoint): confirm the markets-api `PUT /api/users/{userId}/profile`
 * accepts exactly `{ first_name, last_name, username }` and returns the full updated
 * profile. If a PATCH alias is later added, switch the verb here.
 */
/** PUT /profile body for the first-login tour (the server stamps the time). */
export interface UpdateOnboardingTourData {
  /** true = finished or skipped; false = restart it on the next dashboard visit. */
  onboarding_tour_completed: boolean;
}

/** The profile fields the tour reads back (subset of the profile response). */
export interface OnboardingTourProfile {
  onboarding_tour_completed_at: string | null;
}

export function useUpdateOnboardingTour() {
  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: UpdateOnboardingTourData }) =>
      api.put<OnboardingTourProfile>(userPath(userId, "/profile"), data),
  });
}

export function useUpdateProfile() {
  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: UpdateProfileData }) =>
      api.put<UpdateProfileData>(userPath(userId, "/profile"), data),
  });
}
