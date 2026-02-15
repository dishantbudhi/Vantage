import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
    plugins: [react()],
    test: {
        environment: "node",
        globals: true,
        setupFiles: ["./__tests__/setup.ts"],
        include: ["__tests__/**/*.test.ts", "__tests__/**/*.test.tsx"],
        environmentMatchGlobs: [
            // Use happy-dom for component/DOM tests (.tsx) and shell test
            ["**/*.test.tsx", "happy-dom"],
            ["**/app-shell*", "happy-dom"],
        ],
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./"),
        },
    },
});
