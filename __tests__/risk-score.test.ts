import { describe, it, expect } from "vitest";
import { computeCompoundRiskScore } from "@/lib/risk-score";

describe("computeCompoundRiskScore", () => {
    // Spec §11: "Determine weight vector (average if multiple categories)"
    // Example: Suez Canal blocked - weights are averaged across all categories

    // Test Case 1: Suez Example
    // Categories: ["geopolitical", "economic"] -> weights averaged
    it("should calculate correctly for Suez scenario (averaged weights)", () => {
        const scores = {
            geopolitics: 7,
            economy: 9,
            food: 8,
            infrastructure: 6,
            civilian: 8
        };
        const categories = ["geopolitical", "economic"];

        // Manual calc with averaged weights:
        // Geopolitical: G=0.30, E=0.20, F=0.15, I=0.15, C=0.20
        // Economic: G=0.15, E=0.35, F=0.15, I=0.15, C=0.20
        // Averaged: G=0.225, E=0.275, F=0.15, I=0.15, C=0.20
        // Weighted Sum = (7*0.225) + (9*0.275) + (8*0.15) + (6*0.15) + (8*0.20)
        // = 1.575 + 2.475 + 1.2 + 0.9 + 1.6 = 7.75

        // High severity domains (>= 7): G(7), E(9), F(8), C(8). Count = 4.

        // Cascade Multiplier = 1.0 + (4 - 1) * 0.1 = 1.3

        // Result = 7.75 * 1.3 * 10 = 100.75 -> round -> 101, clamped to 100

        const score = computeCompoundRiskScore(scores, categories);
        expect(score).toBe(100);
    });

    // Test Case 2: Low severity
    it("should return low score for minor event", () => {
        const scores = {
            geopolitics: 2,
            economy: 2,
            food: 1,
            infrastructure: 1,
            civilian: 1
        };
        const categories = ["climate"];
        // Weights for Climate: G=0.1, E=0.2, F=0.25, I=0.2, C=0.25
        // Sum = 0.2 + 0.4 + 0.25 + 0.2 + 0.25 = 1.3
        // High severity (>=7) = 0.
        // Multiplier = 1.0 + (0 - 1)*0.1 = 0.9? No, min 1.0.
        // So 1.0.
        // Result = 1.3 * 1.0 * 10 = 13.

        const score = computeCompoundRiskScore(scores, categories);
        expect(score).toBe(13);
    });

    // Test Case 3: Clamping
    it("should clamp score to 100", () => {
        const scores = {
            geopolitics: 10,
            economy: 10,
            food: 10,
            infrastructure: 10,
            civilian: 10
        };
        const categories = ["geopolitical"];
        // Sum = 10.
        // High = 5.
        // Multiplier = 1.0 + (5-1)*0.1 = 1.4.
        // Result = 10 * 1.4 * 10 = 140.
        // Clamped = 100.

        const score = computeCompoundRiskScore(scores, categories);
        expect(score).toBe(100);
    });

    // Test Case 4: All zeros
    it("should return 0 for all-zero scores", () => {
        const scores = {
            geopolitics: 0,
            economy: 0,
            food: 0,
            infrastructure: 0,
            civilian: 0
        };
        const categories = ["climate"];
        const score = computeCompoundRiskScore(scores, categories);
        expect(score).toBe(0);
    });

    // Test Case 5: Single category
    it("should use exact weight vector for single category", () => {
        const scores = {
            geopolitics: 5,
            economy: 5,
            food: 5,
            infrastructure: 5,
            civilian: 5
        };
        const categories = ["health"];
        // Health weights: G=0.15, E=0.25, F=0.10, I=0.10, C=0.40
        // wait, let me check actual weights from the code:
        // health: G=0.15, E=0.25, F=0.10, I=0.10, C=0.40
        // Actually from risk-score.ts: health: { geopolitics: 0.15, economy: 0.25, food: 0.10, infrastructure: 0.10, civilian: 0.40 }
        // weighted = 5*0.15 + 5*0.25 + 5*0.10 + 5*0.10 + 5*0.40 = 5*1.0 = 5.0
        // high severity (>=7) = 0
        // multiplier = 1.0
        // result = 5.0 * 1.0 * 10 = 50

        const score = computeCompoundRiskScore(scores, categories);
        expect(score).toBe(50);
    });

    // Test Case 6: Unknown category should throw
    it("should throw for unknown event categories", () => {
        const scores = {
            geopolitics: 5,
            economy: 5,
            food: 5,
            infrastructure: 5,
            civilian: 5
        };
        expect(() => computeCompoundRiskScore(scores, ["alien_invasion"])).toThrow();
    });

    // Test Case 7: Empty categories falls back to all categories averaged
    it("should handle empty categories with default weights", () => {
        const scores = {
            geopolitics: 5,
            economy: 5,
            food: 5,
            infrastructure: 5,
            civilian: 5
        };
        // Empty array triggers the recursive call with all 5 categories
        const score = computeCompoundRiskScore(scores, []);
        // All 5 scores are 5, all weight vectors average to 0.2 each
        // weighted = 5*0.2*5 = 5.0 (since sum of all weights = 1.0)
        // multiplier = 1.0 (no domains >= 7)
        // result = 5.0 * 1.0 * 10 = 50
        expect(score).toBe(50);
    });

    // Test Case 8: Cascade multiplier boundary (exactly 1 domain at 7)
    it("should not apply cascade for single high-severity domain", () => {
        const scores = {
            geopolitics: 7,
            economy: 3,
            food: 2,
            infrastructure: 2,
            civilian: 2
        };
        const categories = ["geopolitical"];
        // Geopolitical weights: G=0.30, E=0.20, F=0.15, I=0.15, C=0.20
        // weighted = 7*0.30 + 3*0.20 + 2*0.15 + 2*0.15 + 2*0.20 = 2.1+0.6+0.3+0.3+0.4 = 3.7
        // high severity (>=7) = 1 (only G)
        // multiplier = 1.0 (no increase for just 1 domain)
        // result = 3.7 * 1.0 * 10 = 37

        const score = computeCompoundRiskScore(scores, categories);
        expect(score).toBe(37);
    });

    // Test Case 9: Multiple categories averaging
    it("should average weights for multiple categories", () => {
        const scores = {
            geopolitics: 5,
            economy: 5,
            food: 5,
            infrastructure: 5,
            civilian: 5
        };
        const categories = ["geopolitical", "climate"];
        // Averaged weights of geopolitical + climate
        // G: (0.30+0.10)/2=0.20, E: (0.20+0.20)/2=0.20, F: (0.15+0.25)/2=0.20
        // I: (0.15+0.20)/2=0.175, C: (0.20+0.25)/2=0.225
        // weighted = 5*0.20 + 5*0.20 + 5*0.20 + 5*0.175 + 5*0.225 = 5.0
        // result = 50

        const score = computeCompoundRiskScore(scores, categories);
        expect(score).toBe(50);
    });
});
