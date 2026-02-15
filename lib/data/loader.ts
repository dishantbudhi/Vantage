import fs from "fs/promises";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "lib/data");

// Type definitions matching our JSON structures
interface CountryFeature {
    type: "Feature";
    properties: {
        ISO_A3: string;
        NAME: string;
        // ... other props
    };
    geometry: any;
}
interface FeatureCollection {
    type: "FeatureCollection";
    features: CountryFeature[];
}

interface EconomicData {
    "NY.GDP.MKTP.CD"?: number;
    "SP.POP.TOTL"?: number;
    "SI.POV.DDAY"?: number;
    "AG.LND.ARBL.ZS"?: number;
    "EG.USE.PCAP.KG.OE"?: number;
    "NE.TRD.GNFS.ZS"?: number;
}

interface RiskData {
    risk_score: number;
    hazard_exposure: number;
    vulnerability: number;
    lack_of_coping_capacity: number;
}

interface DisplacementData {
    refugees: number;
    asylum_seekers: number;
    idps: number;
    stateless: number;
}

export interface CountryContext {
    name: string;
    iso3: string;
    economics: {
        gdp: number;
        population: number;
        poverty_rate: number;
        arable_land_pct: number;
        energy_use_per_capita: number;
        trade_pct_gdp: number;
    };
    risk: RiskData;
    displacement: DisplacementData;
}

// Cached data
let countriesCache: FeatureCollection | null = null;
let econCache: Record<string, EconomicData> | null = null;
let riskCache: Record<string, RiskData> | null = null;
let displacementCache: Record<string, DisplacementData> | null = null;

async function loadJSON<T>(filename: string): Promise<T> {
    const filePath = path.join(DATA_DIR, filename);
    try {
        const data = await fs.readFile(filePath, "utf-8");
        return JSON.parse(data) as T;
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to load data file "${filename}": ${message}`);
    }
}

export async function loadCountries() {
    if (!countriesCache) countriesCache = await loadJSON<FeatureCollection>("countries.json");
    return countriesCache;
}

export async function loadEconomicIndicators() {
    if (!econCache) econCache = await loadJSON<Record<string, EconomicData>>("economic-indicators.json");
    return econCache;
}

export async function loadRiskIndex() {
    if (!riskCache) riskCache = await loadJSON<Record<string, RiskData>>("risk-index.json");
    return riskCache;
}

export async function loadDisplacement() {
    if (!displacementCache) displacementCache = await loadJSON<Record<string, DisplacementData>>("displacement.json");
    return displacementCache;
}

export async function getCountryData(iso3: string): Promise<CountryContext | null> {
    const [countries, econ, risk, displacement] = await Promise.all([
        loadCountries(),
        loadEconomicIndicators(),
        loadRiskIndex(),
        loadDisplacement()
    ]);

    const feature = countries.features.find(f => f.properties.ISO_A3 === iso3);
    if (!feature) return null;

    const econData = econ[iso3] || {};
    const riskData = risk[iso3] || { risk_score: 0, hazard_exposure: 0, vulnerability: 0, lack_of_coping_capacity: 0 };
    const dispData = displacement[iso3] || { refugees: 0, asylum_seekers: 0, idps: 0, stateless: 0 };

    return {
        name: feature.properties.NAME || iso3,
        iso3,
        economics: {
            gdp: econData["NY.GDP.MKTP.CD"] || 0,
            population: econData["SP.POP.TOTL"] || 0,
            poverty_rate: econData["SI.POV.DDAY"] || 0,
            arable_land_pct: econData["AG.LND.ARBL.ZS"] || 0,
            energy_use_per_capita: econData["EG.USE.PCAP.KG.OE"] || 0,
            trade_pct_gdp: econData["NE.TRD.GNFS.ZS"] || 0,
        },
        risk: riskData,
        displacement: dispData,
    };
}

export async function getRegionContext(iso3Codes: string[]): Promise<string> {
    const summaries = await Promise.all(iso3Codes.map(async (iso) => {
        const data = await getCountryData(iso);
        if (!data) return `${iso}: No data available.`;

        return `${data.name} (${data.iso3}):
- GDP: $${data.economics.gdp.toLocaleString()}
- Pop: ${data.economics.population.toLocaleString()}
- Risk: ${data.risk.risk_score} (Hazard: ${data.risk.hazard_exposure}, Vuln: ${data.risk.vulnerability})
- Displacement: ${data.displacement.refugees} refugees, ${data.displacement.idps} IDPs`;
    }));

    return summaries.join("\n\n");
}
