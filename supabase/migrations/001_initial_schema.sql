-- Aura / rep-piaui — schema inicial para Supabase (Fase 1)
-- Espelha o SQLite local (services/database.ts + scripts/local-db.mjs)
--
-- Como aplicar:
--   Supabase Dashboard → SQL Editor → New query → colar e executar
--
-- Fase 2 ligará auth.users via users.auth_user_id
-- Fase 5 (migração) deve usar a service_role key (ignora RLS)

-- ─── Extensões ───────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─── Tipos ───────────────────────────────────────────────────────────────────

CREATE TYPE public.user_role AS ENUM ('admin', 'representative');
CREATE TYPE public.access_mode AS ENUM (
  'all_in_org',
  'by_category',
  'by_territory',
  'by_assignment'
);
CREATE TYPE public.assignment_type AS ENUM ('primary', 'shared', 'backup');

-- ─── Tabelas base ────────────────────────────────────────────────────────────

CREATE TABLE public.organizations (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.category_dimensions (
  id               TEXT PRIMARY KEY,
  organization_id  TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  sort_order       INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.brands (
  id               TEXT PRIMARY KEY,
  organization_id  TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  slug             TEXT NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, slug)
);

CREATE TABLE public.categories (
  id               TEXT PRIMARY KEY,
  name             TEXT NOT NULL,
  slug             TEXT NOT NULL UNIQUE,
  organization_id  TEXT REFERENCES public.organizations(id) ON DELETE SET NULL,
  dimension_id     TEXT REFERENCES public.category_dimensions(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ponte para Supabase Auth (Fase 2). id TEXT permanece estável no app.
CREATE TABLE public.users (
  id            TEXT PRIMARY KEY,
  auth_user_id  UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  name          TEXT NOT NULL UNIQUE,
  role          public.user_role NOT NULL,
  pin           TEXT NOT NULL,
  email         TEXT,
  category      TEXT,
  photo_uri     TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.user_organizations (
  user_id          TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  organization_id  TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role             public.user_role NOT NULL,
  PRIMARY KEY (user_id, organization_id)
);

CREATE TABLE public.user_categories (
  user_id      TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  category_id  TEXT NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, category_id)
);

CREATE TABLE public.collections (
  id               TEXT PRIMARY KEY,
  name             TEXT NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active        SMALLINT NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  organization_id  TEXT REFERENCES public.organizations(id) ON DELETE SET NULL,
  brand_id         TEXT REFERENCES public.brands(id) ON DELETE SET NULL,
  start_date       DATE,
  end_date         DATE,
  category_id      TEXT REFERENCES public.categories(id) ON DELETE SET NULL
);

CREATE TABLE public.clients (
  id               TEXT PRIMARY KEY,
  external_code    TEXT,
  cnpj             TEXT,
  name             TEXT NOT NULL,
  trade_name       TEXT,
  legal_name       TEXT,
  street           TEXT,
  neighborhood     TEXT,
  city             TEXT NOT NULL,
  city_code        TEXT NOT NULL,
  state            TEXT NOT NULL DEFAULT 'PI',
  zip_code         TEXT,
  lat              DOUBLE PRECISION,
  lng              DOUBLE PRECISION,
  phone            TEXT,
  mobile           TEXT,
  email            TEXT,
  notes            TEXT,
  client_group     TEXT,
  organization_id  TEXT REFERENCES public.organizations(id) ON DELETE SET NULL,
  brand_id         TEXT REFERENCES public.brands(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.client_categories (
  client_id    TEXT NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  category_id  TEXT NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  PRIMARY KEY (client_id, category_id)
);

CREATE TABLE public.purchases (
  id             TEXT PRIMARY KEY,
  client_id      TEXT NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  collection_id  TEXT NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  purchased      SMALLINT NOT NULL DEFAULT 0 CHECK (purchased IN (0, 1)),
  purchased_at   TIMESTAMPTZ,
  UNIQUE (client_id, collection_id)
);

CREATE TABLE public.collection_goals (
  id             TEXT PRIMARY KEY,
  collection_id  TEXT NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  user_id        TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  category_id    TEXT NOT NULL DEFAULT 'all',
  goal_amount    NUMERIC(14, 2) NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (collection_id, user_id, category_id)
);

CREATE TABLE public.sales (
  id             TEXT PRIMARY KEY,
  client_id      TEXT NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  collection_id  TEXT NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  user_id        TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount         NUMERIC(14, 2) NOT NULL,
  sold_at        TIMESTAMPTZ NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (client_id, collection_id)
);

CREATE TABLE public.representative_scopes (
  id               TEXT PRIMARY KEY,
  user_id          TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  organization_id  TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  brand_id         TEXT REFERENCES public.brands(id) ON DELETE SET NULL,
  access_mode      public.access_mode NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.representative_scope_categories (
  scope_id     TEXT NOT NULL REFERENCES public.representative_scopes(id) ON DELETE CASCADE,
  category_id  TEXT NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  PRIMARY KEY (scope_id, category_id)
);

CREATE TABLE public.representative_scope_territories (
  scope_id   TEXT NOT NULL REFERENCES public.representative_scopes(id) ON DELETE CASCADE,
  city_code  TEXT NOT NULL,
  PRIMARY KEY (scope_id, city_code)
);

CREATE TABLE public.client_assignments (
  id               TEXT PRIMARY KEY,
  client_id        TEXT NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id          TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  assignment_type  public.assignment_type NOT NULL,
  valid_from       TIMESTAMPTZ,
  valid_to         TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (client_id, user_id, assignment_type)
);

CREATE TABLE public.app_meta (
  key    TEXT PRIMARY KEY,
  value  TEXT
);

-- ─── Índices ─────────────────────────────────────────────────────────────────

CREATE UNIQUE INDEX idx_clients_external_code
  ON public.clients (external_code)
  WHERE external_code IS NOT NULL;

CREATE INDEX idx_clients_organization_id ON public.clients (organization_id);
CREATE INDEX idx_clients_city_code ON public.clients (city_code);
CREATE INDEX idx_clients_cnpj ON public.clients (cnpj) WHERE cnpj IS NOT NULL;

CREATE INDEX idx_collections_organization_id ON public.collections (organization_id);
CREATE INDEX idx_collections_is_active ON public.collections (is_active);

CREATE INDEX idx_sales_collection_id ON public.sales (collection_id);
CREATE INDEX idx_sales_user_id ON public.sales (user_id);
CREATE INDEX idx_sales_sold_at ON public.sales (sold_at);

CREATE INDEX idx_purchases_collection_id ON public.purchases (collection_id);

CREATE INDEX idx_user_organizations_org ON public.user_organizations (organization_id);
CREATE INDEX idx_users_auth_user_id ON public.users (auth_user_id);

CREATE INDEX idx_representative_scopes_user ON public.representative_scopes (user_id);
CREATE INDEX idx_client_assignments_user ON public.client_assignments (user_id);

-- ─── Helpers para RLS (usados a partir da Fase 2) ───────────────────────────

CREATE OR REPLACE FUNCTION public.current_app_user_id()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.id
  FROM public.users u
  WHERE u.auth_user_id = auth.uid()
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.my_organization_ids()
RETURNS SETOF TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT uo.organization_id
  FROM public.user_organizations uo
  WHERE uo.user_id = public.current_app_user_id()
$$;

CREATE OR REPLACE FUNCTION public.is_org_admin(p_org_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_organizations uo
    WHERE uo.user_id = public.current_app_user_id()
      AND uo.organization_id = p_org_id
      AND uo.role = 'admin'
  )
$$;

CREATE OR REPLACE FUNCTION public.belongs_to_my_org(p_org_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p_org_id IS NOT NULL
     AND p_org_id IN (SELECT public.my_organization_ids())
$$;

-- ─── Row Level Security ──────────────────────────────────────────────────────
-- Políticas básicas por organização. Escopo fino de representante evolui na Fase 2+.

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_dimensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.representative_scopes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.representative_scope_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.representative_scope_territories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_meta ENABLE ROW LEVEL SECURITY;

-- organizations
CREATE POLICY organizations_select ON public.organizations
  FOR SELECT TO authenticated
  USING (id IN (SELECT public.my_organization_ids()));

-- category_dimensions
CREATE POLICY category_dimensions_all ON public.category_dimensions
  FOR ALL TO authenticated
  USING (public.belongs_to_my_org(organization_id))
  WITH CHECK (public.belongs_to_my_org(organization_id));

-- brands
CREATE POLICY brands_all ON public.brands
  FOR ALL TO authenticated
  USING (public.belongs_to_my_org(organization_id))
  WITH CHECK (public.belongs_to_my_org(organization_id));

-- categories
CREATE POLICY categories_all ON public.categories
  FOR ALL TO authenticated
  USING (
    organization_id IS NULL
    OR public.belongs_to_my_org(organization_id)
  )
  WITH CHECK (
    organization_id IS NULL
    OR public.belongs_to_my_org(organization_id)
  );

-- users (perfil próprio + colegas da mesma org)
CREATE POLICY users_select ON public.users
  FOR SELECT TO authenticated
  USING (
    id = public.current_app_user_id()
    OR id IN (
      SELECT uo.user_id
      FROM public.user_organizations uo
      WHERE uo.organization_id IN (SELECT public.my_organization_ids())
    )
  );

CREATE POLICY users_update_self ON public.users
  FOR UPDATE TO authenticated
  USING (id = public.current_app_user_id())
  WITH CHECK (id = public.current_app_user_id());

CREATE POLICY users_insert_admin ON public.users
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_organizations uo
      WHERE uo.user_id = public.current_app_user_id()
        AND uo.role = 'admin'
    )
  );

-- user_organizations
CREATE POLICY user_organizations_select ON public.user_organizations
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT public.my_organization_ids()));

CREATE POLICY user_organizations_admin ON public.user_organizations
  FOR ALL TO authenticated
  USING (public.is_org_admin(organization_id))
  WITH CHECK (public.is_org_admin(organization_id));

-- user_categories
CREATE POLICY user_categories_all ON public.user_categories
  FOR ALL TO authenticated
  USING (
    user_id = public.current_app_user_id()
    OR public.is_org_admin((
      SELECT uo.organization_id
      FROM public.user_organizations uo
      WHERE uo.user_id = user_categories.user_id
      LIMIT 1
    ))
  )
  WITH CHECK (
    public.is_org_admin((
      SELECT uo.organization_id
      FROM public.user_organizations uo
      WHERE uo.user_id = user_categories.user_id
      LIMIT 1
    ))
  );

-- collections
CREATE POLICY collections_all ON public.collections
  FOR ALL TO authenticated
  USING (
    organization_id IS NULL
    OR public.belongs_to_my_org(organization_id)
  )
  WITH CHECK (
    organization_id IS NULL
    OR public.belongs_to_my_org(organization_id)
  );

-- clients
CREATE POLICY clients_all ON public.clients
  FOR ALL TO authenticated
  USING (
    organization_id IS NULL
    OR public.belongs_to_my_org(organization_id)
  )
  WITH CHECK (
    organization_id IS NULL
    OR public.belongs_to_my_org(organization_id)
  );

-- client_categories (via cliente)
CREATE POLICY client_categories_all ON public.client_categories
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = client_categories.client_id
        AND (c.organization_id IS NULL OR public.belongs_to_my_org(c.organization_id))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = client_categories.client_id
        AND (c.organization_id IS NULL OR public.belongs_to_my_org(c.organization_id))
    )
  );

-- purchases (via cliente)
CREATE POLICY purchases_all ON public.purchases
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.clients c
      WHERE c.id = purchases.client_id
        AND (c.organization_id IS NULL OR public.belongs_to_my_org(c.organization_id))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.clients c
      WHERE c.id = purchases.client_id
        AND (c.organization_id IS NULL OR public.belongs_to_my_org(c.organization_id))
    )
  );

-- collection_goals
CREATE POLICY collection_goals_all ON public.collection_goals
  FOR ALL TO authenticated
  USING (
    user_id = public.current_app_user_id()
    OR public.is_org_admin((
      SELECT col.organization_id
      FROM public.collections col
      WHERE col.id = collection_goals.collection_id
    ))
  )
  WITH CHECK (
    user_id = public.current_app_user_id()
    OR public.is_org_admin((
      SELECT col.organization_id
      FROM public.collections col
      WHERE col.id = collection_goals.collection_id
    ))
  );

-- sales
CREATE POLICY sales_all ON public.sales
  FOR ALL TO authenticated
  USING (
    user_id = public.current_app_user_id()
    OR public.is_org_admin((
      SELECT c.organization_id
      FROM public.clients c
      WHERE c.id = sales.client_id
    ))
  )
  WITH CHECK (
    user_id = public.current_app_user_id()
    OR public.is_org_admin((
      SELECT c.organization_id
      FROM public.clients c
      WHERE c.id = sales.client_id
    ))
  );

-- representative_scopes
CREATE POLICY representative_scopes_all ON public.representative_scopes
  FOR ALL TO authenticated
  USING (public.belongs_to_my_org(organization_id))
  WITH CHECK (public.belongs_to_my_org(organization_id));

CREATE POLICY representative_scope_categories_all ON public.representative_scope_categories
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.representative_scopes rs
      WHERE rs.id = representative_scope_categories.scope_id
        AND public.belongs_to_my_org(rs.organization_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.representative_scopes rs
      WHERE rs.id = representative_scope_categories.scope_id
        AND public.belongs_to_my_org(rs.organization_id)
    )
  );

CREATE POLICY representative_scope_territories_all ON public.representative_scope_territories
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.representative_scopes rs
      WHERE rs.id = representative_scope_territories.scope_id
        AND public.belongs_to_my_org(rs.organization_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.representative_scopes rs
      WHERE rs.id = representative_scope_territories.scope_id
        AND public.belongs_to_my_org(rs.organization_id)
    )
  );

-- client_assignments
CREATE POLICY client_assignments_all ON public.client_assignments
  FOR ALL TO authenticated
  USING (
    user_id = public.current_app_user_id()
    OR public.is_org_admin((
      SELECT c.organization_id FROM public.clients c WHERE c.id = client_assignments.client_id
    ))
  )
  WITH CHECK (
    user_id = public.current_app_user_id()
    OR public.is_org_admin((
      SELECT c.organization_id FROM public.clients c WHERE c.id = client_assignments.client_id
    ))
  );

-- app_meta: apenas leitura para autenticados da org (sem org_id — restrito)
CREATE POLICY app_meta_select ON public.app_meta
  FOR SELECT TO authenticated
  USING (true);

-- ─── Dados iniciais (seed) ───────────────────────────────────────────────────

INSERT INTO public.organizations (id, name, slug)
VALUES ('org_default', 'Malwee Piauí', 'malwee-piaui')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.brands (id, organization_id, name, slug)
VALUES ('brand_malwee', 'org_default', 'Malwee', 'malwee')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.category_dimensions (id, organization_id, name, sort_order)
VALUES ('dim_faixa_etaria', 'org_default', 'Faixa etária', 0)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.categories (id, name, slug, organization_id, dimension_id)
VALUES
  ('cat_adulto', 'Adulto', 'adulto', 'org_default', 'dim_faixa_etaria'),
  ('cat_infantil', 'Infantil', 'infantil', 'org_default', 'dim_faixa_etaria')
ON CONFLICT (id) DO NOTHING;

-- Admin placeholder (PIN será substituído na Fase 2 com Auth)
INSERT INTO public.users (id, name, role, pin)
VALUES ('usr_admin', 'Administrador', 'admin', '1234')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.user_organizations (user_id, organization_id, role)
VALUES ('usr_admin', 'org_default', 'admin')
ON CONFLICT DO NOTHING;

INSERT INTO public.collections (
  id, name, is_active, organization_id, brand_id, start_date, end_date
)
VALUES (
  'col_seed_1', 'Verão 2026', 1, 'org_default', 'brand_malwee', '2026-01-01', '2026-06-30'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.app_meta (key, value)
VALUES ('schema_version', '1')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- ─── Grants ──────────────────────────────────────────────────────────────────

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;
