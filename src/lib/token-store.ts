// Where the auth token lives: "remember me" keeps it in localStorage (survives closing the
// browser); otherwise sessionStorage (gone with the tab/session). Only one place holds it at a time.
export type KeyValueStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const safely = <T>(fn: () => T, fallback: T): T => {
  try {
    return fn();
  } catch {
    return fallback;
  }
};

export const createTokenStore = (local: KeyValueStorage, session: KeyValueStorage, key: string) => ({
  get: (): string | null =>
    safely(() => session.getItem(key), null) ?? safely(() => local.getItem(key), null),
  set: (token: string, remember: boolean) => {
    const [keep, drop] = remember ? [local, session] : [session, local];
    safely(() => drop.removeItem(key), undefined);
    safely(() => keep.setItem(key, token), undefined);
  },
  clear: () => {
    safely(() => local.removeItem(key), undefined);
    safely(() => session.removeItem(key), undefined);
  },
});
