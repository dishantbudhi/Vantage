import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import {
    fetchCountries,
    fetchEconomicIndicators,
    parseINFORMRiskIndex,
    fetchDisplacement,
    parseWRIPowerPlants,
    preload
} from "../scripts/preload-data";

// Mock global fetch
const fetchMock = vi.fn();
global.fetch = fetchMock;

// Spy on fs.writeFileSync to avoid writing real files during tests
const writeFileSyncSpy = vi.spyOn(fs, "writeFileSync").mockImplementation(() => { });
// Spy on console.log
const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => { });
const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => { });

describe("Data Preload Pipeline", () => {
    const DATA_DIR = path.resolve(__dirname, "../lib/data");

    beforeEach(() => {
        vi.clearAllMocks();
    });

    // 1.
    describe("fetchCountries", () => {
        it("should fetch GeoJSON and write to countries.json", async () => {
            const mockGeoJSON = { type: "FeatureCollection", features: [{ properties: { ISO_A3: "USA" } }] };
            fetchMock.mockResolvedValueOnce({
                ok: true,
                json: async () => mockGeoJSON,
            });

            await fetchCountries();

            expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("natural-earth-vector"));
            expect(writeFileSyncSpy).toHaveBeenCalledWith(
                expect.stringContaining("countries.json"),
                JSON.stringify(mockGeoJSON)
            );
        });
    });

    // 2.
    describe("fetchEconomicIndicators", () => {
        it("should fetch indicators and aggregate by country", async () => {
            fetchMock.mockImplementation((url) => {
                if (url.includes("NY.GDP.MKTP.CD")) {
                    return Promise.resolve({
                        ok: true,
                        json: async () => [null, [{ country: { id: "USA" }, value: 1000 }]],
                    });
                }
                return Promise.resolve({
                    ok: true,
                    json: async () => [null, []],
                });
            });

            await fetchEconomicIndicators();
            expect(fetchMock).toHaveBeenCalledTimes(6);
            expect(writeFileSyncSpy).toHaveBeenCalledWith(
                expect.stringContaining("economic-indicators.json"),
                expect.any(String)
            );
        });
    });

    // 3.
    describe("parseINFORMRiskIndex", () => {
        it("should parse the real Excel file and extract risk scores", async () => {
            await parseINFORMRiskIndex();
            expect(writeFileSyncSpy).toHaveBeenCalledWith(
                expect.stringContaining("risk-index.json"),
                expect.any(String)
            );
        });
    });

    // 4.
    describe("fetchDisplacement", () => {
        it("should fetch UNHCR data, paginate, and write map to displacement.json", async () => {
            const mockDataItem = {
                country_iso: "AFG", // Old property? No, check API response.
                // API returns: { year: 2023, coo_iso: "AFG", refugees: 500, ... }
                coo_iso: "AFG",
                refugees: 500,
                asylum_seekers: 100
            };

            const mockResponse = {
                items: [mockDataItem],
                maxPages: 1
            };

            fetchMock.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse,
            });

            await fetchDisplacement();

            expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("api.unhcr.org"));
            expect(writeFileSyncSpy).toHaveBeenCalledWith(
                expect.stringContaining("displacement.json"),
                expect.any(String)
            );

            const writtenData = JSON.parse(writeFileSyncSpy.mock.calls[0][1] as string);
            expect(writtenData.AFG).toBeDefined();
            expect(writtenData.AFG.refugees).toBe(500);
        });
    });

    // 5.
    describe("parseWRIPowerPlants", () => {
        it("should handle missing WRI file gracefully", async () => {
            await parseWRIPowerPlants();
        });
    });

    // 6.
    describe("preload function", () => {
        it("should run all functions in sequence", async () => {
            fetchMock.mockResolvedValue({
                ok: true,
                json: async () => [null, []] // Default logic
            });
            // Need specific override for displacement which expects {items:[], maxPages:1}
            fetchMock.mockImplementation((url) => {
                if (url.includes("unhcr")) return Promise.resolve({ ok: true, json: async () => ({ items: [], maxPages: 1 }) });
                if (url.includes("worldbank")) return Promise.resolve({ ok: true, json: async () => [null, []] });
                return Promise.resolve({ ok: true, json: async () => ({}) });
            });

            await preload();

            expect(fetchMock).toHaveBeenCalled();
            expect(consoleLogSpy).toHaveBeenCalledWith("All data pre-loaded successfully.");
        });
    });
});
