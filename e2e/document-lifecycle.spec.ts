import { expect, test } from '@playwright/test';

test('signup, sample document, finalize, report', async ({ page }) => {
  const email = `e2e_${Date.now()}@example.com`;
  const password = 'password123';

  await page.goto('/signup');
  await expect(page.getByRole('button', { name: 'Create account' })).toBeVisible();
  await page.locator('#signup-email').fill(email);
  await page.locator('#signup-password').fill(password);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('button', { name: 'Verify email' })).toBeVisible();
  await page.locator('#otp-code').fill('123456');
  await page.getByRole('button', { name: 'Verify email' }).click();
  await expect(page.getByRole('heading', { name: 'Documents' })).toBeVisible();

  await page.getByRole('button', { name: 'New document' }).click();
  await expect(page.getByRole('heading').first()).toBeVisible();

  await page.getByLabel('Title').fill('Sample quote');
  await page.getByLabel('Customer').fill('Acme Corp');
  await page.getByRole('button', { name: 'Save details' }).click();
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
      await page.getByLabel('Discount $').fill(opts.discountValue ?? '0');
    }
    await page.getByLabel('Tax %').fill(opts.tax ?? '0');
    await page.getByRole('button', { name: 'Add line' }).click();
    await expect(page.getByRole('cell', { name: opts.description })).toBeVisible();
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

  await page.getByRole('link', { name: 'Reports' }).click();
  await page.getByRole('button', { name: 'Run report' }).click();
  await expect(page.locator('.totals')).toBeVisible();
  await expect(page.locator('.totals strong').first()).not.toHaveText('0');
});
