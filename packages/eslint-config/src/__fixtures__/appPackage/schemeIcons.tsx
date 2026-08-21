// Lint fixture: an icon module. Charcuterie ships no icons, so
// every app brings its own, and in this fleet that is one file of
// glyphs — mail-sifter's `icons.tsx` holds 19. Splitting them into
// one file each is strictly worse, so `react/no-multi-comp` is off
// here.
export const SunIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="4" />
  </svg>
)

export const MoonIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24">
    <path d="M20 14.5A8 8 0 1 1 9.5 4a6.2 6.2 0 0 0 10.5 10.5z" />
  </svg>
)
