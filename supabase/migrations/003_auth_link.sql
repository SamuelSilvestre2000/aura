-- Aura — Fase 2: vínculo Supabase Auth ↔ public.users
-- Execute no SQL Editor após 001_initial_schema.sql

-- E-mail do administrador (ajuste antes de criar o usuário no Auth)
UPDATE public.users
SET email = COALESCE(NULLIF(trim(email), ''), 'samuelsilvestre2000@gmail.com')
WHERE id = 'usr_admin';

-- Permite vincular perfil no primeiro login (e-mail igual, auth_user_id ainda nulo)
DROP POLICY IF EXISTS users_link_self ON public.users;
CREATE POLICY users_link_self ON public.users
  FOR UPDATE TO authenticated
  USING (
    auth_user_id IS NULL
    AND email IS NOT NULL
    AND lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
  WITH CHECK (auth_user_id = auth.uid());

DROP POLICY IF EXISTS users_select ON public.users;
CREATE POLICY users_select ON public.users
  FOR SELECT TO authenticated
  USING (
    id = public.current_app_user_id()
    OR auth_user_id = auth.uid()
    OR (
      auth_user_id IS NULL
      AND email IS NOT NULL
      AND lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
    OR id IN (
      SELECT uo.user_id
      FROM public.user_organizations uo
      WHERE uo.organization_id IN (SELECT public.my_organization_ids())
    )
  );

-- Vincula auth.uid() ao registro em public.users pelo e-mail
CREATE OR REPLACE FUNCTION public.link_current_auth_user()
RETURNS public.users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result public.users;
  jwt_email TEXT := lower(coalesce(auth.jwt() ->> 'email', ''));
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sessão inválida.';
  END IF;

  IF jwt_email = '' THEN
    RAISE EXCEPTION 'E-mail não encontrado na sessão.';
  END IF;

  UPDATE public.users
  SET auth_user_id = auth.uid()
  WHERE auth_user_id IS NULL
    AND email IS NOT NULL
    AND lower(email) = jwt_email
  RETURNING * INTO result;

  IF result IS NULL THEN
    SELECT * INTO result
    FROM public.users
    WHERE auth_user_id = auth.uid()
    LIMIT 1;
  END IF;

  IF result IS NULL THEN
    RAISE EXCEPTION 'Nenhum perfil vinculado a este e-mail. Peça ao administrador para cadastrar seu acesso.';
  END IF;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.link_current_auth_user() TO authenticated;
