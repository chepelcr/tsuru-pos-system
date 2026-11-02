import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { HaciendaCredentialsStepper } from './HaciendaCredentialsStepper';
const state = vi.hoisted(() => ({ save: vi.fn(), verify: vi.fn() }));
vi.mock('@/hooks/useOrgConfigurations', () => ({
  useSaveOrgConfigurations: () => ({ mutateAsync: state.save, isPending: false }),
  useValidateCredentials: () => ({ mutateAsync: state.verify, isPending: false }),
}));
beforeEach(() => { localStorage.setItem('language', 'en'); state.save.mockResolvedValue({}); state.verify.mockResolvedValue({ is_valid: true }); });

it('updates only the PIN using the stored certificate and never asks for valid credentials again', async () => {
  const done = vi.fn();
  render(<LanguageProvider><HaciendaCredentialsStepper orgId="org-one" pending="certificate" existing={{ username: 'stored-user', has_password: true,
    status: 1, notification_settings: null, certificate: { name: 'saved.p12', alias: 'Saved', expiration_date: '2030-01-01', content_type: '', extension: '' } }} onSaved={done} /></LanguageProvider>);
  expect(screen.queryByLabelText('Username')).toBeNull();
  const pin = document.querySelector('#hac-pin')!;
  fireEvent.change(pin, { target: { value: 'new-pin' } });
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  fireEvent.click(screen.getByRole('button', { name: 'Save' }));
  await waitFor(() => expect(done).toHaveBeenCalledOnce());
  expect(state.save).toHaveBeenCalledWith({ username: 'stored-user', status: 1, certificate_pin: 'new-pin' });
  expect(state.verify).not.toHaveBeenCalled();
});
