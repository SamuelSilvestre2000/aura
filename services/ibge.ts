import AsyncStorage from '@react-native-async-storage/async-storage';
import { CityGeoData } from '../types';

const GEOJSON_KEY = '@aura/geojson_v2';
const CITY_NAMES_KEY = '@aura/city_names_v1';
const CACHE_EXPIRY_DAYS = 30;
const CACHE_TIMESTAMP_KEY = '@aura/geojson_timestamp';

const IBGE_GEOJSON_URL =
  'https://servicodados.ibge.gov.br/api/v2/malhas/22?resolucao=5&formato=application/vnd.geo+json&qualidade=2';

const IBGE_NAMES_URL =
  'https://servicodados.ibge.gov.br/api/v1/localidades/estados/22/municipios';

export type IBGEMunicipio = {
  id: number;
  nome: string;
};

/** Retorna cache imediatamente, ignorando expiração (para abertura rápida). */
export async function loadCachedCitiesGeoData(): Promise<CityGeoData[] | null> {
  return getCachedGeoData(true);
}

export async function isGeoCacheExpired(): Promise<boolean> {
  try {
    const timestamp = await AsyncStorage.getItem(CACHE_TIMESTAMP_KEY);
    if (!timestamp) return true;

    const cacheDate = new Date(timestamp);
    const expiryDate = new Date(cacheDate.getTime() + CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
    return new Date() > expiryDate;
  } catch {
    return true;
  }
}

/** Baixa dados frescos do IBGE e atualiza o cache. */
export async function fetchAndCacheCitiesGeoData(): Promise<CityGeoData[]> {
  console.log('[IBGE] Baixando dados da API...');
  const [geoData, cityNames] = await Promise.all([fetchGeoJSON(), fetchCityNames()]);
  const processed = processGeoData(geoData, cityNames);
  await cacheGeoData(processed);
  return processed;
}

export async function loadCitiesGeoData(): Promise<CityGeoData[]> {
  try {
    const cached = await getCachedGeoData();
    if (cached) {
      console.log('[IBGE] Usando dados cacheados');
      return cached;
    }

    return await fetchAndCacheCitiesGeoData();
  } catch (error) {
    console.error('[IBGE] Erro ao carregar dados:', error);
    const stale = await getCachedGeoData(true);
    if (stale) return stale;
    throw error;
  }
}

async function fetchGeoJSON(): Promise<any> {
  const response = await fetch(IBGE_GEOJSON_URL);
  if (!response.ok) throw new Error(`GeoJSON fetch failed: ${response.status}`);
  return response.json();
}

async function fetchCityNames(): Promise<IBGEMunicipio[]> {
  const response = await fetch(IBGE_NAMES_URL);
  if (!response.ok) throw new Error(`Names fetch failed: ${response.status}`);
  return response.json();
}

function processGeoData(geoJson: any, names: IBGEMunicipio[]): CityGeoData[] {
  const nameMap = new Map<string, string>();
  names.forEach((m) => nameMap.set(String(m.id), m.nome));

  const cities: CityGeoData[] = [];

  for (const feature of geoJson.features) {
    const code = feature.properties?.codarea;
    if (!code) continue;

    const name = nameMap.get(code) || `Município ${code}`;
    const centroid = feature.properties?.centroide || [0, 0];

    const cityData: CityGeoData = {
      code,
      name,
      centroid: [centroid[0], centroid[1]],
      coordinates: feature.geometry.coordinates,
    };

    cities.push(cityData);
  }

  return cities.sort((a, b) => a.name.localeCompare(b.name));
}

async function getCachedGeoData(ignoreExpiry = false): Promise<CityGeoData[] | null> {
  try {
    const [cached, timestamp] = await Promise.all([
      AsyncStorage.getItem(GEOJSON_KEY),
      AsyncStorage.getItem(CACHE_TIMESTAMP_KEY),
    ]);

    if (!cached) return null;

    if (!ignoreExpiry && timestamp) {
      const cacheDate = new Date(timestamp);
      const expiryDate = new Date(cacheDate.getTime() + CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
      if (new Date() > expiryDate) {
        console.log('[IBGE] Cache expirado, baixando novamente...');
        return null;
      }
    }

    return JSON.parse(cached) as CityGeoData[];
  } catch {
    return null;
  }
}

async function cacheGeoData(data: CityGeoData[]): Promise<void> {
  try {
    await Promise.all([
      AsyncStorage.setItem(GEOJSON_KEY, JSON.stringify(data)),
      AsyncStorage.setItem(CACHE_TIMESTAMP_KEY, new Date().toISOString()),
    ]);
    console.log(`[IBGE] Cache salvo: ${data.length} municípios`);
  } catch (error) {
    console.warn('[IBGE] Falha ao salvar cache:', error);
  }
}

export async function clearGeoCache(): Promise<void> {
  await Promise.all([
    AsyncStorage.removeItem(GEOJSON_KEY),
    AsyncStorage.removeItem(CITY_NAMES_KEY),
    AsyncStorage.removeItem(CACHE_TIMESTAMP_KEY),
  ]);
  console.log('[IBGE] Cache limpo');
}
