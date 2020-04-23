const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./tests/e2e",
  timeout: 30000,
  expect: {
    timeout: 5000,
  },
  use: {
    baseURL: "http://127.0.0.1:43317",
    headless: true,
    launchOptions: {
      args: [
        "--use-fake-ui-for-media-stream",
        "--use-fake-device-for-media-stream",
      ],
    },
  },
  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --port 43317",
    url: "http://127.0.0.1:43317",
    timeout: 120000,
    reuseExistingServer: false,
  },
});
