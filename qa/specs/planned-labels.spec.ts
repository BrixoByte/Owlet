import { test, expect } from '../fixtures/collector';
import { openEmptyProject } from '../fixtures/helpers';

// QA-006: controls whose backend is not connected show one consistent notice and never
// pretend to work. The account menu items carry a "Preview" label.

test.describe('planned controls @planned', () => {
  test('account menu items are labelled Preview and show the notice', async ({ page }) => {
    await openEmptyProject(page);
    await page.locator('#btn-user').click();
    const profile = page.getByRole('menuitem', { name: /Profile/ });
    await expect(profile).toContainText('Preview');
    await profile.click();
    await expect(page.locator('.toast').filter({ hasText: 'Profiles: not connected yet.' })).toBeVisible();
  });
});
