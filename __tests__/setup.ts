import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// Mock next/font/google — it's a Next.js build-time API, not available in vitest
vi.mock("next/font/google", () => ({
    Inter: () => ({
        className: "inter-mock",
        variable: "--font-inter",
        style: { fontFamily: "Inter" },
    }),
}));
