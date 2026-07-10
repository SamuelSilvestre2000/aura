-- Adiciona uma marcação explícita de "coleção vigente", em vez de depender só do
-- cálculo por período (data inicial/final). Só uma coleção pode estar vigente
-- por organização.

ALTER TABLE public.collections
  ADD COLUMN is_vigente BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX idx_collections_single_vigente
  ON public.collections (organization_id)
  WHERE is_vigente = true;
