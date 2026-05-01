import { describe, expect, it, vi } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';
import { deleteSessionCookie, getSessionToken, setSessionCookie } from './cookies';

const COOKIE_NAME = 'tierdom_session';

function makeEvent(): {
  event: RequestEvent;
  set: ReturnType<typeof vi.fn>;
  get: ReturnType<typeof vi.fn>;
} {
  const set = vi.fn();
  const get = vi.fn();
  const event = { cookies: { set, get } } as unknown as RequestEvent;
  return { event, set, get };
}

describe('setSessionCookie', () => {
  it('sets the session cookie with sameSite=lax, path=/, and the given expiry', () => {
    const { event, set } = makeEvent();
    const expiresAt = Date.now() + 60_000;

    setSessionCookie(event, 'tok', expiresAt);

    expect(set).toHaveBeenCalledWith(COOKIE_NAME, 'tok', {
      sameSite: 'lax',
      path: '/',
      expires: new Date(expiresAt),
    });
  });
});

describe('deleteSessionCookie', () => {
  it('writes an empty value with maxAge=0 to clear the cookie', () => {
    const { event, set } = makeEvent();

    deleteSessionCookie(event);

    expect(set).toHaveBeenCalledWith(COOKIE_NAME, '', {
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });
  });
});

describe('getSessionToken', () => {
  it('returns the value stored under the session cookie name', () => {
    const { event, get } = makeEvent();
    get.mockReturnValue('the-token');

    const result = getSessionToken(event);

    expect(get).toHaveBeenCalledWith(COOKIE_NAME);
    expect(result).toBe('the-token');
  });

  it('returns undefined when the cookie is not set', () => {
    const { event, get } = makeEvent();
    get.mockReturnValue(undefined);

    expect(getSessionToken(event)).toBeUndefined();
  });
});
