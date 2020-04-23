const { test, expect } = require("@playwright/test");

test("app shell and detector status render", async ({ page, context }) => {
  await context.grantPermissions(["camera"], { origin: "http://127.0.0.1:43317" });

  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Browser Face Detection" })).toBeVisible();
  await expect(page.getByText("Camera:")).toBeVisible();
  await expect(page.getByText("Detector:")).toBeVisible();
  await expect(page.getByText("Loop:")).toBeVisible();

  const detectorLine = page.locator(".face-status p").nth(1);
  await expect(detectorLine).toContainText(/ready|loading/);
});
