import { describe, it, expect } from 'vitest';
import { isNewOAuthAccount, resolveOAuthAction } from '../authHelpers';

describe('isNewOAuthAccount', () => {
  it('returns true when created_at and last_sign_in_at are close (2s apart)', () => {
    const user = {
      created_at: '2024-01-01T00:00:00.000Z',
      last_sign_in_at: '2024-01-01T00:00:02.000Z',
    };
    expect(isNewOAuthAccount(user)).toBe(true);
  });

  it('returns false when account is months old and last_sign_in_at is fresh', () => {
    const user = {
      created_at: '2023-01-01T00:00:00.000Z',
      last_sign_in_at: '2024-06-01T00:00:00.000Z',
    };
    expect(isNewOAuthAccount(user)).toBe(false);
  });

  it('returns null when created_at is missing', () => {
    const user = { last_sign_in_at: '2024-01-01T00:00:00.000Z' };
    expect(isNewOAuthAccount(user)).toBeNull();
  });

  it('returns null when last_sign_in_at is missing', () => {
    const user = { created_at: '2024-01-01T00:00:00.000Z' };
    expect(isNewOAuthAccount(user)).toBeNull();
  });

  it('returns null when created_at is invalid/unparseable', () => {
    const user = {
      created_at: 'not-a-date',
      last_sign_in_at: '2024-01-01T00:00:00.000Z',
    };
    expect(isNewOAuthAccount(user)).toBeNull();
  });

  it('returns null when last_sign_in_at is invalid/unparseable', () => {
    const user = {
      created_at: '2024-01-01T00:00:00.000Z',
      last_sign_in_at: 'not-a-date',
    };
    expect(isNewOAuthAccount(user)).toBeNull();
  });

  it('returns null when user is null', () => {
    expect(isNewOAuthAccount(null)).toBeNull();
  });

  it('returns null when user is undefined', () => {
    expect(isNewOAuthAccount(undefined)).toBeNull();
  });

  it('is true exactly at the threshold boundary (default 30000ms)', () => {
    const user = {
      created_at: '2024-01-01T00:00:00.000Z',
      last_sign_in_at: '2024-01-01T00:00:30.000Z',
    };
    expect(isNewOAuthAccount(user)).toBe(true);
  });

  it('is false just past the threshold boundary (default 30000ms)', () => {
    const user = {
      created_at: '2024-01-01T00:00:00.000Z',
      last_sign_in_at: '2024-01-01T00:00:30.001Z',
    };
    expect(isNewOAuthAccount(user)).toBe(false);
  });

  it('respects a custom threshold', () => {
    const user = {
      created_at: '2024-01-01T00:00:00.000Z',
      last_sign_in_at: '2024-01-01T00:00:05.000Z',
    };
    expect(isNewOAuthAccount(user, 10000)).toBe(true);
    expect(isNewOAuthAccount(user, 1000)).toBe(false);
  });

  it('handles last_sign_in_at before created_at (abs diff)', () => {
    const user = {
      created_at: '2024-01-01T00:00:10.000Z',
      last_sign_in_at: '2024-01-01T00:00:00.000Z',
    };
    expect(isNewOAuthAccount(user)).toBe(true);
  });
});

describe('resolveOAuthAction', () => {
  const newUser = {
    created_at: '2024-01-01T00:00:00.000Z',
    last_sign_in_at: '2024-01-01T00:00:02.000Z',
  };
  const existingUser = {
    created_at: '2023-01-01T00:00:00.000Z',
    last_sign_in_at: '2024-06-01T00:00:00.000Z',
  };
  const unknownUser = { created_at: 'bad', last_sign_in_at: 'bad' };

  const table = [
    // origin, user, hasProfile, expected
    ['register', newUser, true, 'allow'],
    ['register', newUser, false, 'allow'],
    ['register', existingUser, true, 'block_existing'],
    ['register', existingUser, false, 'block_existing'],
    ['register', unknownUser, true, 'allow'],
    ['register', unknownUser, false, 'allow'],
    ['register', null, true, 'allow'],
    ['register', null, false, 'allow'],

    ['login', newUser, true, 'allow'],
    ['login', newUser, false, 'allow_to_profile'],
    ['login', existingUser, true, 'allow'],
    ['login', existingUser, false, 'allow_to_profile'],
    ['login', unknownUser, true, 'allow'],
    ['login', unknownUser, false, 'allow_to_profile'],
    ['login', null, true, 'allow'],
    ['login', null, false, 'allow_to_profile'],
  ];

  it.each(table)(
    'origin=%s hasProfile=%s -> %s',
    (origin, user, hasProfile, expected) => {
      expect(resolveOAuthAction({ origin, user, hasProfile })).toBe(expected);
    }
  );

  it('falls through to allow for an unrecognized origin', () => {
    expect(
      resolveOAuthAction({ origin: 'something-else', user: newUser, hasProfile: false })
    ).toBe('allow');
  });
});
