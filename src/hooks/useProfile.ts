import { useMutation } from "@tanstack/react-query";
import { api, userPath } from "@/lib/api";

/**
 * Body accepted by the markets-api profile update route.
 *
 * These are the editable identity fields. `email` is Cognito-managed and is NOT part
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

interface ProfilePhotoUpload {
  upload_url: string;
  file_url: string;
}

/** Save the permanent URL only after the image upload succeeds. */
export function useUpdateProfilePhoto(userId: string) {
  return useMutation({
    mutationFn: async (file: File) => {
      const target = await api.post<ProfilePhotoUpload>(userPath(userId, "/profile/photo/presigned"), {
        file_type: file.type,
        file_size: file.size,
      });
      const response = await fetch(target.upload_url, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!response.ok) throw new Error("Profile photo upload failed");
      const saved = await api.put<{ picture_url: string }>(userPath(userId, "/profile"), { picture_url: target.file_url });
      return saved.picture_url;
    },
  });
}
