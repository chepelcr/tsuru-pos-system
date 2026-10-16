import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { crossAppApi } from '@/lib/api';
import BranchTypesPage from './BranchTypesPage';

const state = vi.hoisted(() => ({ orgId: 'org-1', writable: true }));
vi.mock('@/contexts/OrgContext', () => ({ useOrgContext: () => ({ orgId: state.orgId }) }));
vi.mock('@/hooks/useRbac', () => ({ usePermissions: () => ({ can: (_module: string, action: string) => action === 'read' || state.writable }) }));
vi.mock('@/lib/api', () => ({
  crossAppApi: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
  crossAppOrgPath: (org: string, path: string) => `/api/organizations/${org}${path}`,
}));
const type = { id: 'type-1', code: 'shop', name: 'Shop', sort_order: 0, status: 1 };

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const tree = () => <QueryClientProvider client={client}><LanguageProvider><BranchTypesPage /></LanguageProvider></QueryClientProvider>;
  const view = render(tree());
  return { ...view, tree };
}
beforeEach(() => {
  vi.resetAllMocks();
  state.orgId = 'org-1';
  state.writable = true;
  localStorage.setItem('language', 'en');
  Element.prototype.scrollIntoView = vi.fn();
  vi.mocked(crossAppApi.get).mockResolvedValue({ data: [] });
});

describe('branch type management', () => {
  it('offers twenty labeled icons, prepends the icon, and saves the selected icon', async () => {
    vi.mocked(crossAppApi.get).mockResolvedValue({ data: [type] });
    vi.mocked(crossAppApi.put).mockResolvedValue({ ...type, icon: 'warehouse' });
    setup();
    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    const combo = screen.getByRole('combobox', { name: 'Icon' });
    fireEvent.click(combo);
    expect(screen.getAllByRole('option')).toHaveLength(20);
    const warehouse = screen.getByRole('option', { name: 'Warehouse' });
    expect(warehouse.firstElementChild?.tagName.toLowerCase()).toBe('svg');
    fireEvent.click(warehouse);
    expect(combo.textContent).toBe('Warehouse');
    expect(combo.querySelectorAll('span > svg')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(crossAppApi.put).toHaveBeenCalledWith('/api/organizations/org-1/branch-types/type-1', expect.objectContaining({ icon: 'warehouse' })));
  });
  it('identifies the default type and keeps its edit action available', async () => {
    vi.mocked(crossAppApi.get).mockResolvedValue({ data: [{ ...type, code: 'branch', name: 'Branch', is_default: true }] });
    setup();
    await screen.findByRole('heading', { name: 'Branch' });
    expect(screen.getByText('Default type')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Edit' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Delete' })).toBeNull();
  });
  it('keeps an empty organization catalog empty instead of adding legacy types', async () => {
    setup();
    await screen.findByText('No branch types yet');
    expect(screen.queryByText('Booth')).toBeNull();
    expect(screen.queryByText('Venue')).toBeNull();
  });
  it('surfaces request failures with a retry instead of showing invented types', async () => {
    vi.mocked(crossAppApi.get).mockRejectedValueOnce(new Error('Unavailable'));
    setup();
    await screen.findByText('Could not load branch types.');
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await screen.findByText('No branch types yet');
  });
  it('creates in the active organization and refreshes its catalog', async () => {
    vi.mocked(crossAppApi.post).mockResolvedValue(type);
    setup();
    await screen.findByText('No branch types yet');
    fireEvent.click(screen.getAllByRole('button', { name: 'New branch type' })[0]);
    fireEvent.change(screen.getByLabelText(/Name/), { target: { value: 'Shop' } });
    fireEvent.change(screen.getByLabelText(/Code/), { target: { value: 'shop' } });
    vi.mocked(crossAppApi.get).mockResolvedValue({ data: [type] });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await screen.findByRole('heading', { name: 'Shop' });
    expect(crossAppApi.post).toHaveBeenCalledWith('/api/organizations/org-1/branch-types', expect.objectContaining({ code: 'shop', name: 'Shop' }));
  });
  it('edits the label while preserving the immutable code', async () => {
    vi.mocked(crossAppApi.get).mockResolvedValue({ data: [type] });
    vi.mocked(crossAppApi.put).mockResolvedValue({ ...type, name: 'Market' });
    setup();
    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    const dialog = screen.getByRole('dialog');
    expect((within(dialog).getByLabelText(/Code/) as HTMLInputElement).disabled).toBe(true);
    fireEvent.change(within(dialog).getByLabelText(/Name/), { target: { value: 'Market' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(crossAppApi.put).toHaveBeenCalledWith('/api/organizations/org-1/branch-types/type-1', expect.objectContaining({ name: 'Market' })));
    const payload = vi.mocked(crossAppApi.put).mock.calls[0][1] as Record<string, unknown>;
    expect(payload).not.toHaveProperty('code');
  });
  it('limits read-only users and isolates catalogs when the organization changes', async () => {
    state.writable = false;
    vi.mocked(crossAppApi.get).mockImplementation(async (path) => ({ data: String(path).includes('org-1') ? [type] : [] }));
    const view = setup();
    await screen.findByRole('heading', { name: 'Shop' });
    for (const name of ['Edit', 'Delete', 'New branch type']) expect(screen.queryByRole('button', { name })).toBeNull();
    state.orgId = 'org-2';
    view.rerender(view.tree());
    await screen.findByText('No branch types yet');
    expect(screen.queryByRole('heading', { name: 'Shop' })).toBeNull();
  });
  it('closes an editor when changing organizations instead of sending its old type to the new org', async () => {
    vi.mocked(crossAppApi.get).mockImplementation(async (path) => ({ data: String(path).includes('org-1') ? [type] : [] }));
    const view = setup();
    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    expect(screen.getByRole('dialog')).toBeTruthy();
    state.orgId = 'org-2';
    view.rerender(view.tree());
    await screen.findByText('No branch types yet');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(crossAppApi.put).not.toHaveBeenCalled();
  });
  it('shows an in-use deletion conflict inside the confirmation and preserves the type', async () => {
    vi.mocked(crossAppApi.get).mockResolvedValue({ data: [type] });
    vi.mocked(crossAppApi.delete).mockRejectedValue(new Error('2 branches still use this type'));
    setup();
    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }));
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
    await within(dialog).findByText('2 branches still use this type');
    expect(screen.getByRole('heading', { name: 'Shop' })).toBeTruthy();
  });
});
