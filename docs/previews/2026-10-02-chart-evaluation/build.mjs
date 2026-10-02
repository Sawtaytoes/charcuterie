import { build } from 'esbuild'
import { cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
const flags = { bundle: true, minify: true, format: 'esm', platform: 'browser', jsx: 'automatic', define: { 'process.env.NODE_ENV': '"production"' }, logLevel: 'warning' }
mkdirSync('dist', { recursive: true })
await build({ ...flags, entryPoints: ['app.jsx'], outdir: 'dist', splitting: true, metafile: true })
for (const file of ['index.html', 'style.css']) cpSync(file, `dist/${file}`)
const baselineSource = "import React from 'react';import{createRoot}from'react-dom/client';createRoot(document.getElementById('root')).render(React.createElement('div',null,'Chart'));"
const baseline = await build({ ...flags, stdin: { contents: baselineSource, resolveDir: process.cwd() }, write: false })
const baselineGzip = gzipSync(baseline.outputFiles[0].contents).length
const bundles = {}
for (const library of ['tanstack','visx','nivo','ours']) {
 const source = `import React from 'react';import{createRoot}from'react-dom/client';import Chart from './${library}.jsx';import{makeDays,children}from'./fixtures.mjs';createRoot(document.getElementById('root')).render(React.createElement(Chart,{rows:makeDays(7,0),color:children[0].color}));`
 const result = await build({ ...flags, stdin: { contents: source, resolveDir: process.cwd(), loader: 'jsx' }, write: false, metafile: true })
 const bytes = result.outputFiles[0].contents
 const gzip = gzipSync(bytes).length
 bundles[library] = { bytes: bytes.length, gzip, incrementalGzip: gzip - baselineGzip, inputModules: Object.keys(result.metafile.inputs).length }
 writeFileSync(`dist/${library}-standalone.js`, bytes)
 writeFileSync(`dist/${library}-standalone.html`, `<html lang="en"><head><meta charset="utf-8"><link rel="stylesheet" href="style.css"><title>${library} chart</title></head><body><div id="root"></div><script type="module" src="${library}-standalone.js"></script></body></html>`)
}
const result = { versions: { tanstack: '0.18.0', visx: '4.0.0', nivo: '0.99.0', react: '19.2.8', esbuild: '0.28.1' }, baselineGzip, bundles }
writeFileSync('dist/results.json', JSON.stringify(result, null, 2))
console.log(JSON.stringify(result, null, 2))
