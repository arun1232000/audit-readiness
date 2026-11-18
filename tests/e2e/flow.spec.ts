import { expect, test, type Page } from '@playwright/test';

// Points: 2+1+0+0+2+2+1+2 = 10 of 16 -> 62.5% -> shown 63%, "Almost There!"
const ANSWERS = ['Yes, all of it', 'Partly', 'No', 'Not sure', 'Yes, all of it', 'Yes, all of it', 'Partly', 'Yes, all of it'];

const uniqueEmail = () => `e2e-${Date.now()}-${Math.round(Math.random() * 1e6)}@example.com`;
const dialog = (page: Page) => page.getByRole('dialog', { name: 'The Audit check' });
const count = (i: number) => (i === 7 ? 'Last one of 8' : `Question ${i + 1} of 8`);

async function answer(page: Page, from: number, to: number) {
  for (let i = from; i < to; i++) {
    await expect(dialog(page).getByText(count(i))).toBeVisible();
    await dialog(page).getByRole('button', { name: ANSWERS[i]!, exact: true }).click();
  }
}

async function fillLead(page: Page, email: string) {
  const d = dialog(page);
  await expect(d.getByRole('heading', { name: 'Where should we send your report?' })).toBeVisible();
  await d.getByLabel('Full name').fill('Sam Patel');
  await d.getByRole('textbox', { name: /Mobile/ }).fill('7805551234');
  await d.getByLabel(/^Email/).fill(email);
  await d.getByRole('checkbox').check();
  await d.getByRole('button', { name: /Show my result/ }).click();
}

test('full flow: landing -> check (with refresh) -> units -> details -> scorecard, HubSpot mocked', async ({ page }) => {
  let submitted: Record<string, unknown> | undefined;
  page.on('request', (r) => {
    if (r.url().endsWith('/api/submit')) submitted = r.postDataJSON();
  });

  await page.goto('/?utm_source=e2e&utm_campaign=playwright');
  await expect(page.getByRole('heading', { level: 1, name: 'Are you audit ready?' })).toBeVisible();

  // The invitation appears after a few seconds and opens the check.
  await page.getByRole('complementary', { name: 'The Audit' }).getByRole('button', { name: /Start The Audit/ }).click();
  await expect(dialog(page)).toBeVisible();
  await answer(page, 0, 3);

  // Refresh mid-way: the check reopens where it was.
  await page.reload();
  await expect(dialog(page).getByText('Question 4 of 8')).toBeVisible();

  // Back keeps the previous answer selected.
  await dialog(page).getByRole('button', { name: 'Back' }).click();
  await expect(dialog(page).getByText('Question 3 of 8')).toBeVisible();
  await expect(dialog(page).getByRole('button', { name: 'No', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await dialog(page).getByRole('button', { name: 'No', exact: true }).click();

  await answer(page, 3, 8);

  await expect(dialog(page).getByText('How many power units do you run?')).toBeVisible();
  await dialog(page).getByRole('button', { name: '5 to 20' }).click();

  // Details are required.
  await expect(dialog(page).getByRole('heading', { name: 'Where should we send your report?' })).toBeVisible();
  await dialog(page).getByRole('button', { name: /Show my result/ }).click();
  await expect(dialog(page).getByText('Please tell us your name.')).toBeVisible();
  await fillLead(page, uniqueEmail());

  await expect(dialog(page).getByText('Adding up your eight answers')).toBeVisible();
  await expect(dialog(page).getByRole('heading', { name: 'Almost There!' })).toBeVisible({ timeout: 15_000 });
  await expect(dialog(page).locator('.bigring .num')).toHaveText('63%', { timeout: 6_000 });
  await expect(dialog(page).getByText('With 5 to 20 power units, 3 of your 4 areas need attention, and drivers is where your answers point first.')).toBeVisible({ timeout: 8_000 });
  await expect(dialog(page).getByText('Gap to close')).toBeVisible();
  await expect(dialog(page).getByText('Driver qualification files may have gaps')).toBeVisible();
  await dialog(page).getByRole('button', { name: /Scratch the card, or tap here to reveal/ }).click();
  await expect(dialog(page).getByText('We start with drivers, the area your answers point to, and open it on your own file.')).toBeVisible();
  await expect(dialog(page).getByRole('link', { name: /Request your audit readiness review/ }).first()).toHaveAttribute(
    'href',
    /wa\.me\/17809097200\?text=.*My%20name%20is%20Sam.*Power%20units%3A%205%20to%2020.*63%25/,
  );

  expect(submitted).toMatchObject({
    lead: { fullName: 'Sam Patel', phone: '+17805551234', consent: true },
    answers: { q1: 'yes', q3: 'no', q4: 'notsure' },
    powerUnits: '5 to 20',
    attribution: { utm_source: 'e2e', utm_campaign: 'playwright' },
  });
  expect(submitted).not.toHaveProperty('score');

  // Escape closes the check; the side tab stays within reach.
  await page.keyboard.press('Escape');
  await expect(dialog(page)).toBeHidden();

  // Returning later: the invitation offers the saved result.
  await page.evaluate(() => sessionStorage.clear());
  await page.goto('/');
  const invite = page.getByRole('complementary', { name: 'The Audit' });
  await expect(invite.getByText('Your last result is saved.')).toBeVisible({ timeout: 10_000 });
  await invite.getByRole('button', { name: /See your result/ }).click();
  await expect(dialog(page).getByRole('heading', { name: 'Almost There!' })).toBeVisible();
});

test('network failure shows a friendly error with retry', async ({ page }) => {
  let fail = true;
  await page.route('**/api/submit', (route) => (fail ? route.abort('failed') : route.continue()));

  await page.goto('/');
  await page.locator('.site-header').getByRole('button', { name: 'Start The Audit' }).click();
  await answer(page, 0, 8);
  await dialog(page).getByRole('button', { name: '21 to 70' }).click();
  await fillLead(page, uniqueEmail());

  await expect(dialog(page).getByRole('heading', { name: "We couldn't send your answers" })).toBeVisible({ timeout: 15_000 });
  fail = false;
  await dialog(page).getByRole('button', { name: /Try again/ }).click();
  await expect(dialog(page).getByRole('heading', { name: 'Almost There!' })).toBeVisible({ timeout: 15_000 });
});

test('keyboard only: answers and power units with Enter', async ({ page }, info) => {
  test.skip(info.project.name === 'mobile', 'keyboard flow is desktop-only');
  await page.goto('/');
  await page.locator('.site-header').getByRole('button', { name: 'Start The Audit' }).focus();
  await page.keyboard.press('Enter');
  await expect(dialog(page).getByText('Question 1 of 8')).toBeVisible();
  await expect(dialog(page).getByRole('heading', { name: 'Safety program and accountability' })).toBeFocused();
  await page.keyboard.press('Tab'); // "How to answer"
  await page.keyboard.press('Tab'); // first answer
  await expect(dialog(page).getByRole('button', { name: 'Yes, all of it' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(dialog(page).getByText('Question 2 of 8')).toBeVisible();
  await expect(dialog(page).getByRole('heading', { name: 'Company records and renewals' })).toBeFocused();
});

test('answering question one in the hero opens the check at question two', async ({ page }) => {
  await page.goto('/');
  const card = page.locator('.hero-card');
  await expect(card.getByRole('heading', { name: 'Safety program and accountability' })).toBeVisible();
  await card.getByRole('button', { name: 'Partly' }).click();
  await expect(dialog(page).getByText('Question 2 of 8')).toBeVisible();
  // Back shows question one with the hero answer kept.
  await dialog(page).getByRole('button', { name: 'Back' }).click();
  await expect(dialog(page).getByRole('button', { name: 'Partly', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.site-header img[alt="Prime Compliance"]')).toBeVisible();
});
