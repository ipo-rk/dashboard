const { test, expect } = require('@playwright/test');

test.describe('Role-based UI visibility', () => {
  test('admin sees add controls on dashboard', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('auth_user', JSON.stringify({ email: 'tester+1@example.com', role: 'admin' }));
    });
    await page.goto('/dashboard.html');
    // Support both .btn-add (dashboard) or #addProductBtn (products manager)
    const addBtn = page.locator('.btn-add, #addProductBtn');
    await expect(addBtn).toBeVisible();
  });

  test('non-admin does not see add controls on dashboard', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('auth_user', JSON.stringify({ email: 'user@example.com', role: 'user' }));
    });
    await page.goto('/dashboard.html');
    const addBtn = page.locator('.btn-add, #addProductBtn');
    await expect(addBtn).toHaveCount(0);
  });
});
