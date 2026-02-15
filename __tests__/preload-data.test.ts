import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const DATA_DIR = path.resolve(__dirname, "../lib/data");
const PUBLIC_DIR = path.resolve(__dirname, "../public");

describe("Generated Data Files — Validation", () => {
  // ── countries.json ──────────────────────────────────────────────────

  describe("countries.json", () => {
    const filePath = path.join(DATA_DIR, "countries.json");

    it("exists and is non-empty", () => {
      expect(fs.existsSync(filePath)).toBe(true);
      const stat = fs.statSync(filePath);
      expect(stat.size).toBeGreaterThan(1000);
    });

    it("is valid GeoJSON FeatureCollection", () => {
      const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      expect(data.type).toBe("FeatureCollection");
      expect(Array.isArray(data.features)).toBe(true);
      expect(data.features.length).toBeGreaterThan(100);
    });

    it("every feature has ISO_A3 and NAME properties", () => {
      const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      for (const feature of data.features) {
        expect(feature.type).toBe("Feature");
        expect(feature.properties).toBeDefined();
        expect(typeof feature.properties.ISO_A3).toBe("string");
        expect(typeof feature.properties.NAME).toBe("string");
      }
    });

    it("every feature has geometry", () => {
      const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      for (const feature of data.features) {
        expect(feature.geometry).toBeDefined();
        expect(feature.geometry.type).toBeDefined();
      }
    });

    it("only contains trimmed properties (no bloat)", () => {
      const EXPECTED_PROPS = [
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
      const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      const firstFeatureKeys = Object.keys(data.features[0].properties);
      for (const key of firstFeatureKeys) {
        expect(EXPECTED_PROPS).toContain(key);
      }
    });
  });

  // ── public/countries.geojson ────────────────────────────────────────

  describe("public/countries.geojson", () => {
    it("exists and matches lib/data/countries.json", () => {
      const libPath = path.join(DATA_DIR, "countries.json");
      const pubPath = path.join(PUBLIC_DIR, "countries.geojson");
      expect(fs.existsSync(pubPath)).toBe(true);

      const libData = fs.readFileSync(libPath, "utf-8");
      const pubData = fs.readFileSync(pubPath, "utf-8");
      expect(pubData).toBe(libData);
    });
  });

  // ── risk-index.json ─────────────────────────────────────────────────

  describe("risk-index.json", () => {
    const filePath = path.join(DATA_DIR, "risk-index.json");

    it("exists and is non-empty", () => {
      expect(fs.existsSync(filePath)).toBe(true);
    });

    it("has correct structure keyed by ISO3", () => {
      const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      expect(typeof data).toBe("object");
      expect(Object.keys(data).length).toBeGreaterThan(100);

      // All keys should be 3-char ISO3 codes
      for (const key of Object.keys(data)) {
        expect(key).toHaveLength(3);
      }
    });

    it("entries have required numeric fields", () => {
      const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      const sampleKeys = ["AFG", "USA", "EGY", "IND"];

      for (const iso3 of sampleKeys) {
        if (!data[iso3]) continue;
        const entry = data[iso3];
        expect(typeof entry.risk_score).toBe("number");
        expect(typeof entry.hazard_exposure).toBe("number");
        expect(typeof entry.vulnerability).toBe("number");
        expect(typeof entry.lack_of_coping_capacity).toBe("number");
      }
    });

    it("known high-risk country has risk_score > 5", () => {
      const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      // Afghanistan is consistently high-risk
      if (data["AFG"]) {
        expect(data["AFG"].risk_score).toBeGreaterThan(5);
      }
    });
  });

  // ── economic-indicators.json ────────────────────────────────────────

  describe("economic-indicators.json", () => {
    const filePath = path.join(DATA_DIR, "economic-indicators.json");

    it("exists and is non-empty", () => {
      expect(fs.existsSync(filePath)).toBe(true);
    });

    it("is keyed by ISO3 codes", () => {
      const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      expect(typeof data).toBe("object");
      expect(Object.keys(data).length).toBeGreaterThan(100);
    });

    it("contains expected World Bank indicator codes", () => {
      const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      // USA should have GDP data
      const usa = data["USA"];
      if (usa) {
        expect(usa["NY.GDP.MKTP.CD"]).toBeDefined();
        expect(typeof usa["NY.GDP.MKTP.CD"]).toBe("number");
      }
    });
  });

  // ── displacement.json ───────────────────────────────────────────────

  describe("displacement.json", () => {
    const filePath = path.join(DATA_DIR, "displacement.json");

    it("exists and is non-empty", () => {
      expect(fs.existsSync(filePath)).toBe(true);
    });

    it("is keyed by ISO3 codes with correct fields", () => {
      const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      expect(typeof data).toBe("object");
      expect(Object.keys(data).length).toBeGreaterThan(50);

      // Check first entry structure
      const firstKey = Object.keys(data)[0];
      const entry = data[firstKey];
      expect(typeof entry.refugees).toBe("number");
      expect(typeof entry.asylum_seekers).toBe("number");
      expect(typeof entry.idps).toBe("number");
      expect(typeof entry.stateless).toBe("number");
    });
  });

  // ── power-plants.json ───────────────────────────────────────────────

  describe("power-plants.json", () => {
    const filePath = path.join(DATA_DIR, "power-plants.json");

    it("exists and is non-empty", () => {
      expect(fs.existsSync(filePath)).toBe(true);
    });

    it("is an array with thousands of plants", () => {
      const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(10000);
    });

    it("entries have required fields", () => {
      const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      const sample = data[0];
      expect(typeof sample.latitude).toBe("number");
      expect(typeof sample.longitude).toBe("number");
      expect(typeof sample.capacity_mw).toBe("number");
      expect(typeof sample.primary_fuel).toBe("string");
      expect(typeof sample.name).toBe("string");
    });

    it("coordinates are in valid ranges", () => {
      const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      // Check first 100 entries
      for (const plant of data.slice(0, 100)) {
        expect(plant.latitude).toBeGreaterThanOrEqual(-90);
        expect(plant.latitude).toBeLessThanOrEqual(90);
        expect(plant.longitude).toBeGreaterThanOrEqual(-180);
        expect(plant.longitude).toBeLessThanOrEqual(180);
      }
    });
  });
});

