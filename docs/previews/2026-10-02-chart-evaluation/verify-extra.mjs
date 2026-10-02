import {chromium} from 'playwright'
import {readFileSync,writeFileSync} from 'node:fs'
const url='https://tally-reports-evaluation-9221.temp.t3code.octen.dev'
const browser=await chromium.launch()
const results={static:[],preact:[],touch:[]}
for(const library of ['tanstack','visx','nivo','ours']) {
 const page=await browser.newPage({viewport:{width:680,height:320}})
 const errors=[];page.on('pageerror',error=>errors.push(error.message))
 await page.goto(`${url}/static/${library}.html`);await page.locator('svg').first().waitFor();await page.screenshot({path:`dist/static/${library}.png`})
 results.static.push({library,rects:await page.locator('svg rect').count(),paths:await page.locator('svg path').count(),errors:[...errors]})
 await page.goto(`${url}/${library}-preact.html`);await page.waitForTimeout(900)
 results.preact.push({library,svgCount:await page.locator('svg').count(),rects:await page.locator('svg rect').count(),errors:[...errors]})
 await page.close()
 const mobile=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true})
 await mobile.goto(`${url}/?library=${library}`);await mobile.locator('svg').first().waitFor();await mobile.waitForTimeout(800)
 const marks=mobile.locator('.chart-wrap').first().locator('svg rect')
 let tooltip=false
 for(const mark of await marks.all()) {
  const box=await mark.boundingBox();if(!box||box.width<2||box.height<4||box.width>100)continue
  const before=await mobile.locator('body').innerText()
  await mark.tap({force:true});await mobile.waitForTimeout(100)
  if(await mobile.locator('body').innerText()!==before){tooltip=true;break}
 }
 results.touch.push({library,hasTouchTooltip:tooltip})
 await mobile.close()
}
await browser.close()
writeFileSync('extra-results.json',JSON.stringify(results,null,2))
console.log(JSON.stringify(results,null,2))
