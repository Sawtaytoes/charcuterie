import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createChartScene } from '@tanstack/charts'
import { renderChartSvg } from '@tanstack/charts/svg'
import { definitionFor } from './tanstack.jsx'
import Visx from './visx.jsx'
import Nivo from './nivo.jsx'
import Ours from './ours.jsx'
import { children, makeDays } from './fixtures.mjs'
import { mkdirSync, writeFileSync } from 'node:fs'
const rows = makeDays(7, 0), color = children[0].color
mkdirSync('dist/static', { recursive: true })
const results = []
for (const [library, component] of [['tanstack',null],['visx',Visx],['nivo',Nivo],['ours',Ours]]) {
 try {
  const markup = library === 'tanstack' ? renderChartSvg(createChartScene(definitionFor(rows,color),{width:640,height:280}),{ariaLabel:'Daily points'}) : renderToStaticMarkup(React.createElement(component,{rows,color,width:640,isAnimated:false}))
  const svg = markup.slice(markup.indexOf('<svg'),markup.lastIndexOf('</svg>')+6)
  if (!svg.endsWith('</svg>')) throw new Error('No SVG exported')
  writeFileSync(`dist/static/${library}.svg`,svg)
  writeFileSync(`dist/static/${library}.html`,`<html lang="en"><head><title>${library} static chart</title><link rel="stylesheet" href="../style.css"></head><body style="width:640px">${svg}</body></html>`)
  results.push({library,hasSvg:true,bytes:Buffer.byteLength(svg)})
 } catch(error) { results.push({library,hasSvg:false,error:error.message}) }
}
writeFileSync('static-results.json',JSON.stringify(results,null,2))
writeFileSync('dist/static/index.html',`<html lang="en"><head><title>Static export samples</title></head><body><h1>Static chart exports</h1>${results.filter(row=>row.hasSvg).map(row=>`<p>${row.library}: <a href="${row.library}.svg">SVG</a> <a href="${row.library}.png">PNG</a> <a href="${row.library}.html">Page without JavaScript</a></p>`).join('')}</body></html>`)
console.log(JSON.stringify(results,null,2))
