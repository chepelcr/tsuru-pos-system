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
  firstName: string;
  lastName: string;
  username: string;
}

/**
 * Update the signed-in user's profile on the markets-api.
 *
 * ⚠ Uses `api.put` (not PATCH): the real route is
 * `PUT /api/users/{userId}/profile` (UserController registers `router.put`).
 *
 * TODO(verify-endpoint): confirm the markets-api `PUT /api/users/{userId}/profile`
 * accepts exactly `{ firstName, lastName, username }` and returns the full updated
 * profile. If a PATCH alias is later added, switch the verb here.
 */
export function useUpdateProfile() {
  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: UpdateProfileData }) =>
      api.put<UpdateProfileData>(userPath(userId, "/profile"), data),
  });
}
