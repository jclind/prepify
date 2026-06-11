import { chromium } from 'playwright-core'
import { existsSync } from 'fs'
const macPaths = [
  process.env.HOME + '/Library/Caches/ms-playwright',
]
const browser = await chromium.launch({ args: ['--no-sandbox'] })
const url = process.env.CLIENT_URL + (process.argv[2] || '/signup')
const w = +(process.env.W || 1280), h = +(process.env.H || 720)
const page = await browser.newPage({ viewport: { width: w, height: h } })
await page.goto(url, { waitUntil: 'networkidle' })
await page.waitForTimeout(800)
await page.screenshot({ path: process.env.OUT || '/tmp/shot.png', fullPage: false })
console.log('shot', w+'x'+h, '->', process.env.OUT)
await browser.close()
