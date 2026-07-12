import { chromium } from 'playwright-core'
const browser = await chromium.launch({ args: ['--no-sandbox'] })
const base = process.env.CLIENT_URL
const cases = [
  { path: '/login',           w: 1280, h: 720, name: 'login_laptop' },
  { path: '/forgot-password', w: 1280, h: 720, name: 'forgot_laptop' },
  { path: '/login',           w: 390,  h: 844, name: 'login_phone' },
  { path: '/signup',          w: 1280, h: 720, name: 'signup_laptop2' },
]
for (const c of cases) {
  const page = await browser.newPage({ viewport: { width: c.w, height: c.h } })
  await page.goto(base + c.path, { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)
  // does the form bottom (action button) overflow the viewport unreachably?
  const fmt = await page.evaluate(() => {
    const el = document.querySelector('.form-format')
    return el ? { scrollH: el.scrollHeight, clientH: el.clientHeight, canScroll: el.scrollHeight > el.clientHeight } : null
  })
  await page.screenshot({ path: `/tmp/${c.name}.png`, fullPage: false })
  console.log(c.name, c.w+'x'+c.h, JSON.stringify(fmt))
  await page.close()
}
await browser.close()
