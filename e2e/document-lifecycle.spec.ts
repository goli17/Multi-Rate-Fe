import { expect, test } from '@playwright/test';

test('signup, sample document, finalize, report', async ({ page }) => {
  const email = `e2e_${Date.now()}@example.com`;
  const password = 'password123';

  await page.goto('/signup');
  await expect(page.getByRole('button', { name: 'Create account' })).toBeVisible();
  await page.locator('#signup-email').fill(email);
  await page.locator('#signup-password').fill(password);
  await page.getByRole('button', { name: 'Create account' }).click();

  const verifyBtn = page.getByRole('button', { name: 'Verify email' });
  const documentsHeading = page.getByRole('heading', {
    name: 'Documents',
    exact: true,
  });
  await expect(verifyBtn.or(documentsHeading)).toBeVisible({ timeout: 45000 });
  if (await verifyBtn.isVisible()) {
    await page.locator('#otp-code').fill('123456');
    await verifyBtn.click();
  }
  await expect(documentsHeading).toBeVisible({ timeout: 20000 });

  await page.getByRole('button', { name: /new document|create your first/i }).first().click();
  await expect(page.getByRole('heading', { name: /new draft/i })).toBeVisible();
  await page.getByPlaceholder('e.g. Q3 pricing proposal').fill('Sample quote');
  await page.getByPlaceholder('e.g. Acme Corp').fill('Acme Corp');
  await page.locator('.create-panel input[type="date"]').fill('2026-08-09');
  await page.locator('.create-panel select').selectOption('USD');
  await page.getByRole('button', { name: /create draft/i }).click();
  await expect(page).toHaveURL(/\/documents\/[0-9a-f-]+/i, { timeout: 15000 });
  await expect(page.getByRole('heading', { name: 'Sample quote' })).toBeVisible();

  async function addLine(opts: {
    description: string;
    qty: string;
    price: string;
    discountType?: string;
    discountValue?: string;
    tax?: string;
  }) {
    await page.getByLabel('Description').fill(opts.description);
    await page.getByLabel('Quantity').fill(opts.qty);
    await page.getByLabel('Unit price').fill(opts.price);
    await page.getByLabel('Discount type').selectOption(opts.discountType ?? 'none');
    if (opts.discountType === 'percent') {
      await page.getByLabel('Discount %').fill(opts.discountValue ?? '0');
    }
    if (opts.discountType === 'fixed') {
      await page.getByLabel('Discount amount').fill(opts.discountValue ?? '0');
    }
    await page.getByLabel('Tax % (optional)').fill(opts.tax ?? '0');
    await page.getByRole('button', { name: 'Add line' }).click();
    await expect(page.getByText(opts.description, { exact: true }).first()).toBeVisible({
      timeout: 10000,
    });
  }

  await addLine({
    description: 'Widget A',
    qty: '2',
    price: '100',
    discountType: 'percent',
    discountValue: '10',
    tax: '5',
  });
  await addLine({
    description: 'Widget B',
    qty: '1',
    price: '50',
    tax: '5',
  });
  await addLine({
    description: 'Service fee',
    qty: '1',
    price: '200',
    discountType: 'fixed',
    discountValue: '20',
    tax: '0',
  });

  await expect(page.getByText('$421.50').first()).toBeVisible();

  await page.getByRole('button', { name: 'Finalize' }).click();
  await expect(page.getByText('Finalized documents are read-only.')).toBeVisible();

  await page.getByLabel('Main').getByRole('link', { name: 'Documents' }).click();
  await expect(page.locator('.docs-card').filter({ hasText: 'Sample quote' })).toBeVisible();
  await expect(
    page.locator('.docs-card').filter({ hasText: 'Sample quote' }).getByLabel(/view/i),
  ).toBeVisible();

  await page.getByLabel('Main').getByRole('link', { name: 'Reports' }).click();
  await page.getByRole('button', { name: 'Run report' }).click();
  await expect(page.locator('.report-sheet')).toBeVisible();
  await expect(page.locator('.currency-totals-table')).toBeVisible();
  await expect(page.getByText('$421.50').first()).toBeVisible();
});
