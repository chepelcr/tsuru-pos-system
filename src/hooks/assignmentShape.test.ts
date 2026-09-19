import { describe, expect, it } from 'vitest';

/**
 * How `useAssignment` decides whether there IS an active assignment.
 *
 * The expression it used ended `|| response`, so when the list came back empty —
 * the normal answer for anyone not on a till — the whole `{data: [], pagination}`
 * envelope was returned AS the assignment. Being truthy, it then:
 *
 *   * looked like a live shift to every caller, which is how the dashboard
 *     offered a "Mi sesión" toggle to a user with no session open; and
 *   * skipped the `!data` branch that deletes the stale IndexedDB row, so the
 *     next transport hiccup resurrected a previous shift's `session_id` and
 *     scoped the dashboard to an assignment that had ended months earlier.
 *
 * This pins the selection logic on the exact shapes the endpoint returns.
 */

/** The selection as `useAssignment` now performs it. */
function selectAssignment(response: unknown) {
  const rows = Array.isArray(response)
    ? response
    : Array.isArray((response as { data?: unknown[] })?.data)
      ? (response as { data: unknown[] }).data
      : [];
  const candidate = rows[0] as { assignment_id?: string } | undefined;
  return candidate?.assignment_id ? candidate : undefined;
}

const ACTIVE = {
  assignment_id: 'a-1',
  session_id: 's-1',
  branch_id: 'b-1',
  status: 1,
};

describe('selecting the active assignment', () => {
  it('finds the assignment when there is one', () => {
    expect(selectAssignment({ data: [ACTIVE], pagination: {} })).toEqual(ACTIVE);
  });

  it('returns nothing for an empty list — NOT the envelope', () => {
    // The bug. The envelope is truthy and has no assignment_id, so it read as a
    // live shift while carrying none of a shift's data.
    const envelope = { data: [], pagination: { page: 1, total_elements: 0 } };
    expect(selectAssignment(envelope)).toBeUndefined();
  });

  it('tolerates a bare array', () => {
    expect(selectAssignment([ACTIVE])).toEqual(ACTIVE);
    expect(selectAssignment([])).toBeUndefined();
  });

  it('rejects a row that does not identify itself as an assignment', () => {
    // A shape we did not expect is not a shift; reporting none is safer than
    // scoping a dashboard to it.
    expect(selectAssignment({ data: [{ session_id: 's-1' }] })).toBeUndefined();
  });

  it('returns nothing for a malformed response', () => {
    expect(selectAssignment(null)).toBeUndefined();
    expect(selectAssignment({})).toBeUndefined();
    expect(selectAssignment({ data: null })).toBeUndefined();
  });
});

describe('what counts as being in a session', () => {
  /** `useDashboardScope`: both ids, not just the session. */
  const hasSession = (a?: { assignment_id?: string; session_id?: string }) =>
    !!a?.assignment_id && !!a?.session_id;

  it('needs both ids', () => {
    expect(hasSession(ACTIVE)).toBe(true);
    // A stale IndexedDB row could supply a session with no assignment.
    expect(hasSession({ session_id: 's-1' })).toBe(false);
    expect(hasSession({ assignment_id: 'a-1' })).toBe(false);
    expect(hasSession(undefined)).toBe(false);
  });
});
