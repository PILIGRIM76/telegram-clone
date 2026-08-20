import { useState, useEffect } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T | null): [T | null, (value: T | null) => void] {
    const [storedValue, setStoredValue] = useState<T | null>(() => {
        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            console.error(`Error reading localStorage key "${key}":`, error);
            return initialValue;
        }
    });

    const setValue = (value: T | null) => {
        try {
            setStoredValue(value);
            if (value === null) {
                window.localStorage.removeItem(key);
            } else {
                window.localStorage.setItem(key, JSON.stringify(value));
            }
        } catch (error) {
            console.error(`Error setting localStorage key "${key}":`, error);
        }
    };

    return [storedValue, setValue];
}