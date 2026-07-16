-- Adiciona a Inscrição Municipal ao cadastro de clientes.

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS municipal_registration TEXT;
