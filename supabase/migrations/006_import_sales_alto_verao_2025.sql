-- Importa as vendas históricas da coleção "Alto Verão 2025" a partir da
-- planilha "ALTO_VERÃO 2026.csv" (coluna "ALTO VERÃO 2025").
--
-- Origem dos dados: coluna "Nome" traz o código do cliente entre parênteses
-- (ex.: "JOSEANA BRITO DE CARVALHO (1015171)" → código 1015171), que
-- corresponde a clients.external_code. Quando o mesmo código aparece em mais
-- de uma linha (uma por marca — Malwee Kids / Carinhoso), os valores foram
-- somados, pois a tabela `sales` permite apenas 1 registro por
-- (client_id, collection_id).
--
-- Representante responsável (sales.user_id): Marcos Antônio
--   (usr_1783807838725_fq1z7n1t2)
-- sold_at: data de início (start_date) da própria coleção "Alto Verão 2025"
--
-- Total: 39 clientes com compra registrada.
-- Todos os 39 códigos já existem em public.clients (conferido previamente).
--
-- Idempotente: pode ser executado mais de uma vez (ON CONFLICT faz upsert).

-- ─── Validação prévia da coleção ────────────────────────────────────────────

DO $$
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.collections WHERE name = 'Alto Verão 2025';
  IF v_count = 0 THEN
    RAISE EXCEPTION 'Coleção "Alto Verão 2025" não encontrada. Verifique o nome exato cadastrado.';
  ELSIF v_count > 1 THEN
    RAISE EXCEPTION 'Mais de uma coleção com nome "Alto Verão 2025" encontrada (% linhas). Ajuste o script para usar o id específico.', v_count;
  END IF;
END $$;

-- ─── Dados importados (external_code, valor somado) ─────────────────────────

WITH import_data (external_code, amount) AS (
  VALUES
    ('1001586', 35676::numeric),
    ('1001977', 10188::numeric),
    ('1003305', 8485::numeric),
    ('1003901', 600::numeric),
    ('1003959', 7033::numeric),
    ('1004623', 12226::numeric),
    ('1005354', 7019::numeric),
    ('1005785', 8160::numeric),
    ('1007405', 15731::numeric),
    ('1010941', 7394::numeric),
    ('1016183', 6176::numeric),
    ('1025250', 1319::numeric),
    ('1026072', 3563::numeric),
    ('1027363', 6424::numeric),
    ('1029531', 2320::numeric),
    ('1037051', 9629::numeric),
    ('1044721', 508::numeric),
    ('1045841', 4174::numeric),
    ('1046086', 5990::numeric),
    ('1062611', 4787::numeric),
    ('1064000', 24198::numeric),
    ('1064895', 2020::numeric),
    ('1069042', 9381::numeric),
    ('1075017', 2853::numeric),
    ('1085212', 4125::numeric),
    ('1096314', 8268::numeric),
    ('1100147', 182176::numeric),
    ('1100872', 6028::numeric),
    ('1102225', 7675::numeric),
    ('1105369', 11662::numeric),
    ('1105583', 12231::numeric),
    ('1107024', 3679::numeric),
    ('1110053', 5002::numeric),
    ('1110432', 9851::numeric),
    ('1111598', 3821::numeric),
    ('1112016', 4321::numeric),
    ('1112178', 4036::numeric),
    ('1112413', 22126::numeric),
    ('1112462', 6122::numeric)
),
target_collection AS (
  SELECT id, start_date
  FROM public.collections
  WHERE name = 'Alto Verão 2025'
  LIMIT 1
),
resolved AS (
  SELECT
    c.id AS client_id,
    tc.id AS collection_id,
    COALESCE(tc.start_date::timestamptz, now()) AS sold_at,
    d.amount
  FROM import_data d
  JOIN public.clients c ON c.external_code = d.external_code
  CROSS JOIN target_collection tc
)
INSERT INTO public.sales (id, client_id, collection_id, user_id, amount, sold_at, created_at)
SELECT
  'sale_imp_' || r.client_id,
  r.client_id,
  r.collection_id,
  'usr_1783807838725_fq1z7n1t2',
  r.amount,
  r.sold_at,
  now()
FROM resolved r
ON CONFLICT (client_id, collection_id) DO UPDATE
SET amount   = EXCLUDED.amount,
    user_id  = EXCLUDED.user_id,
    sold_at  = EXCLUDED.sold_at;

-- ─── Sincroniza a flag `purchases` (mesmo efeito de registrar a venda no app) ─

WITH import_data (external_code, amount) AS (
  VALUES
    ('1001586', 35676::numeric),
    ('1001977', 10188::numeric),
    ('1003305', 8485::numeric),
    ('1003901', 600::numeric),
    ('1003959', 7033::numeric),
    ('1004623', 12226::numeric),
    ('1005354', 7019::numeric),
    ('1005785', 8160::numeric),
    ('1007405', 15731::numeric),
    ('1010941', 7394::numeric),
    ('1016183', 6176::numeric),
    ('1025250', 1319::numeric),
    ('1026072', 3563::numeric),
    ('1027363', 6424::numeric),
    ('1029531', 2320::numeric),
    ('1037051', 9629::numeric),
    ('1044721', 508::numeric),
    ('1045841', 4174::numeric),
    ('1046086', 5990::numeric),
    ('1062611', 4787::numeric),
    ('1064000', 24198::numeric),
    ('1064895', 2020::numeric),
    ('1069042', 9381::numeric),
    ('1075017', 2853::numeric),
    ('1085212', 4125::numeric),
    ('1096314', 8268::numeric),
    ('1100147', 182176::numeric),
    ('1100872', 6028::numeric),
    ('1102225', 7675::numeric),
    ('1105369', 11662::numeric),
    ('1105583', 12231::numeric),
    ('1107024', 3679::numeric),
    ('1110053', 5002::numeric),
    ('1110432', 9851::numeric),
    ('1111598', 3821::numeric),
    ('1112016', 4321::numeric),
    ('1112178', 4036::numeric),
    ('1112413', 22126::numeric),
    ('1112462', 6122::numeric)
),
target_collection AS (
  SELECT id, start_date
  FROM public.collections
  WHERE name = 'Alto Verão 2025'
  LIMIT 1
),
resolved AS (
  SELECT
    c.id AS client_id,
    tc.id AS collection_id,
    COALESCE(tc.start_date::timestamptz, now()) AS purchased_at
  FROM import_data d
  JOIN public.clients c ON c.external_code = d.external_code
  CROSS JOIN target_collection tc
)
INSERT INTO public.purchases (id, client_id, collection_id, purchased, purchased_at)
SELECT
  'pur_imp_' || r.client_id,
  r.client_id,
  r.collection_id,
  1,
  r.purchased_at
FROM resolved r
ON CONFLICT (client_id, collection_id) DO UPDATE
SET purchased     = 1,
    purchased_at  = EXCLUDED.purchased_at;

-- ─── Conferência (rode manualmente após a importação) ───────────────────────
-- SELECT count(*) FROM public.sales
--   WHERE collection_id = (SELECT id FROM public.collections WHERE name = 'Alto Verão 2025');
-- Deve retornar 39.
