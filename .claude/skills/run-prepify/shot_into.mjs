import { chromium } from 'playwright-core'
const browser = await chromium.launch({ args: ['--no-sandbox'] })
const url = process.env.CLIENT_URL + '/signup'
const w = +(process.env.W || 1280), h = +(process.env.H || 720)
const page = await browser.newPage({ viewport: { width: w, height: h } })
await page.goto(url, { waitUntil: 'networkidle' })
await page.waitForTimeout(600)
const link = page.getByRole('link', { name: 'Terms of Service' })
await link.scrollIntoViewIfNeeded()
await page.waitForTimeout(300)
const box = await link.boundingBox()
console.log('terms link box (in-viewport y):', JSON.stringify(box), 'viewportH:', h)
await page.screenshot({ path: process.env.OUT || '/tmp/shot.png', fullPage: false })
await browser.close()
