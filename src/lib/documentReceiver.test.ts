import { describe, expect, it } from 'vitest';
import { buildDocumentReceiver } from './documentReceiver';

describe('document receiver snapshot', () => {
  const client = { client_id: 'client', business_name: 'Legal name', client_name: 'Trade name', nationality: '188', customer_type: 2,
    identification: { code: '02', number: '3-101-007223' }, email: 'client@example.test', phone: { country_code: '506', number: '88888888' },
    residence: { state_id: 2, county_id: 1, district_id: 2, address: 'CEDI Coyol' } };
  it('carries all client metadata when the receiver form was never opened', () => {
    expect(buildDocumentReceiver({}, client)).toMatchObject({ name: 'Legal name', trade_name: 'Trade name', nationality: '188', customer_type_code: '02',
      identification: { code: '02', number: '3101007223' }, phone: { country_code: '506', number: '88888888' }, residence: { address: 'CEDI Coyol' } });
  });
  it('retains metadata when the cashier changes a field', () => {
    expect(buildDocumentReceiver({ email: 'changed@example.test' }, client)).toMatchObject({ email: 'changed@example.test', nationality: '188', trade_name: 'Trade name' });
  });
  it('preserves foreign alphanumeric identification and keeps only the address', () => {
    const result = buildDocumentReceiver({ identification: { code: '05', number: ' AB-123 ' }, residence: { state_id: 2, county_id: 1, district_id: 2, neighborhood_name: 'Old', address: 'Foreign address' } });
    expect(result?.identification).toEqual({ code: '05', number: 'AB-123' });
    expect(result?.residence).toEqual({ address: 'Foreign address' });
    expect(result).not.toHaveProperty('foreign_id_number');
  });
});
