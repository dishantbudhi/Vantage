import { describe, it, expect, vi, beforeEach } from "vitest";
import { getCountryData, getRegionContext, loadCountries } from "@/lib/data/loader";

// Mock data for factory
const mockData = {
    countries: JSON.stringify({
        type: "FeatureCollection",
        features: [
            { type: "Feature", properties: { ISO_A3: "USA", NAME: "United States" }, geometry: {} },
            { type: "Feature", properties: { ISO_A3: "EGY", NAME: "Egypt" }, geometry: {} }
        ]
    }),
    econ: JSON.stringify({
        "USA": { "NY.GDP.MKTP.CD": 23000000000000, "SP.POP.TOTL": 331000000 },
        "EGY": { "NY.GDP.MKTP.CD": 400000000000, "SP.POP.TOTL": 102000000 }
    }),
    risk: JSON.stringify({
        "USA": { risk_score: 2.1, hazard_exposure: 3.0, vulnerability: 1.5, lack_of_coping_capacity: 1.8 },
        "EGY": { risk_score: 4.8, hazard_exposure: 5.2, vulnerability: 4.1, lack_of_coping_capacity: 5.3 }
    }),
    disp: JSON.stringify({
        "USA": { refugees: 100, asylum_seekers: 50 },
        "EGY": { refugees: 300000, asylum_seekers: 50000 }
    })
};

vi.mock("fs/promises", () => {
    return {
        default: {
            readFile: vi.fn().mockImplementation(async (path: string) => {
                if (path.includes("countries.json")) return mockData.countries;
                if (path.includes("economic-indicators.json")) return mockData.econ;
                if (path.includes("risk-index.json")) return mockData.risk;
                if (path.includes("displacement.json")) return mockData.disp;
                if (path.includes("power-plants.json")) return "[]";
                throw new Error(`Unexpected file read: ${path}`);
            })
        }
    };
});

describe("Data Loader", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should load aggregated country data correctly", async () => {
        const data = await getCountryData("EGY");

        expect(data?.name).toBe("Egypt");
        expect(data?.iso3).toBe("EGY");
        expect(data?.economics.gdp).toBe(400000000000);
        expect(data?.risk.risk_score).toBe(4.8);
        expect(data?.displacement.refugees).toBe(300000);
    });

    it("should return null for unknown ISO3", async () => {
        const data = await getCountryData("XYZ");
        expect(data).toBeNull();
    });

    it("should generate region context for prompts", async () => {
        const context = await getRegionContext(["USA", "EGY"]);

        expect(context).toContain("United States (USA)");
        expect(context).toContain("Egypt (EGY)");
        expect(context).toContain("GDP: $23,000,000,000,000"); // Matches locale string format
        expect(context).toContain("Risk: 4.8");
    });
});
