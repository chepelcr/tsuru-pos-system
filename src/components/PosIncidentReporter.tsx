import { useEffect } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { flushPendingPosIncidents } from '@/lib/supportIncidents';

/** Flush queued incidents after auth/org selection and network recovery. The
 * global listeners live in main.tsx so they also cover pre-authentication. */
export function PosIncidentReporter() {
  const { user } = useAuthContext();

  useEffect(() => {
    void flushPendingPosIncidents();
    const onOnline = () => { void flushPendingPosIncidents(); };
    window.addEventListener('online', onOnline);
    return () => {
      window.removeEventListener('online', onOnline);
    };
  }, [user?.userId]);

  return null;
}
