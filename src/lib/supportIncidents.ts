import { getCurrentUser } from 'aws-amplify/auth';
import { fetchAuthSession } from 'aws-amplify/auth';
import { api } from './api';
import { getSelectedOrgId } from './selectedOrg';
import { queryClient } from './queryClient';
import type { Organization } from '@/types';

export type IncidentSource = 'react-boundary' | 'window-error' | 'unhandled-rejection' | 'backend-http';
export interface PosIncident {
  module: string;
  source: IncidentSource;
  route: string;
  error_name?: string;
  error_message: string;
  stack_trace?: string;
  app_version?: string;
  service?: string;
  status_code?: number;
}

const STORAGE_KEY = 'tsuru_pending_pos_incidents';
const MAX_PENDING = 20;

export function moduleFromPath(path: string): string {
  const parts = path.split('/').filter(Boolean);
  const segment = parts[0] === 'dashboard' ? (parts[1] ?? 'dashboard') : (parts[0] ?? 'app-shell');
  const moduleNames: Record<string, string> = {
    documents: 'documents', orders: 'orders', products: 'products',
    categories: 'categories', clients: 'clients', sessions: 'sessions',
    stations: 'stations', reports: 'reports', content: 'storefront-content',
    gallery: 'storefront-gallery', templates: 'storefront-templates',
    deployments: 'storefront-deployments', organization: 'organization-settings',
    members: 'members', roles: 'roles', support: 'support',
  };
  return moduleNames[segment] ?? (['login', 'register', 'signup', 'forgot-password'].includes(segment) ? 'authentication' : segment === 'dashboard' ? 'dashboard' : 'app-shell');
}

function sessionId(): string {
  try {
    const stored = sessionStorage.getItem('tsuru_incident_session_id');
    if (stored) return stored;
    const id = crypto.randomUUID();
    sessionStorage.setItem('tsuru_incident_session_id', id);
    return id;
  } catch { return crypto.randomUUID(); }
}

function pending(): PosIncident[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') as PosIncident[]; }
  catch { return []; }
}

function save(items: PosIncident[]): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(-MAX_PENDING))); }
  catch { /* Storage disabled: live POST remains the only path. */ }
}

async function organizationId(): Promise<string | undefined> {
  const selected = getSelectedOrgId();
  if (selected) return selected;
  try {
    const user = await getCurrentUser();
    const orgs = queryClient.getQueryData<Organization[]>(['user-organizations', user.userId]);
    return orgs?.[0]?.id;
  } catch { return undefined; }
}

async function send(incident: PosIncident): Promise<boolean> {
  let token: string | undefined;
  try { token = (await fetchAuthSession()).tokens?.idToken?.toString(); } catch { /* Anonymous screen. */ }
  const orgId = token ? await organizationId() : undefined;
  const body = {
    module: incident.module, source: incident.source, service: incident.service,
    status_code: incident.status_code, route: incident.route.split('?')[0],
    error_name: incident.error_name, error_message: incident.error_message.slice(0, 2000),
    stack_trace: incident.stack_trace?.slice(0, 4000), app_version: incident.app_version,
  };
  try {
    if (orgId) {
      await api.post('/api/support/incidents', { ...body, organization_id: orgId });
    } else {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://api.tsuru.jcampos.dev'}/api/public/support/incidents`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...body, surface: 'pos', session_id: sessionId() }),
      });
      if (!response.ok) return false;
    }
    return true;
  } catch { return false; }
}

/** An error must never trigger another uncaught error while reporting itself. */
export async function reportPosIncident(input: {
  source: IncidentSource; error: unknown; stack?: string; route?: string;
  module?: string; service?: string; statusCode?: number;
}): Promise<void> {
  try {
    const route = input.route ?? window.location.pathname;
    const error = input.error instanceof Error ? input.error : new Error(String(input.error));
    const incident: PosIncident = {
      module: input.module ?? moduleFromPath(route), source: input.source, route,
      error_name: error.name, error_message: error.message || 'Unknown application error',
      stack_trace: input.stack ?? error.stack,
      app_version: import.meta.env.VITE_APP_VERSION || import.meta.env.MODE,
      service: input.service, status_code: input.statusCode,
    };
    if (!(await send(incident))) save([...pending(), incident]);
  } catch { /* The error boundary must always remain usable. */ }
}

/** Called for actual server responses, never for 4xx or a health probe. */
export async function reportBackendHttpIncident(input: {
  service: string; statusCode: number; method: string; path: string; message: string;
}): Promise<void> {
  if (input.statusCode < 500 || input.statusCode > 599) return;
  await reportPosIncident({
    source: 'backend-http', module: moduleFromPath(window.location.pathname),
    service: input.service, statusCode: input.statusCode,
    route: input.path, error: new Error(`${input.method} ${input.path}: ${input.message}`),
  });
}

/** Catch up after auth/org selection or a network outage; no polling. */
export async function flushPendingPosIncidents(): Promise<void> {
  const items = pending();
  if (!items.length) return;
  const remaining: PosIncident[] = [];
  for (const item of items) {
    if (!(await send(item))) remaining.push(item);
  }
  save(remaining);
}
