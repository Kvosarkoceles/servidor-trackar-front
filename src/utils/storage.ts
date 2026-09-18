/** Acceso a `localStorage`/`sessionStorage` tolerante a errores y entornos sin storage. */

function safeGet(storage: Storage | undefined, key: string): string | null {
  try {
    return storage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function safeSet(storage: Storage | undefined, key: string, value: string): void {
  try {
    storage?.setItem(key, value);
  } catch {
    /* modo privado / cuota llena: se ignora */
  }
}

function safeRemove(storage: Storage | undefined, key: string): void {
  try {
    storage?.removeItem(key);
  } catch {
    /* ignorado */
  }
}

export const localStore = {
  get: (key: string) => safeGet(typeof window === 'undefined' ? undefined : window.localStorage, key),
  set: (key: string, value: string) =>
    safeSet(typeof window === 'undefined' ? undefined : window.localStorage, key, value),
  remove: (key: string) => safeRemove(typeof window === 'undefined' ? undefined : window.localStorage, key),
};

export const sessionStore = {
  get: (key: string) => safeGet(typeof window === 'undefined' ? undefined : window.sessionStorage, key),
  set: (key: string, value: string) =>
    safeSet(typeof window === 'undefined' ? undefined : window.sessionStorage, key, value),
  remove: (key: string) => safeRemove(typeof window === 'undefined' ? undefined : window.sessionStorage, key),
};
