import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

afterEach(() => cleanup());

const store = new Map<string, string>();
const localStorageMock: Storage = {
  getItem: vi.fn((key: string) => store.get(key) ?? null),
  setItem: vi.fn((key: string, val: string) => { store.set(key, String(val)); }),
  removeItem: vi.fn((key: string) => { store.delete(key); }),
  clear: vi.fn(() => { store.clear(); }),
  key: vi.fn((idx: number) => Array.from(store.keys())[idx] ?? null),
  get length() { return store.size; }
};
Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
});
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true,
  });
}
