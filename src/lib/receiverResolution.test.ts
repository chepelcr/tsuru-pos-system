import { describe, expect, it } from 'vitest';
import {
  hasReceiver,
  resolveReceiverAddress,
  resolveReceiverId,
  resolveReceiverName,
} from './receiverResolution';
import type { ClientSearchResult } from '@/hooks/useClientSearch';
import type { SaleReceiver } from '@/types/receiver';

/**
 * The real shape that surfaced the bug: this client carries BOTH names, and
 * they are different companies to the eye — the trade name people say out loud
 * and the legal name on the cédula.
 */
const walmart: ClientSearchResult = {
  client_id: 'c1',
  client_name: 'WAL-MART CENTROAMERICA',
  business_name: 'CORPORACION DE SUPERMERCADOS UNIDOS SOCIEDAD ANONIMA',
  identification: { code: '02', number: '3-101-007223' },
  residence: { state_id: 1, county_id: 3, district_id: 5, address: 'Zona franca, La Lima' },
};

describe('resolveReceiverName', () => {
  it('prefers the trade name a person would say', () => {
    expect(resolveReceiverName({}, walmart)).toBe('WAL-MART CENTROAMERICA');
  });

  it('is stable no matter which surface asks', () => {
    // The bug: three call sites disagreed on precedence, so the same client
    // rendered as Walmart in one place and Supermercados Unidos in another,
    // and re-selecting appeared to rename it.
    const surfaces = [
      resolveReceiverName({}, walmart),
      resolveReceiverName(undefined, walmart),
      resolveReceiverName(null, walmart),
    ];
    expect(new Set(surfaces).size).toBe(1);
  });

  it('lets an explicit per-sale receiver override the client', () => {
    expect(resolveReceiverName({ name: 'Otro' }, walmart)).toBe('Otro');
  });

  it('falls back to the legal name when there is no trade name', () => {
    expect(resolveReceiverName({}, { ...walmart, client_name: null }))
      .toBe('CORPORACION DE SUPERMERCADOS UNIDOS SOCIEDAD ANONIMA');
  });

  it('ignores whitespace-only values', () => {
    expect(resolveReceiverName({ name: '   ' }, walmart)).toBe('WAL-MART CENTROAMERICA');
  });

  it('returns empty with neither receiver nor client', () => {
    expect(resolveReceiverName({}, null)).toBe('');
  });
});

describe('resolveReceiverAddress', () => {
  it('falls back to the selected client', () => {
    // Selecting a client CLEARS data.receiver by design, so the address lives
    // on the client. Reading only the receiver is what made the UI claim
    // "el receptor todavía no tiene dirección" for a client that has one.
    const address = resolveReceiverAddress({}, walmart);
    expect(address).not.toBeNull();
    expect(address!.address).toBe('Zona franca, La Lima');
    expect(address!.state_id).toBe(1);
  });

  it('prefers an address typed for this sale', () => {
    const receiver: SaleReceiver = { residence: { address: 'Otra dirección', state_id: 7 } };
    expect(resolveReceiverAddress(receiver, walmart)!.address).toBe('Otra dirección');
  });

  it('skips an empty receiver residence rather than treating it as an address', () => {
    const receiver: SaleReceiver = { residence: {} };
    expect(resolveReceiverAddress(receiver, walmart)!.address).toBe('Zona franca, La Lima');
  });

  it('returns null when nobody has an address', () => {
    expect(resolveReceiverAddress({}, { ...walmart, residence: null })).toBeNull();
    expect(resolveReceiverAddress({}, null)).toBeNull();
  });

  it('counts a cascade with no free text as an address', () => {
    const client = { ...walmart, residence: { state_id: 1, address: null } };
    expect(resolveReceiverAddress({}, client)).not.toBeNull();
  });
});

describe('hasReceiver / resolveReceiverId', () => {
  it('recognises a client-only receiver', () => {
    expect(hasReceiver({}, walmart)).toBe(true);
    expect(hasReceiver({}, null)).toBe(false);
  });

  it('reads the id from the client when the receiver has none', () => {
    expect(resolveReceiverId({}, walmart)).toBe('3-101-007223');
  });
});
