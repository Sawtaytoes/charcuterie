import { chromium } from 'playwright'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
const url = process.env.EVALUATION_URL || 'https://tally-reports-evaluation-9221.temp.t3code.octen.dev'
const browser = await chromium.launch({ headless: true })
const results = JSON.parse(readFileSync('dist/results.json', 'utf8'))
results.browser = []
mkdirSync('evidence', { recursive: true })
for (const library of ['tanstack','visx','nivo','ours']) {
 const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } })
 const errors = []
 page.on('pageerror', error => errors.push(error.message))
 await page.goto(`${url}/?library=${library}`)
 await page.locator('svg').first().waitFor({ state: 'visible' })
 await page.waitForTimeout(800)
 const chart = page.locator('.chart-wrap').first()
 const marks = chart.locator('svg rect')
 let point
 for (const mark of await marks.all()) { const box = await mark.boundingBox(); if(box && box.width > 2 && box.height > 4 && box.width < 180) { point = box; break } }
 let hasTooltip = false
 for (const mark of await marks.all()) {
  const box = await mark.boundingBox()
  if(!box || box.width < 2 || box.height < 4 || box.width > 180) continue
  const before = await page.locator('body').innerText()
  await mark.hover({ force: true })
  await page.waitForTimeout(120)
  if(await page.locator('body').innerText() !== before) { hasTooltip = true; break }
 }
 await page.screenshot({ path: `evidence/${library}-wide.png`, fullPage: true })
 await page.getByRole('button', { name: 'Change sample values' }).click()
 await page.waitForTimeout(700)
 await page.getByLabel('Animate changes').uncheck()
 await page.waitForTimeout(100)
 await page.getByRole('button', { name: 'Dark mode' }).click()
 await page.screenshot({ path: `evidence/${library}-dark.png`, fullPage: true })
 await page.setViewportSize({ width: 390, height: 844 })
 await page.waitForTimeout(150)
 const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)
 await page.screenshot({ path: `evidence/${library}-phone.png`, fullPage: true })
 await page.getByRole('combobox').first().selectOption('366')
 await page.waitForTimeout(400)
 await page.getByLabel('Show chart values').check()
 const tableRows = await page.locator('table').first().locator('tbody tr').count()
 results.browser.push({ library, hasTooltip, hasOverflow, tableRows, svgCount: await page.locator('svg').count(), errors })
 await page.close()
}
writeFileSync('results.json', JSON.stringify(results, null, 2))
results.standalone = []
for (const library of ['tanstack','visx','nivo','ours']) {
 const samples = []
 const page = await browser.newPage({ viewport: { width: 800, height: 480 } })
 for(let index = 0; index < 6; index++) {
  const start = performance.now()
  await page.goto(`${url}/${library}-standalone.html`)
  await page.locator('svg').first().waitFor()
  samples.push(performance.now() - start)
 }
 await page.keyboard.press('Tab')
 const focused = await page.evaluate(() => ({ tag: document.activeElement?.tagName, role: document.activeElement?.getAttribute('role'), label: document.activeElement?.getAttribute('aria-label') }))
 await page.keyboard.press('ArrowRight')
 const keyboardText = await page.locator('body').innerText()
 results.standalone.push({ library, medianNavigationToSvgMs: samples.toSorted((a,b)=>a-b)[3], samplesMs: samples, focused, keyboardText: keyboardText.slice(0,300) })
 await page.close()
}
writeFileSync('results.json', JSON.stringify(results, null, 2))
writeFileSync('dist/results.json', JSON.stringify(results, null, 2))
console.log(JSON.stringify(results, null, 2))
await browser.close()
