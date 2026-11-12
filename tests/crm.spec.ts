import { expect, test } from '@playwright/test'

const APP_URL = 'http://localhost:5174/'

test.describe('SolarCRM smoke and interaction tests', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    page.on('pageerror', (error) => {
      testInfo.attach('page-error', { body: error.stack || error.message, contentType: 'text/plain' })
    })

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        testInfo.attach('console-error', { body: msg.text(), contentType: 'text/plain' })
      }
    })

    await page.goto(APP_URL, { waitUntil: 'networkidle' })
  })

  test('application loads and renders the dashboard shell', async ({ page }) => {
    await expect(page).toHaveTitle(/solarcrm|SolarCRM/i)
    await expect(page.getByRole('heading', { name: /^Telecaller Dashboard$/i })).toBeVisible()
    await expect(page.getByRole('banner').getByRole('button', { name: 'Toggle sidebar' })).toBeVisible()
    await expect(page.getByText(/Professional Leads/i)).toBeVisible()
  })

  test('global search works for names, phone numbers, and no-result states', async ({ page }) => {
    const searchInput = page.getByLabel('Global CRM search')
    await expect(searchInput).toBeVisible()

    await searchInput.fill('Rahul Sharma')
    await expect(page.locator('button').filter({ hasText: 'Rahul Sharma' }).first()).toBeVisible()

    await searchInput.fill('Rahul')
    await expect(page.locator('button').filter({ hasText: 'Rahul Sharma' }).first()).toBeVisible()

    await searchInput.fill('9876543210')
    await expect(page.locator('button').filter({ hasText: '98765 43210' }).first()).toBeVisible()

    await searchInput.fill('definitely-not-a-real-lead')
    await expect(page.getByText('No matches found.')).toBeVisible()

    await page.getByLabel('Clear search').click()
    await expect(searchInput).toHaveValue('')
  })

  test('global search can select a result', async ({ page }) => {
    const searchInput = page.getByLabel('Global CRM search')
    await searchInput.fill('Rahul Sharma')

    const result = page.locator('button').filter({ hasText: 'Rahul Sharma' }).filter({ hasText: 'Lead' }).first()
    await result.click()

    await expect(page.getByText('Lead Overview')).toBeVisible()
  })

  test('lead modal closes when clicking outside the dialog', async ({ page }) => {
    await page.getByRole('button', { name: 'Leads' }).click()
    await page.getByRole('button', { name: /Add Lead/i }).click()

    await expect(page.getByText('Add a new prospect')).toBeVisible()
    await page.mouse.click(10, 10)
    await expect(page.getByText('Add a new prospect')).toHaveCount(0)
  })

  test('three-dot action menu opens, closes, and performs view details', async ({ page }) => {
    const actionButton = page.getByRole('button', { name: 'More actions for Rahul Sharma' }).first()
    await expect(actionButton).toBeVisible()
    await actionButton.click()

    await expect(page.getByRole('menu', { name: 'More actions for Rahul Sharma' })).toBeVisible()
    await expect(page.getByRole('menuitem', { name: 'View details' })).toBeVisible()
    await page.mouse.click(10, 10)
    await expect(page.getByRole('menu', { name: 'More actions for Rahul Sharma' })).toHaveCount(0)

    await actionButton.click()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('menu', { name: 'More actions for Rahul Sharma' })).toHaveCount(0)

    await actionButton.click()
    await page.getByRole('menuitem', { name: 'View details' }).click()
    await expect(page.getByText('Lead Overview')).toBeVisible()
    await page.getByRole('button', { name: 'Close lead details' }).click()
  })

  test('edit lead updates a field and persists across reload', async ({ page }) => {
    const uniqueId = Date.now()
    const unique = `Unique Edit Lead ${uniqueId}-edit`
    const phoneDigits = String(uniqueId).slice(-5)
    const targetPhone = `98765 ${phoneDigits}`

    await page.getByRole('button', { name: 'Leads' }).click()
    await page.getByRole('button', { name: /Add Lead/i }).click()
    await page.getByRole('textbox', { name: 'Name' }).fill(unique)
    await page.getByRole('textbox', { name: 'Phone' }).fill(targetPhone)
    await page.getByRole('textbox', { name: 'Email' }).fill(`${unique.toLowerCase().replace(/\s+/g, '.')}@example.com`)
    await page.getByRole('textbox', { name: 'Company' }).fill('Original Edit Company')
    await page.getByRole('button', { name: /Save Lead/i }).click()
    await page.getByPlaceholder('Search by name, phone, company').fill(unique)
    await expect(page.locator('table')).toContainText(unique)

    const editActionButton = page.getByRole('button', { name: `More actions for ${unique}` }).first()
    await expect(editActionButton).toBeVisible()
    await editActionButton.click()
    await page.getByRole('menuitem', { name: 'Edit lead' }).click()

    await expect(page.getByText('Update prospect details')).toBeVisible()
    await page.getByLabel('Company').fill('BluePeak Solar Labs')
    await page.getByRole('button', { name: 'Update Lead' }).click()

    await expect(page.locator('table')).toContainText('BluePeak Solar Labs')
    await expect(page.locator('table')).toContainText(unique)
    await expect(page.locator('table')).not.toContainText('Original Edit Company')

    await page.reload({ waitUntil: 'networkidle' })
    await page.getByRole('button', { name: 'Leads' }).click()
    await page.getByPlaceholder('Search by name, phone, company').fill(unique)

    await expect(page.locator('table')).toContainText(unique)
    await expect(page.locator('table')).toContainText('BluePeak Solar Labs')
    await expect(page.locator('table')).not.toContainText('Original Edit Company')
  })

  test('log call can record a call and create follow-up history', async ({ page }) => {
    const row = page.locator('table tbody tr').filter({ hasText: 'Lalu Karmja' }).first()
    await row.getByRole('button', { name: 'More actions for Lalu Karmja' }).click()
    await page.getByRole('menuitem', { name: 'Log call' }).click()

    await page.getByLabel('Call Outcome').selectOption('Connected')
    await page.getByLabel('Discussion Notes').fill('Customer wants a quote for a 3kW system.')
    await page.getByLabel('Schedule a follow-up').check()
    await page.getByLabel('Follow-up Date').fill('2030-01-15')
    await page.getByLabel('Follow-up Time').fill('15:30')
    await page.getByLabel('Follow-up Notes').fill('Send final proposal and financing estimate.')
    await page.getByRole('button', { name: /^Save Call$/ }).click()

    await expect(page.getByText(/Call recorded for Lalu Karmja/i)).toBeVisible()
    await page.reload({ waitUntil: 'networkidle' })
    await expect(page.getByText('Lalu Karmja')).toBeVisible()
  })

  test('archive lead removes the row from active leads but keeps history', async ({ page }) => {
    const row = page.locator('table tbody tr').filter({ hasText: 'Priya Das' }).first()
    await row.getByRole('button', { name: 'More actions for Priya Das' }).click()
    page.once('dialog', async (dialog) => {
      await dialog.accept()
    })
    await page.getByRole('menuitem', { name: 'Archive lead' }).click()

    await expect(page.locator('table tbody tr').filter({ hasText: 'Priya Das' })).toHaveCount(0)
  })
})
