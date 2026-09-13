import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Node >= 22 defines a global localStorage getter that evaluates to undefined
// unless the process runs with --localstorage-file, and it shadows the jsdom
// implementation inside Vitest workers. Install a plain in-memory Storage so
// session/cart-token code sees a working store.
class MemoryStorage implements Storage {
  private store = new Map<string, string>();

  get length() {
    return this.store.size;
  }
  clear() {
    this.store.clear();
  }
  getItem(key: string) {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  key(index: number) {
    return [...this.store.keys()][index] ?? null;
  }
  removeItem(key: string) {
    this.store.delete(key);
  }
  setItem(key: string, value: string) {
    this.store.set(key, String(value));
  }
}

for (const name of ["localStorage", "sessionStorage"] as const) {
  Object.defineProperty(globalThis, name, {
    value: new MemoryStorage(),
    configurable: true,
    writable: true
  });
}

// Model the cross-tab writer lock used by modern browsers on HTTPS/localhost.
let lockTail: Promise<unknown> = Promise.resolve();
Object.defineProperty(navigator, "locks", {
  configurable: true,
  value: {
    request: (_name: string, operation: () => unknown) => {
      const next = lockTail.then(operation);
      lockTail = next.catch(() => undefined);
      return next;
    }
  }
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  window.sessionStorage.clear();
});
