import { describe, expect, it } from 'vitest';
import {
  DEFAULT_STATE,
  applyView,
  buildUsersQuery,
  hasActiveFilters,
  parseUsersListState,
  serializeUsersListState,
} from './usersListState';

describe('SLIG recurrent card filter', () => {
  it('survives URL roundtrip and combines with upstream subscription filters', () => {
    const state = { ...DEFAULT_STATE, recurrent: 'true' as const, sub: 'expiring' as const };
    const restored = parseUsersListState(serializeUsersListState(state));
    expect(buildUsersQuery(restored)).toMatchObject({ is_recurrent: true, expires_within_days: 7 });
    expect(hasActiveFilters(restored)).toBe(true);
  });
  it('keeps false distinct from no filter and resets with All', () => {
    const state = parseUsersListState(new URLSearchParams('recurrent=false'));
    expect(buildUsersQuery(state).is_recurrent).toBe(false);
    expect(buildUsersQuery(applyView(state, 'all')).is_recurrent).toBeUndefined();
  });
});
