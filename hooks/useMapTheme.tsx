import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { getMapTheme, setMapTheme, MapTheme } from '../services/preferences';

type MapThemeContextValue = {
  theme: MapTheme;
  setTheme: (theme: MapTheme) => Promise<void>;
  loading: boolean;
};

const MapThemeContext = createContext<MapThemeContextValue | null>(null);

export function MapThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<MapTheme>('light');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMapTheme()
      .then(setThemeState)
      .finally(() => setLoading(false));
  }, []);

  const setTheme = useCallback(async (next: MapTheme) => {
    setThemeState(next);
    await setMapTheme(next);
  }, []);

  return (
    <MapThemeContext.Provider value={{ theme, setTheme, loading }}>
      {children}
    </MapThemeContext.Provider>
  );
}

export function useMapTheme(): MapThemeContextValue {
  const ctx = useContext(MapThemeContext);
  if (!ctx) {
    throw new Error('useMapTheme deve ser usado dentro de MapThemeProvider');
  }
  return ctx;
}
