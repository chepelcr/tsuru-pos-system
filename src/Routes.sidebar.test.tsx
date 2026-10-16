import type { ReactNode } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Router } from 'wouter';
import { memoryLocation } from 'wouter/memory-location';
import { LanguageProvider } from '@/contexts/LanguageContext';
import Routes from './Routes';

const state = vi.hoisted(() => ({ canRead: true }));
vi.mock('@/contexts/AuthContext', () => ({ useAuthContext: () => ({ user: { userId: 'user-1', role: 'customer', first_name: 'Test' }, isLoading: false }) }));
vi.mock('@/hooks/useOrganization', () => ({ useOrganization: () => ({ useDefaultOrganization: () => ({ data: { id: 'org-1', name: 'Test organization' } }) }) }));
vi.mock('@/hooks/useRbac', () => ({
  usePermissions: () => ({ can: () => state.canRead, hasModule: () => true, isReady: true, role: 'admin' }),
  useCanOpenCreateMenu: () => false,
  useCreatableDocTypes: () => [],
}));
vi.mock('@/hooks/useActiveSession', () => ({ useActiveSession: () => null }));
vi.mock('@/components/common/UserAvatar', () => ({ UserAvatar: () => null }));
vi.mock('@/contexts/DocumentVersionContext', () => ({ DocumentVersionProvider: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock('@/hooks/useOfflineBootstrap', () => ({ useOfflineBootstrap: () => {} }));
vi.mock('@/hooks/useCatalogInvalidationFeed', () => ({ useCatalogInvalidationFeed: () => {} }));
vi.mock('@/hooks/usePermissionsLiveSync', () => ({ usePermissionsLiveSync: () => {} }));
vi.mock('@/contexts/OrgContext', () => ({ OrgProvider: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock('@/contexts/ExchangeRateContext', () => ({ ExchangeRateProvider: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock('@/components/documents/DocumentImportTray', () => ({ DocumentImportTray: () => null }));
// Exercise the actual sidebar and layout route mapping, while omitting unrelated
// header/document services. The wrapper's DOM identity detects shell remounts.
vi.mock('@/components/layout/DashboardShell', async () => {
  const { DashboardSidebar } = await import('@/components/layout/DashboardSidebar');
  return { default: ({ children, active, onNav }: { children: ReactNode; active: import('@/components/layout/navIds').NavId; onNav: (id: import('@/components/layout/navIds').NavId) => void }) =>
    <div data-testid="dashboard-shell"><DashboardSidebar active={active} onNav={onNav} />{children}</div> };
});
vi.mock('@/pages/dashboard/BlogWriterPage', () => ({ default: () => <h1>My articles page</h1> }));
vi.mock('@/pages/dashboard/DashboardPage', () => ({ default: () => <h1>Overview page</h1> }));
vi.mock('@/pages/dashboard/ProductsPage', () => ({ default: () => <h1>Products page</h1> }));
vi.mock('@/pages/dashboard/CategoriesPage', () => ({ default: () => <h1>Categories page</h1> }));
vi.mock('@/pages/dashboard/BranchesPage', () => ({ default: () => <h1>Branches page</h1> }));
vi.mock('@/pages/dashboard/BranchTypesPage', () => ({ default: () => <h1>Branch types page</h1> }));
vi.mock('@/pages/dashboard/TerminalDetailPage', () => ({ default: () => <h1>Terminal page</h1> }));
vi.mock('@/pages/dashboard/ProductDetailPage', () => ({ default: ({ productId }: { productId: string }) => <h1>Product {productId}</h1> }));
vi.mock('@/pages/dashboard/OrgGeneralPage', () => ({ default: () => <h1>Organization general page</h1> }));
vi.mock('@/pages/dashboard/ProfilePage', () => ({ default: () => <h1>Profile page</h1> }));
vi.mock('@/pages/dashboard/TutorialGuidePage', () => ({ default: () => <h1>Getting started page</h1> }));

function openPage(path = '/dashboard/blog') {
  const router = memoryLocation({ path });
  const view = render(<LanguageProvider><Router hook={router.hook}><Routes /></Router></LanguageProvider>);
  return { ...view, router };
}
function section(label: string) {
  const trigger = screen.getByRole('button', { name: label });
  return { trigger, content: trigger.nextElementSibling as HTMLElement };
}
beforeEach(() => {
  vi.stubEnv('VITE_BLOG_ENABLED', 'true');
  localStorage.setItem('language', 'en');
  state.canRead = true;
});

afterEach(() => vi.unstubAllEnvs());

describe('persistent sidebar accordion across dashboard navigation', () => {
  it('opens branch types from Internal Administration and preserves old branch links', async () => {
    const view = openPage('/dashboard/stations');
    await screen.findByRole('heading', { name: 'Branches page' });
    expect(section('Internal Administration').content.dataset.open).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Branch types' }));
    await screen.findByRole('heading', { name: 'Branch types page' });
    expect(section('Internal Administration').content.dataset.open).toBe('true');
    act(() => view.router.navigate('/dashboard/stations/1/terminals/2'));
    await screen.findByRole('heading', { name: 'Terminal page' });
  });
  it('keeps the open section mounted so it can close when leaving a subsection for the overview', async () => {
    openPage();
    await screen.findByRole('heading', { name: 'My articles page' });
    const sidebar = screen.getByRole('complementary');
    const tsuru = section('Tsuru');
    expect(tsuru.content.dataset.open).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Panel' }));
    await screen.findByRole('heading', { name: 'Overview page' });
    expect(screen.getByRole('complementary')).toBe(sidebar);
    expect(section('Tsuru').content).toBe(tsuru.content);
    expect(tsuru.content.dataset.open).toBe('false');
  });

  it('preserves both accordion panels when switching from an active subsection to another group', async () => {
    openPage();
    await screen.findByRole('heading', { name: 'My articles page' });
    const tsuru = section('Tsuru');
    const commercial = section('Commercial Management');
    fireEvent.click(commercial.trigger);
    expect(tsuru.content.dataset.open).toBe('false');
    expect(commercial.content.dataset.open).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Products' }));
    await screen.findByRole('heading', { name: 'Products page' });
    expect(section('Commercial Management').content).toBe(commercial.content);
    expect(commercial.content.dataset.open).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Panel' }));
    await screen.findByRole('heading', { name: 'Overview page' });
    expect(commercial.content.dataset.open).toBe('false');
  });

  it('keeps an accordion open when navigating within its section and supports manual close/reopen', async () => {
    openPage('/dashboard/products');
    await screen.findByRole('heading', { name: 'Products page' });
    const commercial = section('Commercial Management');
    fireEvent.click(screen.getByRole('button', { name: 'Categories' }));
    await screen.findByRole('heading', { name: 'Categories page' });
    expect(section('Commercial Management').content).toBe(commercial.content);
    expect(commercial.content.dataset.open).toBe('true');
    fireEvent.click(commercial.trigger);
    expect(commercial.content.dataset.open).toBe('false');
    fireEvent.click(commercial.trigger);
    expect(commercial.content.dataset.open).toBe('true');
  });

  it('animates route-driven group changes using the same mounted panels', async () => {
    const view = openPage('/dashboard/products');
    await screen.findByRole('heading', { name: 'Products page' });
    const commercial = section('Commercial Management');
    const tsuru = section('Tsuru');
    act(() => view.router.navigate('/dashboard/guide'));
    await screen.findByRole('heading', { name: 'Getting started page' });
    expect(section('Commercial Management').content).toBe(commercial.content);
    expect(commercial.content.dataset.open).toBe('false');
    expect(section('Tsuru').content).toBe(tsuru.content);
    expect(tsuru.content.dataset.open).toBe('true');
    act(() => view.router.navigate('/dashboard/profile'));
    await screen.findByRole('heading', { name: 'Profile page' });
    expect(tsuru.content.dataset.open).toBe('false');
  });

  it('retains detail-route parameters and organization subpage matching inside the persistent shell', async () => {
    const view = openPage('/dashboard/products');
    await screen.findByRole('heading', { name: 'Products page' });
    const sidebar = screen.getByRole('complementary');
    act(() => view.router.navigate('/dashboard/products/product-42'));
    await screen.findByRole('heading', { name: 'Product product-42' });
    expect(screen.getByRole('complementary')).toBe(sidebar);
    act(() => view.router.navigate('/dashboard/organization/general'));
    await screen.findByRole('heading', { name: 'Organization general page' });
    expect(screen.getByRole('complementary')).toBe(sidebar);
  });

  it('still checks each page permission when navigating inside the shell', async () => {
    const view = openPage();
    await screen.findByRole('heading', { name: 'My articles page' });
    state.canRead = false;
    act(() => view.router.navigate('/dashboard/products'));
    expect(await screen.findByRole('heading', { name: 'No access' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Products page' })).toBeNull();
  });
});
