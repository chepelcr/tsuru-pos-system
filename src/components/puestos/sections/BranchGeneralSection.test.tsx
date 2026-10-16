import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { BranchGeneralSection } from './BranchGeneralSection';

vi.mock('@/contexts/OrgContext', () => ({ useOrgContext: () => ({ orgId: 'org-1' }) }));
vi.mock('@/hooks/useRbac', () => ({ usePermissions: () => ({ can: () => true }) }));
vi.mock('@/hooks/useBranchTypes', () => ({ useBranchTypes: () => ({ data: [
  { id: 'branch', code: 'branch', name: 'Branch', icon: 'store', is_default: true },
  { id: 'warehouse', code: 'warehouse', name: 'Warehouse', icon: 'warehouse' },
] }) }));

function Form() {
  const [type, setType] = useState('branch');
  return <BranchGeneralSection name="" setName={() => {}} code="" setCode={() => {}} type={type} setType={setType} isExpanded onToggle={() => {}} />;
}
beforeEach(() => {
  localStorage.setItem('language', 'en');
  Element.prototype.scrollIntoView = vi.fn();
});
describe('branch type selector', () => {
  it('prepends each type icon and supports keyboard selection with a single selected icon', () => {
    render(<LanguageProvider><Form /></LanguageProvider>);
    const combo = screen.getByRole('combobox', { name: /Branch type/ });
    expect(combo.querySelectorAll('span > svg')).toHaveLength(1);
    fireEvent.keyDown(combo, { key: 'ArrowDown' });
    const option = screen.getByRole('option', { name: 'Warehouse' });
    expect(option.firstElementChild?.tagName.toLowerCase()).toBe('svg');
    fireEvent.keyDown(combo, { key: 'ArrowDown' });
    fireEvent.keyDown(combo, { key: 'Enter' });
    expect(combo.textContent).toBe('Warehouse');
    expect(combo.querySelectorAll('span > svg')).toHaveLength(1);
  });
});
