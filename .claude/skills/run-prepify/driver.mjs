// Headless-Chromium driver for Prepify (React client on :3000, Express API on :4000).
// chromium-cli isn't available here, so we drive playwright-core directly.
//
// Usage:
//   node driver.mjs [urlPath] [waitText]
//   node driver.mjs /recipes/65302e782ea38768dea80749 "Nutrition"
//   CLIENT_URL=http://localhost:3000 SHOT=ratings.png node driver.mjs /recipes/<id>
//
// Defaults: urlPath "/", screenshot -> ./screenshots/page.png (full page).
// Prints page title, the <h1>, and any console/page errors so you can tell a
// rendered shell from a page where every data fetch 500'd.

import { chromium } from 'playwright-core'
import { mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const BASE = process.env.CLIENT_URL || 'http://localhost:3000'
const urlPath = process.argv[2] || '/'
const waitText = process.argv[3] || null
const shot = resolve(here, 'screenshots', process.env.SHOT || 'page.png')
await mkdir(dirname(shot), { recursive: true })

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
const page = await browser.newPage({ viewport: { width: 1280, height: 2200 } })

const errors = []
page.on('console', m => m.type() === 'error' && errors.push(m.text()))
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message))

const url = BASE + urlPath
console.log('→ navigating', url)
await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 })
await page.waitForSelector('h1', { timeout: 15000 }).catch(() => {})
if (waitText) {
  await page.getByText(waitText, { exact: false }).first()
    .waitFor({ timeout: 15000 })
    .catch(() => console.log('! waitText not found:', waitText))
}
await page.waitForTimeout(1000)

const title = await page.title()
const h1 = await page.locator('h1').first().innerText().catch(() => '(no h1)')
await page.screenshot({ path: shot, fullPage: true })

console.log('title:', title)
console.log('h1   :', h1.replace(/\n/g, ' '))
console.log('shot :', shot)
console.log('errors:', errors.length ? '\n  ' + errors.join('\n  ') : '(none)')

await browser.close()
