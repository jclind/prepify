// Capture a set of account-redesign variants by seeding the switcher's
// localStorage key before load. Usage: node shotVariants.mjs 0 1 5 10 19
import { chromium } from 'playwright-core'
import { mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const BASE = process.env.CLIENT_URL || 'http://localhost:3000'
const indices = (process.argv.slice(2).length ? process.argv.slice(2) : ['0']).map(Number)
const outDir = resolve(here, 'screenshots')
await mkdir(outDir, { recursive: true })

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
const allErrors = []

for (const idx of indices) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 2400 } })
  const errors = []
  page.on('console', m => m.type() === 'error' && errors.push(m.text()))
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message))
  await page.addInitScript(i => {
    localStorage.setItem('prepify:account-redesign:variant:v5', String(i))
  }, idx)
  await page.goto(BASE + '/account-redesign', { waitUntil: 'networkidle', timeout: 30000 })
  await page.waitForTimeout(1500) // let remote food images settle
  const shot = resolve(outDir, `variant-${String(idx + 1).padStart(2, '0')}.png`)
  await page.screenshot({ path: shot, fullPage: true })
  const blurb = await page.locator('.arp-select').inputValue().catch(() => '?')
  console.log(`variant ${idx + 1} -> ${shot} | sel=${blurb} | errors=${errors.length}`)
  errors.forEach(e => allErrors.push(`[v${idx + 1}] ${e}`))
  await page.close()
}

if (allErrors.length) {
  console.log('\n--- console/page errors ---')
  allErrors.forEach(e => console.log('  ' + e))
} else {
  console.log('\nno console/page errors across variants')
}
await browser.close()
