-- Adiciona campos de redes sociais ao cadastro de clientes.

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS instagram TEXT,
  ADD COLUMN IF NOT EXISTS facebook TEXT;
