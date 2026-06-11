import { chromium } from 'playwright-core'
const browser = await chromium.launch({ args: ['--no-sandbox'] })
const url = process.env.CLIENT_URL + (process.argv[2] || '/signup')
const w = +(process.env.W || 1280), h = +(process.env.H || 720)
const page = await browser.newPage({ viewport: { width: w, height: h } })
await page.goto(url, { waitUntil: 'networkidle' })
await page.waitForTimeout(600)
// scroll the signup scroll-container to the bottom, then shoot the viewport
await page.evaluate(() => {
  const el = document.querySelector('.signup-page')
  if (el) el.scrollTop = el.scrollHeight
})
await page.waitForTimeout(300)
const link = await page.getByRole('link', { name: 'Terms of Service' }).isVisible().catch(() => false)
await page.screenshot({ path: process.env.OUT || '/tmp/shot.png', fullPage: false })
console.log('shot', w+'x'+h, 'termsLinkVisibleAfterScroll:', link)
await browser.close()
