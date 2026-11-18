import { expect, test } from '@playwright/test';

const ANSWERS = ['Yes, all of it', 'Partly', 'No', 'Not sure', 'Yes, all of it', 'Yes, all of it', 'Partly', 'Yes, all of it'];

test('the lead is posted to Web3Forms and the scorecard shows', async ({ page }) => {
  let sent: Record<string, string> | undefined;
  let fail = true;
  await page.route('https://api.web3forms.com/submit', async (route) => {
    if (fail) return route.abort('failed');
    sent = route.request().postDataJSON();
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, message: 'Email sent' }) });
  });
  const apiCalls: string[] = [];
  page.on('request', (r) => r.url().includes('/api/') && apiCalls.push(r.url()));

  await page.goto('/');
  await page.locator('.site-header').getByRole('button', { name: 'Start The Audit' }).click();
  const d = page.getByRole('dialog', { name: 'The Audit check' });
  for (const [i, a] of ANSWERS.entries()) {
    await expect(d.getByText(i === 7 ? 'Last one of 8' : `Question ${i + 1} of 8`)).toBeVisible();
    await d.getByRole('button', { name: a, exact: true }).click();
  }
  await d.getByRole('button', { name: '5 to 20' }).click();
  await page.waitForTimeout(4000); // past the too-fast bot check
  await d.getByLabel('Full name').fill('Sam Patel');
  await d.getByRole('textbox', { name: /Mobile/ }).fill('7805551234');
  await d.getByLabel(/^Email/).fill('sam.patel@example.com');
  await d.getByRole('checkbox').check();
  await d.getByRole('button', { name: /Show my result/ }).click();

  // A network failure gives the friendly retry; the retry delivers.
  await expect(d.getByRole('heading', { name: "We couldn't send your answers" })).toBeVisible({ timeout: 15_000 });
  fail = false;
  await d.getByRole('button', { name: /Try again/ }).click();
  await expect(d.getByRole('heading', { name: 'Almost There!' })).toBeVisible({ timeout: 15_000 });
  await expect(d.getByText(/Demo version/)).toHaveCount(0);

  expect(sent).toMatchObject({
    access_key: 'test-access-key',
    name: 'Sam Patel',
    email: 'sam.patel@example.com',
    phone: '+17805551234',
    'Power units': '5 to 20',
    'Readiness score': '63% (Almost There!), 10 of 16 points',
  });
  expect(apiCalls).toEqual([]);
});
