import { expect, type Page } from '@playwright/test';

// Shared UI helpers for the specs. Every spec uses these so a fix lands everywhere.

// Open a fresh project from the Welcome screen ("New project" = starter files).
export async function openEmptyProject(page: Page) {
  await page.goto('/');
  await page.getByTestId('welcome').getByTestId('welcome-card').filter({ hasText: /New project/ }).click();
}

// Start an empty project whose only file is `path` (Welcome "New file" card).
// Use this when a test needs a specific file name; "New project" would add starter files.
export async function openProjectWithFile(page: Page, path: string) {
  await page.goto('/');
  await page.getByTestId('welcome').getByTestId('welcome-card').filter({ hasText: /New file/ }).click();
  const dialog = page.getByTestId('dialog').filter({ has: page.getByRole('textbox') });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('textbox').fill(path);
  await dialog.getByRole('textbox').press('Enter');
  await expect(dialog).toBeHidden();
}

// Create a file through the Explorer's New file action and the path prompt.
// The Explorer rail button toggles the panel, so it is only clicked when not already pressed.
export async function createFile(page: Page, path: string) {
  const rail = page.locator('button.rail-btn[data-view="explorer"]');
  if ((await rail.getAttribute('aria-pressed')) !== 'true') await rail.click();
  await expect(page.getByTestId('file-tree')).toBeVisible();
  await page.getByRole('button', { name: 'New file' }).click();
  const dialog = page.getByTestId('dialog').filter({ has: page.getByRole('textbox') });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('textbox').fill(path);
  await dialog.getByRole('textbox').press('Enter');
  await expect(dialog).toBeHidden();
}
