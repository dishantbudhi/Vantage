import { describe, it, expect, vi, beforeEach } from "vitest";
import { searchGDELT } from "@/lib/gdelt";

// Mock Fetch
const fetchMock = vi.fn();
global.fetch = fetchMock;

describe("GDELT Client", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should return article titles on success", async () => {
        const mockResponse = {
            articles: [
                { title: "Suez Canal Blocked Again", url: "http://example.com/1" },
                { title: "Global Trade Impacts", url: "http://example.com/2" }
            ]
        };

        fetchMock.mockResolvedValueOnce({
            ok: true,
            json: async () => mockResponse
        });

        const results = await searchGDELT("Suez Canal");

        expect(results).toContain("Suez Canal Blocked Again");
        expect(results).toContain("Global Trade Impacts");
        expect(fetchMock).toHaveBeenCalledWith(
            expect.stringContaining("api.gdeltproject.org"),
            expect.objectContaining({ signal: expect.any(Object) }) // AbortSignal check difficult
        );
    });

    it("should handle API failure gracefully", async () => {
        fetchMock.mockResolvedValueOnce({ ok: false, statusText: "Server Error" });

        const results = await searchGDELT("Fail");
        expect(results).toContain("No recent news context available.");
    });

    it("should handle network exception (timeout)", async () => {
        fetchMock.mockRejectedValueOnce(new Error("AbortError"));

        const results = await searchGDELT("Timeout");
        expect(results).toContain("No recent news context available.");
    });
});
