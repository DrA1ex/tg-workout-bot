import {defineConfig, devices} from "@playwright/test";

const port = Number(process.env.WEB_E2E_PORT || 4173);
const baseURL = `http://127.0.0.1:${port}`;
const executablePath = String(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || "").trim();

export default defineConfig({
    testDir: "./e2e",
    timeout: 45_000,
    expect: {timeout: 10_000},
    fullyParallel: false,
    workers: 1,
    retries: process.env.CI ? 2 : 0,
    reporter: [
        ["line"],
        ["html", {open: "never", outputFolder: "playwright-report"}],
    ],
    outputDir: "test-results/e2e",
    use: {
        ...devices["Desktop Chrome"],
        baseURL,
        serviceWorkers: "block",
        trace: "retain-on-failure",
        screenshot: "only-on-failure",
        video: process.env.PLAYWRIGHT_VIDEO === "true" ? "retain-on-failure" : "off",
        launchOptions: executablePath ? {executablePath} : {},
    },
    webServer: {
        command: "node scripts/start-web-e2e.js",
        url: `${baseURL}/api/auth/config`,
        timeout: 120_000,
        reuseExistingServer: false,
        env: {
            WEB_E2E_PORT: String(port),
        },
    },
});
