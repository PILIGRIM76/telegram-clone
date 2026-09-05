import { useState, useEffect } from 'react';

export type TimeOfDay = 'morning' | 'day' | 'evening' | 'night';

export interface AccentTheme {
  color: string;
  glow: string;
  gradient: string;
  label: string;
}

const ACCENT_THEMES: Record<TimeOfDay, AccentTheme> = {
  morning: {
    color: '#FF8A50',
    glow: 'rgba(255, 138, 80, 0.4)',
    gradient: 'linear-gradient(135deg, #FF8A50 0%, #FF6B35 100%)',
    label: 'Morning',
  },
  day: {
    color: '#E86A58',
    glow: 'rgba(232, 106, 88, 0.4)',
    gradient: 'linear-gradient(135deg, #E86A58 0%, #D4543F 100%)',
    label: 'Day',
  },
  evening: {
    color: '#7B4B9A',
    glow: 'rgba(123, 75, 154, 0.4)',
    gradient: 'linear-gradient(135deg, #7B4B9A 0%, #6A3D8A 100%)',
    label: 'Evening',
  },
  night: {
    color: '#B388EB',
    glow: 'rgba(179, 136, 235, 0.4)',
    gradient: 'linear-gradient(135deg, #B388EB 0%, #9D6FD4 100%)',
    label: 'Night',
  },
};

function getTimeOfDay(): TimeOfDay {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'day';
  if (hour >= 18 && hour < 23) return 'evening';
  return 'night';
}

export function useAccentColor(): AccentTheme {
  const [theme, setTheme] = useState<AccentTheme>(ACCENT_THEMES[getTimeOfDay()]);

  useEffect(() => {
    const updateTheme = () => {
      setTheme(ACCENT_THEMES[getTimeOfDay()]);
    };

    // Update every minute
    const interval = setInterval(updateTheme, 60000);

    // Initial set
    updateTheme();

    return () => clearInterval(interval);
  }, []);

  return theme;
}

// v3.0 Phase 4: Re-export E2EEStatus type for convenient imports
export type { E2EEStatus } from '../types';


