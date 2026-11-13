import { test as base } from "@playwright/test";
import { installVirtualBrowserControls } from "./virtual-input";

/** All automated game tests use document-local controls, never native pointer lock/fullscreen. */
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.addInitScript(installVirtualBrowserControls);
    await use(page);
  },
});
export { expect } from "@playwright/test";
export type { Page } from "@playwright/test";
