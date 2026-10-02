import React, { Suspense, lazy, useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { categories, children, makeDays, shades, summarizeTime, taskRows } from './fixtures.mjs'
const renderers = { tanstack: lazy(() => import('./tanstack.jsx')), visx: lazy(() => import('./visx.jsx')), nivo: lazy(() => import('./nivo.jsx')), ours: lazy(() => import('./ours.jsx')) }
const names = { tanstack: 'TanStack 0.18.0', visx: 'visx 4.0.0', nivo: 'Nivo 0.99.0', ours: 'Our current renderer' }
const descriptions = {
 tanstack: 'Framework-independent chart definitions, native React and Preact adapters, static SVG, tooltips and optional motion. Alpha API: pin versions and verify upgrades.',
 visx: 'React building blocks with animated series and shared tooltips. Strong rendering control; more pieces to assemble. Preact compatibility requires testing.',
 nivo: 'Ready-made charts with animated transitions and rich configuration. This is an SVG Bar chart; other chart types are optional imports. Preact compatibility requires testing.',
 ours: 'The exact portable renderer currently in Charcuterie. Grouped bars, no stacking, no managed tooltips, no keyboard point navigation or transitions. Native SVG titles only. The shared values table remains available.',
}
const rounded = value => value === null ? 'No active days' : `${Math.round(value)} min`
function Plot({ renderer, rows, color, isAnimated }) {
 const box = useRef(null)
 const [width, setWidth] = useState(640)
 useEffect(() => { const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width))); observer.observe(box.current); return () => observer.disconnect() }, [])
 const Component = renderers[renderer]
 return <div className="chart-wrap" ref={box}><Suspense fallback={<p role="status">Loading chart library…</p>}><Component rows={rows} color={color} width={Math.max(250, width)} isAnimated={isAnimated} /></Suspense></div>
}
function App() {
 const initial = new URLSearchParams(location.search).get('library') || 'tanstack'
 const [renderer, setRenderer] = useState(initial in renderers ? initial : 'tanstack')
 const [period, setPeriod] = useState(7)
 const [kid, setKid] = useState('all')
 const [revision, setRevision] = useState(0)
 const [isDark, setIsDark] = useState(false)
 const [isAnimated, setIsAnimated] = useState(!matchMedia('(prefers-reduced-motion: reduce)').matches)
 const [isComparison, setIsComparison] = useState(false)
 const [isTableVisible, setIsTableVisible] = useState(false)
 const [metrics, setMetrics] = useState(null)
 useEffect(() => { document.body.classList.toggle('dark', isDark) }, [isDark])
 useEffect(() => { fetch('results.json').then(response => response.json()).then(setMetrics).catch(() => {}) }, [])
 const selected = children.filter(child => kid === 'all' || child.id === kid)
 const timed = child => { const index = children.indexOf(child); const daily = Array.from({ length: 7 }, (_, day) => taskRows.reduce((sum, task) => sum + (task.minutes[index][day] ?? 0), 0)); return summarizeTime(daily) }
 return <main>
  <p className="fine">Illustrative data · Four-library evaluation · No live scans or points changes</p>
  <h1>Reports: daily activity and task habits</h1>
  <p>Daily points explain what was earned and deducted. Task frequency and recorded time explain what was done.</p>
  <section className="panel" aria-label="Chart library evaluation"><h2>Compare the rendering engines</h2><div className="library">{Object.entries(names).map(([id, name]) => <button key={id} aria-pressed={renderer === id} onClick={() => { setRenderer(id); history.replaceState(null, '', `?library=${id}`) }}>{name}</button>)}</div><p>{descriptions[renderer]}</p><div className="controls"><button aria-pressed={isDark} onClick={() => setIsDark(!isDark)}>Dark mode</button><label><input type="checkbox" checked={isAnimated} onChange={event => setIsAnimated(event.target.checked)} /> Animate changes</label><button onClick={() => setRevision(revision + 1)}>Change sample values</button></div>{metrics && <output>{Math.round(metrics.bundles[renderer].incrementalGzip / 1024)} KiB gzip added over a React-only harness for this chart.</output>}</section>
  <section className="panel" aria-label="Report controls"><div className="controls"><label>Period <select value={period} onChange={event => setPeriod(Number(event.target.value))}>{[7,30,90,366].map(days => <option key={days} value={days}>{days} days</option>)}</select></label><label>Children <select value={kid} onChange={event => setKid(event.target.value)}><option value="all">All children</option>{children.map(child => <option key={child.id} value={child.id}>{child.name}</option>)}</select></label><label><input type="checkbox" checked={isComparison} onChange={event => setIsComparison(event.target.checked)} /> Compare a second period</label><label><input type="checkbox" checked={isTableVisible} onChange={event => setIsTableVisible(event.target.checked)} /> Show chart values</label></div><p className="fine">The comparison demonstrates two periods aligned by day number. Task/time examples below are fixed seven-day samples, clearly separate from the chart stress-test range.</p></section>
  <section className="panel" aria-label="Daily points"><h2>Daily points, with the breakdown for every child</h2><p>Tasks and bonuses are above zero. Penalties and negative reversals are below zero. Each child keeps the same identity color across views.</p>{selected.map(child => {
   const rows = makeDays(period, children.indexOf(child), revision)
   return <section className="chart-row" key={child.id}><h3><span className="swatch" style={{ background: child.color }} />{child.name}</h3><div className="legend">{categories.map((category, index) => <span key={category}><span className="swatch" style={{ background: shades(child.color)[index] }} />{category}</span>)}</div><Plot renderer={renderer} rows={rows} color={child.color} isAnimated={isAnimated}/>{isComparison && <><p className="fine">Comparison period</p><Plot renderer={renderer} rows={makeDays(period, children.indexOf(child), revision + 11)} color={child.color} isAnimated={isAnimated}/></>}{isTableVisible && <div className="table-wrap"><table><caption>{child.name}: chart values</caption><thead><tr><th>Date</th>{categories.map(category => <th key={category}>{category}</th>)}<th>Net</th></tr></thead><tbody>{rows.map(row => <tr key={row.day}><th>{row.day}</th>{categories.map(category => <td key={category}>{row[category]}</td>)}<td>{row.net}</td></tr>)}</tbody></table></div>}</section>
  })}</section>
  <section className="panel" aria-label="Recorded time"><h2>Recorded time across all timed cards</h2><p className="fine">Seven-day example. Average and median use only days with positive recorded minutes. They do not imply time was spent on unrecorded days.</p><div className="time-grid">{selected.map(child => { const value = timed(child); return <div className="time-stat" key={child.id} style={{ borderColor: child.color }}><h3>{child.name}</h3><div className="number">{value.total} min</div><div>{value.days} active days</div><div>Average: {rounded(value.mean)} / active day</div><div>Median: {rounded(value.median)} / active day</div></div> })}</div></section>
  <section className="panel" aria-label="Task activity"><h2>Task activity across children</h2><p>Shared tasks are one row. Counts mean completed awards or timed stops that still stand; rejected scans and canceled sessions are separate events. Current card rules are not evidence of a historical requirement.</p><div className="table-wrap"><table><caption>Seven-day task activity example</caption><thead><tr><th>Task</th>{selected.map(child => <th key={child.id}>{child.name}</th>)}</tr></thead><tbody>{taskRows.map(task => <tr key={task.key}><th>{task.name}</th>{selected.map(child => { const index = children.indexOf(child); const time = summarizeTime(task.minutes[index]); return <td key={child.id}><strong>{task.counts[index]} {task.isTimed ? 'sessions' : 'times'}</strong>{task.isTimed && <><div>{time.total} min total</div><div>{rounded(time.mean)} average / active day</div><div>{rounded(time.median)} median / active day</div><div>{task.minutes[index].filter(minutes => minutes >= 60).length} days at 60+ min</div></>}</td> })}</tr>)}</tbody></table></div></section>
  <details className="panel"><summary>Current page, proposed changes, and decision criteria</summary><p>Current: net daily bars, cumulative points, a global adjustment breakdown, minutes graphed, and net points by task. Proposed: daily breakdown by child, recorded-time numbers, and one task-frequency/time matrix across children. Cumulative points and points-by-task leave the default report.</p><p>Decision criteria: useful interactions, readable negative values, accessible keyboard and touch behavior, motion/reduced motion, browser and static rendering, Preact without React, extra JavaScript, implementation effort, licensing, and maintenance. Prototype results are recorded in results.json and the evaluation report.</p><a href="results.json">Raw measured results</a> · <a href="static/">Static SVG and PNG samples</a></details>
 </main>
}
createRoot(document.getElementById('root')).render(<App />)
