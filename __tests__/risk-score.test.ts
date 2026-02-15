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
});
