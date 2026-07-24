import { useState, useEffect } from 'react';

// Estado que se persiste en localStorage bajo `key`. Fuente única compartida.
export function usePersistentState<T>(
  key: string,
  initialValue: T,
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [state, setState] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch (error) {
      console.warn('Error saving state to localStorage', error);
    }
  }, [key, state]);

  return [state, setState];
}
