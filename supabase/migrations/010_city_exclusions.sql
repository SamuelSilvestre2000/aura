-- Cidades marcadas como inviáveis para a marca.
--
-- Nem toda cidade do Piauí comporta uma loja da marca que o representante
-- representa: sem economia local suficiente, não há lojista para vender. Sem
-- registrar isso, essas cidades aparecem no mapa como vermelhas ("ninguém
-- comprou"), indistinguíveis de uma cidade que o representante ainda não
-- trabalhou — e o mapa passa a cobrar uma venda que não existe para ser feita.
--
-- Não há tabela de cidades: elas vêm do GeoJSON do IBGE e são referenciadas
-- pelo código em todo o schema (`clients.city_code`,
-- `representative_scope_territories.city_code`). Aqui é o mesmo padrão.
--
-- O escopo é organização + marca, não usuário: a inviabilidade é fato da
-- cidade diante da marca, então vale para qualquer um que a represente.
-- `brand_id` nullable cobre a organização que ainda não separa por marca.

CREATE TABLE public.city_exclusions (
  id               TEXT PRIMARY KEY,
  organization_id  TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  brand_id         TEXT REFERENCES public.brands(id) ON DELETE CASCADE,
  city_code        TEXT NOT NULL,
  note             TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by       TEXT REFERENCES public.users(id) ON DELETE SET NULL
);

-- Uma cidade só pode estar excluída uma vez por organização/marca. Índices
-- separados porque UNIQUE trata NULL como sempre distinto: sem o índice
-- parcial, a mesma cidade poderia ser excluída várias vezes com brand_id nulo.
CREATE UNIQUE INDEX idx_city_exclusions_org_brand_city
  ON public.city_exclusions (organization_id, brand_id, city_code)
  WHERE brand_id IS NOT NULL;

CREATE UNIQUE INDEX idx_city_exclusions_org_city_no_brand
  ON public.city_exclusions (organization_id, city_code)
  WHERE brand_id IS NULL;

CREATE INDEX idx_city_exclusions_city_code ON public.city_exclusions (city_code);

-- ─── Row Level Security ──────────────────────────────────────────────────────

ALTER TABLE public.city_exclusions ENABLE ROW LEVEL SECURITY;

CREATE POLICY city_exclusions_all ON public.city_exclusions
  FOR ALL TO authenticated
  USING (public.belongs_to_my_org(organization_id))
  WITH CHECK (public.belongs_to_my_org(organization_id));

-- Tabelas criadas depois da migration inicial não herdam o GRANT ALL ON ALL
-- TABLES de lá — precisa de grant explícito.
GRANT ALL ON public.city_exclusions TO anon, authenticated, service_role;
