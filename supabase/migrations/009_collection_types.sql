-- Tipo/temporada da coleção (Alto Verão, Outono/Inverno, Primavera, ...).
--
-- Em vez de um CREATE TYPE ... AS ENUM (travado no schema), usamos uma
-- tabela de referência — o mesmo padrão já usado por `categories`/`brands`:
-- organization_id nullable permite que cada organização tenha seus próprios
-- tipos no futuro sem exigir uma migração de schema, só uma linha nova.
--
-- Isso permite que o app saiba que "Alto Verão 2026" e "Alto Verão 2025" são
-- a mesma "coleção" em anos diferentes (mesmo collection_type_id), o que é
-- usado para alternar entre anos no mapa.

CREATE TABLE public.collection_types (
  id               TEXT PRIMARY KEY,
  organization_id  TEXT REFERENCES public.organizations(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  slug             TEXT NOT NULL,
  sort_order       INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, slug)
);

ALTER TABLE public.collections
  ADD COLUMN collection_type_id TEXT REFERENCES public.collection_types(id) ON DELETE SET NULL;

CREATE INDEX idx_collections_collection_type_id ON public.collections (collection_type_id);

-- ─── Row Level Security ──────────────────────────────────────────────────────

ALTER TABLE public.collection_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY collection_types_all ON public.collection_types
  FOR ALL TO authenticated
  USING (
    organization_id IS NULL
    OR public.belongs_to_my_org(organization_id)
  )
  WITH CHECK (
    organization_id IS NULL
    OR public.belongs_to_my_org(organization_id)
  );

-- Tabelas criadas depois da migration inicial não herdam o GRANT ALL ON ALL
-- TABLES de lá — precisa de grant explícito.
GRANT ALL ON public.collection_types TO anon, authenticated, service_role;

-- ─── Seed (tipos padrão da Malwee Piauí) ────────────────────────────────────

INSERT INTO public.collection_types (id, organization_id, name, slug, sort_order)
VALUES
  ('ctype_outono_inverno', 'org_default', 'Outono/Inverno', 'outono-inverno', 0),
  ('ctype_alto_verao',     'org_default', 'Alto Verão',      'alto-verao',     1),
  ('ctype_primavera',      'org_default', 'Primavera',       'primavera',      2)
ON CONFLICT (id) DO NOTHING;

-- ─── Backfill best-effort das coleções já existentes ────────────────────────
-- Idempotente: só toca linhas ainda sem tipo. Nomes que não batem com
-- nenhum padrão (ex.: seed "Verão 2026") ficam sem tipo — sem tela de edição
-- de coleção hoje, ajuste manual via SQL se necessário.

UPDATE public.collections
SET collection_type_id = 'ctype_alto_verao'
WHERE collection_type_id IS NULL
  AND name ILIKE '%alto ver%o%';

UPDATE public.collections
SET collection_type_id = 'ctype_outono_inverno'
WHERE collection_type_id IS NULL
  AND (name ILIKE '%outono%' OR name ILIKE '%inverno%');

UPDATE public.collections
SET collection_type_id = 'ctype_primavera'
WHERE collection_type_id IS NULL
  AND name ILIKE '%primavera%';
