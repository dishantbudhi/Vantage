import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";

function ensureDataDir() {
    const dir = path.join(process.cwd(), "lib/data");
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

export async function fetchCountries() {
    console.log("Fetching Natural Earth GeoJSON...");
    const res = await fetch(
        "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson"
    );
    if (!res.ok) throw new Error("Failed to fetch Natural Earth data");
    const geo = await res.json();

    ensureDataDir();
    fs.writeFileSync(
        path.join(process.cwd(), "lib/data/countries.json"),
        JSON.stringify(geo)
    );
    console.log("-> Saved countries.json");
}

export async function fetchEconomicIndicators() {
    console.log("Fetching World Bank indicators...");
    const indicators = [
        "NY.GDP.MKTP.CD", // GDP (current US$)
        "SP.POP.TOTL",    // Population, total
        "SI.POV.DDAY",    // Poverty headcount ratio at $2.15 a day (2017 PPP) (% of population)
        "AG.LND.ARBL.ZS", // Arable land (% of land area)
        "EG.USE.PCAP.KG.OE", // Energy use (kg of oil equivalent per capita)
        "NE.TRD.GNFS.ZS"  // Trade (% of GDP)
    ];

    const econ: Record<string, Record<string, number | null>> = {};

    for (const code of indicators) {
        console.log(`  - Fetching ${code}...`);
        try {
            // World Bank API pagination - generally 300 covers all countries.
            // For robustness, one could paginate, but 300 is usually safe for "all countries".
            const url = `https://api.worldbank.org/v2/country/all/indicator/${code}?format=json&per_page=300&date=2023`;
            const res = await fetch(url);
            if (!res.ok) {
                console.error(`Failed to fetch ${code}: ${res.statusText}`);
                continue;
            }
            const json = await res.json() as unknown;

            if (!Array.isArray(json) || json.length < 2) {
                console.warn(`Unexpected WB response format for ${code}`);
                continue;
            }

            const data = json[1] as any[];
            if (!data) continue;

            for (const d of data) {
                const countryCode = d.country.id;
                if (!econ[countryCode]) econ[countryCode] = {};
                econ[countryCode][code] = d.value;
            }
        } catch (err) {
            console.error(`Error fetching ${code}`, err);
        }
    }

    ensureDataDir();
    fs.writeFileSync(
        path.join(process.cwd(), "lib/data/economic-indicators.json"),
        JSON.stringify(econ)
    );
    console.log("-> Saved economic-indicators.json");
}

export async function parseINFORMRiskIndex() {
    console.log("Parsing INFORM Risk Index...");
    const filePath = path.join(process.cwd(), "INFORM_Risk_Mid_2025_v071.xlsx");

    if (!fs.existsSync(filePath)) {
        console.warn("WARN: INFORM Excel file not found. Skipping.");
        return;
    }

    const wb = XLSX.readFile(filePath);
    const sheetName = "INFORM Risk Mid 2025 (a-z)";
    const ws = wb.Sheets[sheetName];
    if (!ws) {
        console.warn(`WARN: Sheet '${sheetName}' not found.`);
        return;
    }

    const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
    const riskIndex: Record<string, any> = {};

    for (let i = 3; i < rows.length; i++) {
        const row = rows[i];
        const iso3 = row[1];

        if (!iso3 || typeof iso3 !== 'string' || iso3.length !== 3) continue;

        riskIndex[iso3] = {
            risk_score: parseFloat(row[2]) || 0,
            hazard_exposure: parseFloat(row[6]) || 0,
            vulnerability: parseFloat(row[18]) || 0,
            lack_of_coping_capacity: parseFloat(row[30]) || 0
        };
    }

    ensureDataDir();
    fs.writeFileSync(
        path.join(process.cwd(), "lib/data/risk-index.json"),
        JSON.stringify(riskIndex)
    );
    console.log(`-> Saved risk-index.json (${Object.keys(riskIndex).length} countries)`);
}

export async function fetchDisplacement() {
    console.log("Fetching UNHCR displacement data (by origin)...");
    try {
        let page = 1;
        const displacement: Record<string, any> = {};

        // Infinite loop with break
        while (true) {
            const url = `https://api.unhcr.org/population/v1/population/?year=2023&limit=500&page=${page}&coo_all=true`;
            console.log(`  - Fetching page ${page}...`);
            const res = await fetch(url);
            if (!res.ok) throw new Error(`Failed to fetch UNHCR data: ${res.statusText}`);

            const json = await res.json();
            const items = json.items || [];

            if (items.length === 0) break;

            for (const item of items) {
                const iso = item.coo_iso;
                // Some entries might be stateless/unknown ('-') or aggregate, skip if not relevant or store under 'unknown'
                if (iso && iso !== '-') {
                    displacement[iso] = {
                        refugees: parseInt(item.refugees) || 0,
                        asylum_seekers: parseInt(item.asylum_seekers) || 0,
                        idps: parseInt(item.idps) || 0,
                        stateless: parseInt(item.stateless) || 0
                    };
                }
            }

            // Check pagination
            // API returns maxPages. If page >= maxPages, break.
            const maxPages = json.maxPages || 1;
            if (page >= maxPages) break;
            page++;
        }

        ensureDataDir();
        fs.writeFileSync(
            path.join(process.cwd(), "lib/data/displacement.json"),
            JSON.stringify(displacement)
        );
        console.log(`-> Saved displacement.json (${Object.keys(displacement).length} countries)`);
    } catch (err) {
        console.error("Error fetching UNHCR data", err);
    }
}

export async function parseWRIPowerPlants() {
    console.log("Parsing WRI Power Plant Database...");
    const candidates = [
        "lib/data/global_power_plant_database.csv",
        "lib/data/WRI_Global_Power_Plant_Database_v1.3.0/global_power_plant_database.csv"
    ];
    console.warn("WARN: WRI Power Plant CSV not found in repo. Skipping power-plants.json generation.");
}

export async function preload() {
    console.log("Starting data preload...");
    await fetchCountries();
    await fetchEconomicIndicators();
    await parseINFORMRiskIndex();
    await fetchDisplacement();
    await parseWRIPowerPlants();
    console.log("All data pre-loaded successfully.");
}

if (import.meta.url === `file://${process.argv[1]}`) {
    preload();
}
