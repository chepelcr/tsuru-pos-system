import { useMutation } from '@tanstack/react-query';
import { salesApi, notifyPath } from '@/lib/api';
const notifyApi = salesApi;

interface ResendPayload {
  copy_emails?: string[];
  message?: string;
}

export function useResendNotification(orgId: string, saleId: string) {
  return useMutation<void, Error, ResendPayload>({
    mutationFn: (payload) =>
      notifyApi.post<void>(notifyPath(orgId, saleId, '/resend'), payload),
  });
}
