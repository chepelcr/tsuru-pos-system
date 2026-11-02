import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { PartnerFiscalProfile } from './PartnerFiscalProfile';

const { useProfile } = vi.hoisted(() => ({ useProfile: vi.fn() }));
vi.mock('@/hooks/useRegisteredOrganization', () => ({ useRegisteredOrganization: useProfile }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (key: string) => key }) }));
vi.mock('./FiscalInfoStepper', () => ({ FiscalInfoStepper: ({ orgId, onSaved }: { orgId: string; onSaved: () => void }) =>
  <button onClick={onSaved}>Create profile: {orgId}</button> }));
vi.mock('./FiscalInfoSummaryCard', () => ({ FiscalInfoSummaryCard: ({ onEdit }: { onEdit: () => void }) =>
  <button onClick={onEdit}>Edit existing profile</button> }));
vi.mock('./FiscalInfoEditDrawer', () => ({ FiscalInfoEditDrawer: ({ open, orgId, onClose }: { open: boolean; orgId: string; onClose: () => void }) =>
  open ? <button onClick={onClose}>Save profile: {orgId}</button> : null }));

beforeEach(() => { useProfile.mockReset(); });

it('creates only the explicit partner organization profile and rechecks after save', () => {
  useProfile.mockReturnValue({ data: null, isLoading: false, isError: false });
  const onSaved = vi.fn();
  render(<PartnerFiscalProfile orgId="partner-org" onSaved={onSaved} />);
  expect(useProfile).toHaveBeenCalledWith('partner-org');
  fireEvent.click(screen.getByRole('button', { name: 'Create profile: partner-org' }));
  expect(onSaved).toHaveBeenCalledOnce();
});

it('preserves an existing profile and edits the explicit organization', () => {
  useProfile.mockReturnValue({ data: { id: 'existing-profile' }, isLoading: false, isError: false });
  const onSaved = vi.fn();
  render(<PartnerFiscalProfile orgId="partner-org" onSaved={onSaved} />);
  expect(screen.queryByText(/Create profile/)).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Edit existing profile' }));
  fireEvent.click(screen.getByRole('button', { name: 'Save profile: partner-org' }));
  expect(onSaved).toHaveBeenCalledOnce();
});

it('keeps setup closed when the existing fiscal profile cannot be read', () => {
  const refetch = vi.fn();
  useProfile.mockReturnValue({ isLoading: false, isError: true, refetch });
  render(<PartnerFiscalProfile orgId="partner-org" onSaved={vi.fn()} />);
  expect(screen.getByRole('alert')).toBeTruthy();
  expect(screen.queryByText(/Create profile/)).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'partner.retry' }));
  expect(refetch).toHaveBeenCalledOnce();
});
