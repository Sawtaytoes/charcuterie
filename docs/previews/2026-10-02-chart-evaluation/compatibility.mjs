import {build} from 'esbuild'
import {writeFileSync} from 'node:fs'
import {gzipSync} from 'node:zlib'
const results=[]
for(const library of ['tanstack','visx','nivo','ours']) {
 const chartImport=library==='tanstack'?"import {Chart} from '@tanstack/charts/preact';import {definitionFor} from './tanstack.jsx';":"import Chart from './"+library+".jsx';"
 const props=library==='tanstack'?"{definition:definitionFor(makeDays(7,0),children[0].color),width:640,height:280,ariaLabel:'Daily points'}":"{rows:makeDays(7,0),color:children[0].color,isAnimated:true,width:640}"
 const source=`import {h,render} from 'preact';${chartImport}import {makeDays,children} from './fixtures.mjs';render(h(Chart,${props}),document.getElementById('root'));`
 const result=await build({stdin:{contents:source,resolveDir:process.cwd()},bundle:true,minify:true,platform:'browser',format:'esm',write:false,metafile:true,jsx:'automatic',define:{'process.env.NODE_ENV':'"production"'},alias:{'react':'preact/compat','react-dom':'preact/compat','react/jsx-runtime':'preact/jsx-runtime'}})
 writeFileSync(`dist/${library}-preact.js`,result.outputFiles[0].contents)
 writeFileSync(`dist/${library}-preact.html`,`<html lang="en"><head><title>${library} Preact</title><link rel="stylesheet" href="style.css"></head><body><div id="root"></div><script type="module" src="${library}-preact.js"></script></body></html>`)
 results.push({library,gzipBytes:gzipSync(result.outputFiles[0].contents).length,reactModules:Object.keys(result.metafile.inputs).filter(path=>/node_modules\/react(?:-dom)?\//.test(path))})
}
writeFileSync('compatibility-results.json',JSON.stringify(results,null,2))
console.log(JSON.stringify(results,null,2))
