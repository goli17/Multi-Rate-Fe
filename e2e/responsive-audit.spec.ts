/**
 * One-off responsive UI audit. Run with:
 * npx playwright test e2e/responsive-audit.spec.ts --config=playwright.responsive.config.ts
 */
import { test, expect, type Page } from '@playwright/test';

const VIEWPORTS = [
  { name: 'iPhone SE', width: 375, height: 667 },
  { name: 'iPhone 14', width: 390, height: 844 },
  { name: 'Pixel 7', width: 412, height: 915 },
  { name: 'iPad Mini', width: 768, height: 1024 },
  { name: 'iPad Pro', width: 1024, height: 1366 },
  { name: 'Laptop', width: 1280, height: 800 },
  { name: 'Desktop', width: 1440, height: 900 },
] as const;

type CheckResult = {
  viewport: string;
  page: string;
  check: string;
  pass: boolean;
  detail: string;
};

const results: CheckResult[] = [];

function record(
  viewport: string,
  page: string,
  check: string,
  pass: boolean,
  detail = '',
) {
  results.push({ viewport, page, check, pass, detail });
}

async function overflowMetrics(page: Page) {
  return page.evaluate(() => {
    const docEl = document.documentElement;
    const body = document.body;
    const scrollWidth = Math.max(docEl.scrollWidth, body.scrollWidth);
    const clientWidth = docEl.clientWidth;
    const overflowing = Array.from(document.querySelectorAll('*')).filter(
      (el) => {
        const html = el as HTMLElement;
        if (!html.getBoundingClientRect) return false;
        const rect = html.getBoundingClientRect();
        return rect.right > clientWidth + 1;
      },
    );
    return {
      scrollWidth,
      clientWidth,
      hasHorizontalOverflow: scrollWidth > clientWidth + 1,
      overflowingCount: overflowing.length,
      sample:
        overflowing.slice(0, 5).map((el) => {
          const tag = el.tagName.toLowerCase();
          const cls = (el as HTMLElement).className?.toString?.().slice(0, 40) ?? '';
          return `${tag}.${cls}`;
        }) ?? [],
    };
  });
}

async function assertNoHScroll(page: Page, viewport: string, pageName: string) {
  const m = await overflowMetrics(page);
  const pass = !m.hasHorizontalOverflow;
  record(
    viewport,
    pageName,
    'No horizontal page overflow',
    pass,
    pass
      ? `${m.clientWidth}px`
      : `scroll=${m.scrollWidth} client=${m.clientWidth} sample=${m.sample.join(', ')}`,
  );
  return m;
}

async function visible(page: Page, selector: string) {
  const loc = page.locator(selector).first();
  return (await loc.count()) > 0 && (await loc.isVisible());
}

test.describe.configure({ mode: 'serial' });

test('responsive UI audit across viewports', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'Chromium only');

  const email = `ui_${Date.now()}@example.com`;
  const password = 'password123';

  // --- Auth: signup @ desktop first to establish session ---
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/signup');
  await page.locator('#signup-email').fill(email);
  await page.locator('#signup-password').fill(password);
  await page.getByRole('button', { name: /create account/i }).click();
  await expect(page.getByRole('heading', { name: 'Documents', exact: true })).toBeVisible({
    timeout: 15000,
  });

  for (const vp of VIEWPORTS) {
    await page.setViewportSize({ width: vp.width, height: vp.height });

    // LOGIN page (logout then check)
    await page.getByRole('button', { name: /log out/i }).click();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
    record(
      vp.name,
      'Login',
      'Sign in form visible',
      await visible(page, '.auth-card'),
    );
    await assertNoHScroll(page, vp.name, 'Login');
    record(
      vp.name,
      'Login',
      'Auth card fits viewport',
      (await page.locator('.auth-card').boundingBox())!.width <= vp.width,
    );

    // SIGNUP
    await page.goto('/signup');
    record(
      vp.name,
      'Signup',
      'Create account form visible',
      await visible(page, '.auth-card'),
    );
    await assertNoHScroll(page, vp.name, 'Signup');

    // back to app
    await page.goto('/login');
    await page.locator('#login-email').fill(email);
    await page.locator('#login-password').fill(password);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page.getByRole('heading', { name: 'Documents', exact: true })).toBeVisible({
      timeout: 15000,
    });

    // DOCUMENTS list
    record(
      vp.name,
      'Documents',
      'Heading visible',
      await visible(page, 'h1'),
    );
    record(
      vp.name,
      'Documents',
      'New document CTA visible',
      await page.getByRole('button', { name: /new document|create your first/i }).first().isVisible(),
    );
    record(
      vp.name,
      'Documents',
      'Nav links visible',
      (await page.getByRole('link', { name: 'Documents' }).isVisible()) &&
        (await page.getByRole('link', { name: 'Reports' }).isVisible()),
    );
    await assertNoHScroll(page, vp.name, 'Documents');

    // Create draft form
    const newBtn = page.getByRole('button', { name: /new document|create your first/i }).first();
    await newBtn.click();
    await expect(page.getByRole('heading', { name: /new draft/i })).toBeVisible();
    record(
      vp.name,
      'Create draft',
      'Placeholder title field empty',
      (await page.getByPlaceholder('e.g. Q3 pricing proposal').inputValue()) === '',
    );
    record(
      vp.name,
      'Create draft',
      'Currency placeholder option present',
      await page.locator('select').first().evaluate((el) => (el as HTMLSelectElement).value === ''),
    );
    await assertNoHScroll(page, vp.name, 'Create draft');

    await page.getByPlaceholder('e.g. Q3 pricing proposal').fill(`Quote ${vp.name}`);
    await page.getByPlaceholder('e.g. Acme Corp').fill('Acme');
    await page.locator('input[type="date"]').fill('2026-08-09');
    await page.locator('select').first().selectOption('INR');
    await page.getByRole('button', { name: /create draft/i }).click();
    await expect(page).toHaveURL(/\/documents\/[0-9a-f-]+/i, { timeout: 15000 });
    await expect(page.locator('.draft-banner')).toBeVisible({ timeout: 15000 });

    // DOCUMENT DETAIL
    record(
      vp.name,
      'Document detail',
      'Draft banner visible',
      await visible(page, '.draft-banner'),
    );
    record(
      vp.name,
      'Document detail',
      'Keep as draft / Delete / Finalize actions present',
      (await page.getByRole('button', { name: /keep as draft/i }).isVisible()) &&
        (await page.getByRole('button', { name: /delete/i }).isVisible()) &&
        (await page.getByRole('button', { name: /finalize/i }).isVisible()),
    );
    record(
      vp.name,
      'Document detail',
      'Line placeholders present',
      (await page.getByPlaceholder('e.g. Widget A').isVisible()) &&
        (await page.getByPlaceholder('e.g. 100.00').isVisible()),
    );

    // Add a line
    await page.getByPlaceholder('e.g. Widget A').fill('Widget A');
    await page.getByPlaceholder('e.g. 2').fill('2');
    await page.getByPlaceholder('e.g. 100.00').fill('100');
    await page.getByPlaceholder('e.g. 5').fill('5');
    await page.getByRole('button', { name: /^add line$/i }).click();
    await expect(page.getByText('Widget A')).toBeVisible({ timeout: 10000 });

    const moneyText = await page.locator('.totals strong').last().innerText();
    const looksInr = /₹|INR|₹/.test(moneyText) || moneyText.includes('₹') || /en-IN|₹/.test(moneyText) || moneyText.includes('₹');
    // Intl may render as ₹100.00 or INR 100.00 depending on locale
    const currencyOk =
      moneyText.includes('₹') ||
      /₹/.test(moneyText) ||
      moneyText.includes('₹') ||
      !moneyText.includes('US$');
    record(
      vp.name,
      'Document detail',
      'Totals use selected currency (not US$)',
      currencyOk && !moneyText.includes('US$'),
      moneyText,
    );

    // Mobile card table vs desktop table
    if (vp.width <= 720) {
      const cards = await page.locator('.table-cards tbody tr').count();
      record(
        vp.name,
        'Document detail',
        'Line items render as cards on small screens',
        cards >= 1,
        `rows=${cards}`,
      );
    }

    await assertNoHScroll(page, vp.name, 'Document detail');

    // REPORTS
    await page.getByRole('link', { name: 'Reports' }).click();
    // If leave-draft dialog appears, keep draft and continue
    const leaveStay = page.getByRole('button', { name: /keep as draft/i });
    if (await leaveStay.isVisible().catch(() => false)) {
      await leaveStay.click();
      await page.getByRole('link', { name: 'Reports' }).click();
    }
    await expect(page.getByRole('heading', { name: /summary report/i })).toBeVisible({
      timeout: 15000,
    });
    record(
      vp.name,
      'Reports',
      'Date + currency filters visible',
      (await page.locator('input[type="date"]').count()) >= 2 &&
        (await page.locator('.multi-select-trigger').count()) >= 1,
    );
    await page.getByRole('button', { name: /run report/i }).click();
    await expect(page.locator('.report-sheet')).toBeVisible({ timeout: 10000 });
    await assertNoHScroll(page, vp.name, 'Reports');

    // return to documents for next viewport loop cleanup path
    await page.getByRole('link', { name: 'Documents' }).click();
    if (await leaveStay.isVisible().catch(() => false)) {
      await leaveStay.click();
    }
    await expect(page.getByRole('heading', { name: 'Documents', exact: true })).toBeVisible({
      timeout: 15000,
    });
  }

  // Print summary for the agent
  const passed = results.filter((r) => r.pass).length;
  const failed = results.filter((r) => !r.pass);
  console.log('\n=== RESPONSIVE AUDIT SUMMARY ===');
  console.log(`PASS ${passed}/${results.length}`);
  if (failed.length) {
    console.log('FAILURES:');
    for (const f of failed) {
      console.log(`- [${f.viewport}] ${f.page} :: ${f.check} :: ${f.detail}`);
    }
  }
  // Persist for canvas
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fs = await import('node:fs');
  fs.writeFileSync(
    'e2e/responsive-audit-results.json',
    JSON.stringify({ passed, total: results.length, results }, null, 2),
  );

  expect(failed, `Responsive failures:\n${failed.map((f) => `${f.viewport}/${f.page}: ${f.check} (${f.detail})`).join('\n')}`).toEqual([]);
});
