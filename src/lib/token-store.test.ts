import { describe, expect, it } from 'vitest';
import { createTokenStore, type KeyValueStorage } from './token-store';

const fakeStorage = (): KeyValueStorage & { data: Map<string, string> } => {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => { data.set(key, value); },
    removeItem: (key) => { data.delete(key); },
  };
};

const throwingStorage = (): KeyValueStorage => ({
  getItem: () => { throw new Error('blocked'); },
  setItem: () => { throw new Error('blocked'); },
  removeItem: () => { throw new Error('blocked'); },
});

describe('createTokenStore', () => {
  it('keeps an unremembered token only for the browser session, dropping a stale remembered one', () => {
    const local = fakeStorage();
    const session = fakeStorage();
    local.data.set('k', 'old');
    const store = createTokenStore(local, session, 'k');
    store.set('t1', false);
    expect(session.data.get('k')).toBe('t1');
    expect(local.data.has('k')).toBe(false);
  });

  it('keeps a remembered token across sessions, dropping a stale session one', () => {
    const local = fakeStorage();
    const session = fakeStorage();
    session.data.set('k', 'old');
    const store = createTokenStore(local, session, 'k');
    store.set('t2', true);
    expect(local.data.get('k')).toBe('t2');
    expect(session.data.has('k')).toBe(false);
  });

  it('reads the session token first, then the remembered one, else null', () => {
    const local = fakeStorage();
    const session = fakeStorage();
    const store = createTokenStore(local, session, 'k');
    expect(store.get()).toBeNull();
    local.data.set('k', 'remembered');
    expect(store.get()).toBe('remembered');
    session.data.set('k', 'session');
    expect(store.get()).toBe('session');
  });

  it('clear removes the token from both places', () => {
    const local = fakeStorage();
    const session = fakeStorage();
    local.data.set('k', 'a');
    session.data.set('k', 'b');
    createTokenStore(local, session, 'k').clear();
    expect(local.data.size + session.data.size).toBe(0);
  });

  it('survives storage that throws (private mode / blocked site data)', () => {
    const store = createTokenStore(throwingStorage(), throwingStorage(), 'k');
    expect(store.get()).toBeNull();
    expect(() => store.set('t', true)).not.toThrow();
    expect(() => store.set('t', false)).not.toThrow();
    expect(() => store.clear()).not.toThrow();
  });
});
