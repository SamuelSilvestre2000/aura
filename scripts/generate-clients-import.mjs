/**
 * Gera data/clients-import.json a partir do CSV de clientes.
 * Uso: node scripts/generate-clients-import.mjs [caminho-do-csv]
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const csvPath =
  process.argv[2] ||
  'C:/Users/samue/Downloads/ConsultaCliente1781661775997.csv';

const UF_TO_STATE = { PI: '22', MA: '21', BA: '29', TO: '17' };

function normalize(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function parseCsvLine(line) {
  const parts = line.split(';');
  return {
    externalCode: parts[0]?.trim(),
    tradeName: parts[1]?.trim(),
    legalName: parts[2]?.trim(),
    street: parts[3]?.trim(),
    neighborhood: parts[4]?.trim(),
    city: parts[5]?.trim(),
    state: parts[6]?.trim(),
    zipCode: parts[7]?.trim(),
    phone: parts[8]?.trim(),
    clientGroup: parts[9]?.trim(),
  };
}

async function fetchMunicipalities(uf) {
  const stateId = UF_TO_STATE[uf];
  if (!stateId) return [];
  const res = await fetch(
    `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${stateId}/municipios`
  );
  if (!res.ok) throw new Error(`IBGE ${uf}: ${res.status}`);
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

async function main() {
  const raw = fs.readFileSync(csvPath, 'latin1');
  const lines = raw.split(/\r?\n/).filter((l) => l.trim());
  const header = lines[0];
  if (!header.startsWith('Código')) {
    console.warn('Cabeçalho inesperado:', header);
  }

  const rows = lines.slice(1).map(parseCsvLine);
  const ufs = [...new Set(rows.map((r) => r.state))];

  const cityLookup = new Map();
  for (const uf of ufs) {
    const municipios = await fetchMunicipalities(uf);
    for (const m of municipios) {
      const key = `${uf}|${normalize(m.nome)}`;
      cityLookup.set(key, { code: String(m.id), name: m.nome });
    }
  }

  const piCentroids = await fetchPiCentroids();
  const unmatched = [];
  const clients = [];

  for (const row of rows) {
    const key = `${row.state}|${normalize(row.city)}`;
    let match = cityLookup.get(key);

    if (!match) {
      const altKey = `${row.state}|${normalize(row.city.replace(/\s+/g, ' '))}`;
      match = cityLookup.get(altKey);
    }

    if (!match) {
      unmatched.push({ city: row.city, state: row.state, code: row.externalCode });
      continue;
    }

    const centroid = row.state === 'PI' ? piCentroids.get(match.code) : null;
    const displayName = row.tradeName || row.legalName || `Cliente ${row.externalCode}`;

    clients.push({
      id: `cli_imp_${row.externalCode}`,
      externalCode: row.externalCode,
      name: displayName,
      tradeName: row.tradeName || null,
      legalName: row.legalName || null,
      street: row.street || null,
      neighborhood: row.neighborhood || null,
      city: match.name,
      cityCode: match.code,
      state: row.state,
      zipCode: row.zipCode || null,
      phone: row.phone || null,
      clientGroup: row.clientGroup || null,
      lat: centroid?.lat ?? null,
      lng: centroid?.lng ?? null,
      categoryIds: ['cat_adulto'],
    });
  }

  const outPath = path.join(__dirname, '../data/clients-import.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify({ clients, unmatched }, null, 2), 'utf8');

  console.log(`Importados: ${clients.length}`);
  console.log(`Sem município IBGE: ${unmatched.length}`);
  if (unmatched.length) {
    console.log('Não encontrados:', unmatched.slice(0, 10));
  }
  console.log('Arquivo:', outPath);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
