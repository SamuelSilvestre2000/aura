import { useState, useEffect, useCallback } from 'react';
import { CityGeoData } from '../types';
import {
  loadCachedCitiesGeoData,
  isGeoCacheExpired,
  fetchAndCacheCitiesGeoData,
} from '../services/ibge';

type UseGeoJSONReturn = {
  cities: CityGeoData[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  cityByCode: Map<string, CityGeoData>;
  cityByName: Map<string, CityGeoData>;
};

export function useGeoJSON(): UseGeoJSONReturn {
  const [cities, setCities] = useState<CityGeoData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshInBackground = useCallback(async () => {
    setRefreshing(true);
    try {
      const fresh = await fetchAndCacheCitiesGeoData();
      setCities(fresh);
      setError(null);
    } catch (err) {
      console.warn('[useGeoJSON] Falha ao atualizar em background:', err);
    } finally {
      setRefreshing(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    setLoading(cities.length === 0);
    setError(null);
    try {
      const fresh = await fetchAndCacheCitiesGeoData();
      setCities(fresh);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao carregar mapa';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [cities.length]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const cached = await loadCachedCitiesGeoData();

      if (cancelled) return;

      if (cached && cached.length > 0) {
        setCities(cached);
        setLoading(false);

        const expired = await isGeoCacheExpired();
        if (!cancelled && expired) {
          refreshInBackground();
        }
        return;
      }

      try {
        const data = await fetchAndCacheCitiesGeoData();
        if (!cancelled) {
          setCities(data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : 'Erro ao carregar mapa';
          setError(msg);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [refreshInBackground]);

  const cityByCode = new Map(cities.map((c) => [c.code, c]));
  const cityByName = new Map(cities.map((c) => [c.name, c]));

  return { cities, loading, refreshing, error, refresh, cityByCode, cityByName };
}
