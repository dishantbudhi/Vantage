/**
 * scripts/preload-data.ts
 *
 * One-time script to convert raw data files into the JSON formats
 * expected by lib/data/loader.ts. Run with: npx tsx scripts/preload-data.ts
 *
 * Raw sources (committed to repo):
 *   - lib/data/ne_110m_admin_0_countries.geojson  (Natural Earth 110m)
 *   - lib/data/INFORM_Risk_Mid_2025_v071.xlsx     (INFORM Risk Index)
 *   - lib/data/global_power_plant_database.csv     (WRI power plants)
 *
 * Live API sources (fetched at script time):
 *   - World Bank API v2  -> economic-indicators.json
 *   - UNHCR API          -> displacement.json
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import path from "path";
import * as XLSX from "xlsx";
import { parse } from "csv-parse/sync";

const DATA_DIR = path.join(process.cwd(), "lib/data");
const PUBLIC_DIR = path.join(process.cwd(), "public");

// Ensure output directories exist
if (!existsSync(PUBLIC_DIR)) mkdirSync(PUBLIC_DIR, { recursive: true });

// ── 1. Countries GeoJSON ──────────────────────────────────────────────

function processCountries() {
  console.log("Processing countries GeoJSON...");

  const raw = JSON.parse(
    readFileSync(path.join(DATA_DIR, "ne_110m_admin_0_countries.geojson"), "utf-8")
  );

  const KEEP_PROPS = [
    "ISO_A3",
    "NAME",
    "ADM0_A3",
    "POP_EST",
    "GDP_MD",
    "CONTINENT",
    "REGION_UN",
    "SUBREGION",
    "ISO_A2",
  ];

  const trimmed = {
    type: "FeatureCollection",
    features: raw.features.map((f: any) => {
      const props: Record<string, any> = {};
      for (const key of KEEP_PROPS) {
        if (f.properties[key] !== undefined) {
          props[key] = f.properties[key];
        }
      }
      return {
        type: "Feature",
        properties: props,
        geometry: f.geometry,
      };
    }),
  };

  // Write to lib/data for server-side use
  writeFileSync(
    path.join(DATA_DIR, "countries.json"),
    JSON.stringify(trimmed)
  );

  // Write to public/ for client-side fetch
  writeFileSync(
    path.join(PUBLIC_DIR, "countries.geojson"),
    JSON.stringify(trimmed)
  );

  console.log(
    `  -> countries.json: ${trimmed.features.length} features, ` +
      `${(JSON.stringify(trimmed).length / 1024).toFixed(0)}KB`
  );
}

// ── 2. INFORM Risk Index ──────────────────────────────────────────────

function processRiskIndex() {
  console.log("Processing INFORM Risk Index...");

  const filePath = path.join(DATA_DIR, "INFORM_Risk_Mid_2025_v071.xlsx");
  const wb = XLSX.readFile(filePath, { type: "file" });

  const sheetName = "INFORM Risk Mid 2025 (a-z)";
  const ws = wb.Sheets[sheetName];
  if (!ws) {
    throw new Error(`Sheet "${sheetName}" not found in INFORM workbook`);
  }

  const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

  // Row 0: empty, Row 1: headers, Row 2: sub-headers, Row 3+: data
  // Headers at row index 1:
  //   Col 1: ISO3
  //   Col 2: INFORM RISK
  //   Col 6: HAZARD & EXPOSURE
  //   Col 18: VULNERABILITY
  //   Col 30: LACK OF COPING CAPACITY

  const result: Record<
    string,
    {
      risk_score: number;
      hazard_exposure: number;
      vulnerability: number;
      lack_of_coping_capacity: number;
    }
  > = {};

  for (let i = 3; i < rows.length; i++) {
    const row = rows[i];
    const iso3 = row[1];
    if (!iso3 || typeof iso3 !== "string" || iso3.length !== 3) continue;

    result[iso3] = {
      risk_score: parseFloat(row[2]) || 0,
      hazard_exposure: parseFloat(row[6]) || 0,
      vulnerability: parseFloat(row[18]) || 0,
      lack_of_coping_capacity: parseFloat(row[30]) || 0,
    };
  }

  writeFileSync(
    path.join(DATA_DIR, "risk-index.json"),
    JSON.stringify(result, null, 2)
  );

  console.log(`  -> risk-index.json: ${Object.keys(result).length} countries`);
}

// ── 3. Power Plants ───────────────────────────────────────────────────

function processPowerPlants() {
  console.log("Processing WRI Power Plants...");

  const csvContent = readFileSync(
    path.join(DATA_DIR, "global_power_plant_database.csv"),
    "utf-8"
  );

  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  const plants = records.map((r: any) => ({
    country: r.country || "",
    country_long: r.country_long || "",
    name: r.name || "",
    latitude: parseFloat(r.latitude) || 0,
    longitude: parseFloat(r.longitude) || 0,
    capacity_mw: parseFloat(r.capacity_mw) || 0,
    primary_fuel: r.primary_fuel || "",
  }));

  writeFileSync(
    path.join(DATA_DIR, "power-plants.json"),
    JSON.stringify(plants)
  );

  console.log(`  -> power-plants.json: ${plants.length} plants`);
}

// ── 4. World Bank Economic Indicators ─────────────────────────────────

async function processEconomicIndicators() {
  console.log("Fetching World Bank economic indicators...");

  // Indicators: GDP, Poverty, Arable Land, Energy Use
  const url =
    "https://api.worldbank.org/v2/country/all/indicator/NY.GDP.MKTP.CD;SP.POP.TOTL;SI.POV.DDAY;AG.LND.ARBL.ZS;EG.USE.PCAP.KG.OE;NE.TRD.GNFS.ZS?format=json&per_page=10000&source=2&date=2022:2024";

  const result: Record<string, Record<string, number | null>> = {};

  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const pageUrl = `${url}&page=${page}`;
    console.log(`  Fetching page ${page}...`);

    const res = await fetch(pageUrl);
    if (!res.ok) {
      throw new Error(`World Bank API error: ${res.status} ${res.statusText}`);
    }

    const json = await res.json();
    const [meta, data] = json;

    if (!data || !Array.isArray(data)) {
      console.warn(`  No data on page ${page}`);
      break;
    }

    totalPages = meta.pages || 1;

    for (const entry of data) {
      const iso3 = entry.countryiso3code;
      if (!iso3 || iso3.length !== 3) continue;

      // Only keep the most recent non-null value per indicator per country
      if (!result[iso3]) result[iso3] = {};
      const indicator = entry.indicator.id;
      if (result[iso3][indicator] === undefined || result[iso3][indicator] === null) {
        if (entry.value !== null) {
          result[iso3][indicator] = entry.value;
        }
      }
    }

    page++;
  }

  writeFileSync(
    path.join(DATA_DIR, "economic-indicators.json"),
    JSON.stringify(result, null, 2)
  );

  console.log(
    `  -> economic-indicators.json: ${Object.keys(result).length} countries`
  );
}

// ── 5. UNHCR Displacement Data ────────────────────────────────────────

async function processDisplacement() {
  console.log("Fetching UNHCR displacement data...");

  // coa_all=true returns per-country-of-asylum aggregates
  const url =
    "https://api.unhcr.org/population/v1/population/?limit=500&year=2023&coa_all=true&columns%5B%5D=refugees&columns%5B%5D=asylum_seekers&columns%5B%5D=idps&columns%5B%5D=stateless";

  const result: Record<
    string,
    {
      refugees: number;
      asylum_seekers: number;
      idps: number;
      stateless: number;
    }
  > = {};

  try {
    console.log("  Fetching UNHCR data...");

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`UNHCR API error: ${res.status} ${res.statusText}`);
    }

    const json = await res.json();
    const items = json.items || [];

    for (const entry of items) {
      const iso3 = entry.coa_iso || "";
      if (!iso3 || iso3.length !== 3 || iso3 === "-") continue;

      result[iso3] = {
        refugees: Number(entry.refugees) || 0,
        asylum_seekers: Number(entry.asylum_seekers) || 0,
        idps: Number(entry.idps) || 0,
        stateless: Number(entry.stateless) || 0,
      };
    }
  } catch (error) {
    console.warn(
      `  UNHCR API fetch failed: ${error instanceof Error ? error.message : error}`
    );
    console.warn("  Generating empty displacement.json as fallback");
  }

  writeFileSync(
    path.join(DATA_DIR, "displacement.json"),
    JSON.stringify(result, null, 2)
  );

  console.log(
    `  -> displacement.json: ${Object.keys(result).length} countries`
  );
}

// ── Main ──────────────────────────────────────────────────────────────

async function main() {
  console.log("=== CryoNexus Data Preload ===\n");

  // Local file processing (no network needed)
  processCountries();
  processRiskIndex();
  processPowerPlants();

  // API fetches (network required)
  await processEconomicIndicators();
  await processDisplacement();

  console.log("\n=== All data pre-loaded successfully ===");
}

main().catch((err) => {
  console.error("Preload failed:", err);
  process.exit(1);
});
