// ─── Usuários ─────────────────────────────────────────────────────────────────

export type UserRole = 'admin' | 'representative';

export type CategorySlug = string;

export type Category = {
  id: string;
  name: string;
  slug: CategorySlug;
  organizationId?: string;
  dimensionId?: string;
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

// ─── Organização / escopo ─────────────────────────────────────────────────────

export type AccessMode =
  | 'all_in_org'
  | 'by_category'
  | 'by_territory'
  | 'by_assignment';

export type Organization = {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
};

export type Brand = {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  createdAt: string;
};

export type CategoryDimension = {
  id: string;
  organizationId: string;
  name: string;
  sortOrder: number;
  createdAt: string;
};

export type RepresentativeScope = {
  id: string;
  userId: string;
  organizationId: string;
  brandId?: string | null;
  accessMode: AccessMode;
  createdAt: string;
  categoryIds?: string[];
  cityCodes?: string[];
};

export type AssignmentType = 'primary' | 'shared' | 'backup';

export type ClientAssignment = {
  id: string;
  clientId: string;
  userId: string;
  assignmentType: AssignmentType;
  validFrom?: string;
  validTo?: string;
  createdAt: string;
};

// ─── Entidades principais ─────────────────────────────────────────────────────

export type Collection = {
  id: string;
  name: string;
  createdAt: string;
  isActive: number;
  organizationId?: string;
  brandId?: string | null;
  startDate?: string;
  endDate?: string;
  /** Meta em R$ do usuário logado (quando carregada). */
  myGoalAmount?: number | null;
};

export type CollectionGoal = {
  id: string;
  collectionId: string;
  userId: string;
  goalAmount: number;
  createdAt: string;
  updatedAt: string;
};

export type Client = {
  id: string;
  externalCode?: string;
  name: string;
  tradeName?: string;
  legalName?: string;
  street?: string;
  neighborhood?: string;
  city: string;
  cityCode: string;
  state: string;
  zipCode?: string;
  lat: number | null;
  lng: number | null;
  phone?: string;
  mobile?: string;
  email?: string;
  notes?: string;
  clientGroup?: string;
  createdAt: string;
  organizationId?: string;
  brandId?: string | null;
  categoryIds?: string[];
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
