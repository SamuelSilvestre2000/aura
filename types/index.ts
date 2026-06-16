// ─── Usuários ─────────────────────────────────────────────────────────────────

export type UserRole = 'admin' | 'representative';

export type CategorySlug = 'adulto' | 'infantil';

export type Category = {
  id: string;
  name: string;
  slug: CategorySlug;
};

export type User = {
  id: string;
  name: string;
  role: UserRole;
  pin: string;
  email?: string;
  categories: Category[];
  photoUri?: string;
  createdAt: string;
};

// ─── Entidades principais ─────────────────────────────────────────────────────

export type Collection = {
  id: string;
  name: string;
  createdAt: string;
  isActive: number; // 1 = ativo, 0 = inativo (SQLite não tem boolean)
};

export type Client = {
  id: string;
  name: string;
  city: string;        // nome do município
  cityCode: string;    // código IBGE do município
  state: string;       // "PI"
  lat: number;
  lng: number;
  phone?: string;
  notes?: string;
  createdAt: string;
};

export type Purchase = {
  id: string;
  clientId: string;
  collectionId: string;
  purchased: number;  // 1 = comprou, 0 = pendente
  purchasedAt?: string;
};

// ─── Status calculado por cidade ──────────────────────────────────────────────
export type CityStatus = 'all' | 'partial' | 'none' | 'no-clients';

// ─── Dados geográficos ─────────────────────────────────────────────────────────
export type CityGeoData = {
  code: string;         // código IBGE (codarea)
  name: string;         // nome do município
  centroid: [number, number]; // [lng, lat]
  coordinates: number[][][]; // polígonos GeoJSON
};

export type SelectedCity = {
  code: string;
  name: string;
  status: CityStatus;
  clientCount: number;
};
