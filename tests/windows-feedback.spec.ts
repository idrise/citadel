import { expect, test } from "./fixtures";
import { openGame, openSettings, play, finishIntroduction, pause } from "./helpers";
test("guide defaults off, persists an explicit serve-only choice and desktop Pause stays hidden", async ({
  page,
}, info) => {
  await openGame(page, false);
  await openSettings(page);
  await expect(page.getByRole("button", { name: "Ball guide: Off", exact: true })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await page.getByRole("button", { name: "Ball guide: Off", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Ball guide: Serve direction only", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.screenshot({ path: info.outputPath("desktop-settings-guide.png") });
  await page.reload();
  await openSettings(page);
  await expect(
    page.getByRole("button", { name: "Ball guide: Serve direction only", exact: true }),
  ).toBeVisible();
  await play(page);
  await finishIntroduction(page);
  await expect(page.getByRole("button", { name: "Pause", exact: true })).toBeHidden();
  await page.screenshot({ path: info.outputPath("desktop-current-level.png") });
  await pause(page);
});
