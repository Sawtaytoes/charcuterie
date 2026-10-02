export const children = [
  { id: 'avery', name: 'Avery', color: '#009FA1' },
  { id: 'blake', name: 'Blake', color: '#8B5CB7' },
  { id: 'casey', name: 'Casey', color: '#B96B35' },
]
export const categories = ['Tasks', 'Bonuses', 'Penalties', 'Reversals']
export const shades = (color) => [color, color + '88', '#b83c48', '#71839d']
export const makeDays = (count, childIndex, offset = 0) => Array.from({ length: count }, (_, index) => {
  const date = new Date(Date.UTC(2026, 8, 1 + index + offset))
  const code = (index + offset * 3 + childIndex * 7) % 11
  const tasks = code === 0 ? 0 : 130 + code * 15
  const bonus = code % 3 === 0 ? 20 : 0
  const penalty = code % 5 === 0 ? -50 : 0
  const reversal = code === 7 ? -30 : 0
  return { day: date.toISOString().slice(0, 10), Tasks: tasks, Bonuses: bonus, Penalties: penalty, Reversals: reversal, net: tasks + bonus + penalty + reversal }
})
export const shortDay = (day) => day.slice(5)
export const taskRows = [
  { key: 'piano', name: 'Piano', isTimed: true, counts: [5, 4, 0], minutes: [[60, 30, 75, 60, 45], [30, 40, 60, 20], []] },
  { key: 'reading', name: 'Reading', isTimed: true, counts: [6, 5, 3], minutes: [[30, 45, 30, 60, 15, 30], [30, 30, 45, 60, 20], [15, 20, 15]] },
  { key: 'bed', name: 'Make bed', isTimed: false, counts: [6, 7, 5], minutes: [[], [], []] },
  { key: 'dishes', name: 'Wash dishes', isTimed: false, counts: [3, 4, 0], minutes: [[], [], []] },
  { key: 'bonus', name: 'Bonuses', isTimed: false, counts: [2, 3, 1], minutes: [[], [], []] },
  { key: 'penalty', name: 'Penalties', isTimed: false, counts: [1, 0, 2], minutes: [[], [], []] },
]
export const summarizeTime = (values) => {
  const active = values.filter(value => value > 0).toSorted((a, b) => a - b)
  const total = active.reduce((sum, value) => sum + value, 0)
  const middle = Math.floor(active.length / 2)
  return { total, days: active.length, mean: active.length ? total / active.length : null, median: active.length ? active.length % 2 ? active[middle] : (active[middle - 1] + active[middle]) / 2 : null }
}
