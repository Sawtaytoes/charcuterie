// Formatter fixture. Already correct under the BASE config: 60
// columns, no semicolons, double quotes, trailing commas,
// parenthesized arrow params. Biome reports zero diffs on it only
// if the base settings actually reached the file — under Biome's
// own defaults (80 columns, semicolons always) it reformats.
const describeQuality = (quality) => ({
  label: quality,
  isHigh: quality === "high",
})

export const qualities = [
  describeQuality("high"),
  describeQuality("low"),
]
