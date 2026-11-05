import { fetchAuthSession } from 'aws-amplify/auth';

export interface PartnerConnectionSummary {
  id: string;
  application_name: string;
  connection_name: string;
  scopes: string[];
  status: 'active' | 'expired' | 'revoked';
  expires_at: string;
  revoked_at: string | null;
}

export async function partnerConnections<T>(orgId: string, connectionId?: string): Promise<T> {
  const base = import.meta.env.VITE_PARTNER_API_URL;
  if (!base) throw new Error('connections.unavailable');
  const session = await fetchAuthSession();
  const token = session.tokens?.idToken?.toString();
  if (!token) throw new Error('connections.signIn');
  const path = `/api/partner-connections/organizations/${encodeURIComponent(orgId)}`
    + (connectionId ? `/${encodeURIComponent(connectionId)}/revoke` : '');
  const response = await fetch(base + path, {
    method: connectionId ? 'POST' : 'GET',
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store', redirect: 'error',
  });
  if (!response.ok) throw new Error(response.status === 403 ? 'connections.ownerOnly' : response.status === 401 ? 'connections.signIn' : 'connections.failed');
  return response.json();
}
