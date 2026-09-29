import { fetchAuthSession } from 'aws-amplify/auth';
import { apiErrorMessage } from '@/lib/api';
import type { BlogDocument, BlogPost } from '@/lib/blogTypes';

const BLOG_API = (import.meta.env.VITE_BLOG_API_URL || 'https://blogs-api.tsuru.jcampos.dev').replace(/\/+$/, '');

async function request<T>(userId: string, method: string, path: string, body?: unknown): Promise<T> {
  const token = (await fetchAuthSession()).tokens?.idToken?.toString();
  if (!token) throw new Error('Sign-in required');
  const response = await fetch(`${BLOG_API}/api/users/${encodeURIComponent(userId)}/blog${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) {
    const result: unknown = await response.json().catch(() => null);
    throw new Error(apiErrorMessage(result) || `Request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

export const blogApi = {
  list: (userId: string) => request<BlogPost[]>(userId, 'GET', '/posts'),
  create: (userId: string, slug: string, document: BlogDocument) =>
    request<BlogPost>(userId, 'POST', '/posts', { slug, document }),
  save: (userId: string, id: string, baseVersion: number, document: BlogDocument) =>
    request<BlogPost>(userId, 'PUT', `/posts/${encodeURIComponent(id)}/draft`, { base_version: baseVersion, document }),
  submit: (userId: string, id: string, baseVersion: number) =>
    request<BlogPost>(userId, 'POST', `/posts/${encodeURIComponent(id)}/submit`, { base_version: baseVersion }),
  upload: (userId: string, file: File) =>
    request<{ id: string; uploadUrl: string; headers: Record<string, string>; publicUrl: string }>(
      userId, 'POST', '/media/uploads', { content_type: file.type, size_bytes: file.size }),
  completeUpload: (userId: string, id: string) =>
    request<{ id: string; publicUrl: string }>(userId, 'POST', `/media/${encodeURIComponent(id)}/complete`),
};
