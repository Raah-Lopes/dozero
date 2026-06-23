import { useEffect, useRef } from 'react';

/**
 * Executes a callback after a specified delay, cancelling any previous pending executions.
 * Useful for throttling heavy operations like writing to localStorage or making API calls.
 */
export function useDebounceCallback<T extends (...args: any[]) => void>(
  callback: T,
  delay: number
) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep a fresh reference to the callback so we don't need to add it to dependencies
  const callbackRef = useRef(callback);
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return (...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      callbackRef.current(...args);
    }, delay);
  };
}
