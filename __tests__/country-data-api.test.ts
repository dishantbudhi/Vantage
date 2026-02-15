import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the loader module before importing the route handler
const mockGetCountryData = vi.fn();

vi.mock("@/lib/data/loader", () => ({
  getCountryData: (...args: unknown[]) => mockGetCountryData(...args),
}));

// We test the route handler directly by calling the GET function
// with a mock NextRequest

function createMockRequest(url: string) {
  return {
    nextUrl: new URL(url, "http://localhost:3000"),
  } as any;
}

describe("GET /api/country-data", () => {
  let GET: (req: any) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Dynamically import to get fresh module with mocks applied
    const mod = await import("@/app/api/country-data/route");
    GET = mod.GET;
  });

  it("returns 400 when iso3 param is missing", async () => {
    const req = createMockRequest("http://localhost:3000/api/country-data");
    const res = await GET(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("iso3");
  });

  it("returns 400 when iso3 is not 3 characters", async () => {
    const req = createMockRequest(
      "http://localhost:3000/api/country-data?iso3=US"
    );
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("returns 404 when country is not found", async () => {
    mockGetCountryData.mockResolvedValue(null);

    const req = createMockRequest(
      "http://localhost:3000/api/country-data?iso3=XYZ"
    );
    const res = await GET(req);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toContain("XYZ");
  });

  it("returns 200 with CountryContext for valid ISO3", async () => {
    const mockData = {
      name: "Egypt",
      iso3: "EGY",
      economics: {
        gdp: 400000000000,
        population: 102000000,
        poverty_rate: 3.5,
        arable_land_pct: 3.6,
        energy_use_per_capita: 900,
        trade_pct_gdp: 44.2,
      },
      risk: {
        risk_score: 4.8,
        hazard_exposure: 5.2,
        vulnerability: 4.1,
        lack_of_coping_capacity: 5.3,
      },
      displacement: {
        refugees: 300000,
        asylum_seekers: 50000,
        idps: 0,
        stateless: 0,
      },
    };

    mockGetCountryData.mockResolvedValue(mockData);

    const req = createMockRequest(
      "http://localhost:3000/api/country-data?iso3=EGY"
    );
    const res = await GET(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.name).toBe("Egypt");
    expect(body.iso3).toBe("EGY");
    expect(body.economics.gdp).toBe(400000000000);
    expect(body.risk.risk_score).toBe(4.8);
    expect(body.displacement.refugees).toBe(300000);
  });

  it("uppercases the iso3 parameter", async () => {
    mockGetCountryData.mockResolvedValue({
      name: "Egypt",
      iso3: "EGY",
      economics: { gdp: 0, population: 0, poverty_rate: 0, arable_land_pct: 0, energy_use_per_capita: 0, trade_pct_gdp: 0 },
      risk: { risk_score: 0, hazard_exposure: 0, vulnerability: 0, lack_of_coping_capacity: 0 },
      displacement: { refugees: 0, asylum_seekers: 0, idps: 0, stateless: 0 },
    });

    const req = createMockRequest(
      "http://localhost:3000/api/country-data?iso3=egy"
    );
    await GET(req);
    expect(mockGetCountryData).toHaveBeenCalledWith("EGY");
  });
});

