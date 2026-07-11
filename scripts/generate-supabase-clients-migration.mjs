/**
 * Gera uma migration SQL para importar os clientes dos CSVs (adulto + infantil)
 * direto no Supabase, mesclando categorias quando o mesmo Código aparece nos
 * dois arquivos.
 *
 * Uso: node scripts/generate-supabase-clients-migration.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const ADULTO_CSV = path.join(ROOT, 'ConsultaCliente1783775841170_adulto.csv');
const INFANTIL_CSV = path.join(ROOT, 'ConsultaCliente1783776024419_infantil.csv');
const OUT_PATH = path.join(ROOT, 'supabase/migrations/005_import_clients_csv.sql');

const DEFAULT_ORG_ID = 'org_default';
const DEFAULT_BRAND_ID = 'brand_malwee';
const UF_TO_STATE_CODE = { PI: '22', MA: '21', BA: '29', TO: '17' };

function normalize(value) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function readRows(csvPath) {
  const raw = fs.readFileSync(csvPath, 'utf8').replace(/^﻿/, '');
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const rows = lines.slice(1).map((line) => {
    const parts = line.split(';');
    return {
      externalCode: parts[0]?.trim(),
      tradeName: parts[1]?.trim() || null,
      legalName: parts[2]?.trim() || null,
      street: parts[3]?.trim() || null,
      neighborhood: parts[4]?.trim() || null,
      cityRaw: parts[5]?.trim() || '',
      state: parts[6]?.trim(),
      zipCode: parts[7]?.trim() || null,
      phone: parts[8]?.trim() || null,
      mobile: parts[9]?.trim() || null,
      email: parts[10]?.trim() || null,
      clientGroup: parts[11]?.trim() || null,
    };
  });
  return rows.filter((r) => r.externalCode);
}

async function fetchMunicipalities(ufCode) {
  const res = await fetch(
    `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${ufCode}/municipios`
  );
  if (!res.ok) throw new Error(`IBGE municipios ${ufCode}: ${res.status}`);
  return res.json();
}

async function fetchPiCentroids() {
  const [geoRes, namesRes] = await Promise.all([
    fetch(
      'https://servicodados.ibge.gov.br/api/v2/malhas/22?resolucao=5&formato=application/vnd.geo+json&qualidade=2'
    ),
    fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados/22/municipios'),
  ]);
  const geo = await geoRes.json();
  const names = await namesRes.json();
  const nameMap = new Map(names.map((m) => [String(m.id), m.nome]));
  const centroids = new Map();
  for (const feature of geo.features || []) {
    const code = feature.properties?.codarea;
    const c = feature.properties?.centroide;
    if (code && c) {
      centroids.set(code, { lat: c[1], lng: c[0], name: nameMap.get(code) });
    }
  }
  return centroids;
}

function sqlStr(value) {
  if (value === null || value === undefined || value === '') return 'NULL';
  return `'${String(value).replace(/'/g, "''")}'`;
}

function sqlNum(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return 'NULL';
  return String(value);
}

async function main() {
  const adultoRows = readRows(ADULTO_CSV);
  const infantilRows = readRows(INFANTIL_CSV);

  console.log(`Linhas adulto: ${adultoRows.length}`);
  console.log(`Linhas infantil: ${infantilRows.length}`);

  const merged = new Map();

  for (const row of adultoRows) {
    merged.set(row.externalCode, { ...row, categoryIds: ['cat_adulto'] });
  }
  for (const row of infantilRows) {
    const existing = merged.get(row.externalCode);
    if (existing) {
      if (!existing.categoryIds.includes('cat_infantil')) {
        existing.categoryIds.push('cat_infantil');
      }
      // Preenche campos que a linha adulto deixou em branco.
      for (const key of ['tradeName', 'legalName', 'street', 'neighborhood', 'zipCode', 'phone', 'mobile', 'email', 'clientGroup']) {
        if (!existing[key] && row[key]) existing[key] = row[key];
      }
    } else {
      merged.set(row.externalCode, { ...row, categoryIds: ['cat_infantil'] });
    }
  }

  const clients = [...merged.values()];
  const both = clients.filter((c) => c.categoryIds.length === 2).length;
  console.log(`Clientes únicos: ${clients.length} (em ambas categorias: ${both})`);

  const ufs = [...new Set(clients.map((c) => c.state))];
  const cityLookup = new Map();
  for (const uf of ufs) {
    const stateCode = UF_TO_STATE_CODE[uf];
    if (!stateCode) {
      console.warn(`UF sem mapeamento IBGE: ${uf}`);
      continue;
    }
    const municipios = await fetchMunicipalities(stateCode);
    for (const m of municipios) {
      cityLookup.set(`${uf}|${normalize(m.nome)}`, { code: String(m.id), name: m.nome });
    }
  }

  const piCentroids = await fetchPiCentroids();

  const resolved = [];
  const unmatched = [];

  for (const c of clients) {
    const match = cityLookup.get(`${c.state}|${normalize(c.cityRaw)}`);
    if (!match) {
      unmatched.push({ code: c.externalCode, city: c.cityRaw, state: c.state });
      continue;
    }
    const centroid = c.state === 'PI' ? piCentroids.get(match.code) : null;
    resolved.push({
      ...c,
      city: match.name,
      cityCode: match.code,
      lat: centroid?.lat ?? null,
      lng: centroid?.lng ?? null,
    });
  }

  console.log(`Resolvidos com cidade IBGE: ${resolved.length}`);
  console.log(`Sem match de município (não importados): ${unmatched.length}`);
  if (unmatched.length) {
    console.log(unmatched.slice(0, 20));
  }

  const now = new Date().toISOString();
  const clientValues = resolved.map((c) => {
    const id = `cli_imp_${c.externalCode}`;
    const displayName = c.tradeName || c.legalName || `Cliente ${c.externalCode}`;
    return `  (${sqlStr(id)}, ${sqlStr(c.externalCode)}, ${sqlStr(DEFAULT_ORG_ID)}, ${sqlStr(DEFAULT_BRAND_ID)}, ${sqlStr(displayName)}, NULL, ${sqlStr(c.tradeName)}, ${sqlStr(c.legalName)}, ${sqlStr(c.street)}, ${sqlStr(c.neighborhood)}, ${sqlStr(c.city)}, ${sqlStr(c.cityCode)}, ${sqlStr(c.state)}, ${sqlStr(c.zipCode)}, ${sqlNum(c.lat)}, ${sqlNum(c.lng)}, ${sqlStr(c.phone)}, ${sqlStr(c.mobile)}, ${sqlStr(c.email)}, ${sqlStr(c.clientGroup)}, ${sqlStr(now)})`;
  });

  const categoryValues = [];
  for (const c of resolved) {
    const id = `cli_imp_${c.externalCode}`;
    for (const categoryId of c.categoryIds) {
      categoryValues.push(`  (${sqlStr(id)}, ${sqlStr(categoryId)})`);
    }
  }

  const sql = `-- Importa clientes dos CSVs "adulto" e "infantil" (Código mesclado quando
-- aparece nos dois arquivos, recebendo as duas categorias).
-- Gerado por scripts/generate-supabase-clients-migration.mjs — não editar à mão.
-- Total: ${resolved.length} clientes, ${categoryValues.length} vínculos de categoria.
-- ${unmatched.length} clientes não importados por falta de município IBGE correspondente
-- (ver saída do script para a lista).

INSERT INTO public.clients (
  id, external_code, organization_id, brand_id, name, cnpj, trade_name, legal_name,
  street, neighborhood, city, city_code, state, zip_code,
  lat, lng, phone, mobile, email, client_group, created_at
) VALUES
${clientValues.join(',\n')}
ON CONFLICT (external_code) WHERE external_code IS NOT NULL DO NOTHING;

INSERT INTO public.client_categories (client_id, category_id) VALUES
${categoryValues.join(',\n')}
ON CONFLICT (client_id, category_id) DO NOTHING;
`;

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, sql, 'utf8');
  console.log(`Migration gerada em: ${OUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
