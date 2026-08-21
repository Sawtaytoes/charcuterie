// Lint fixture: a component test whose harness IS the test.
// Copied in shape from board-game-picker's `SelectMenu.test.tsx`,
// which mounts a wrapper to prove a picker remounts when its value
// changes from outside. Splitting the harness into a second file
// puts the setup where the reader is not, so
// `react/no-multi-comp` is off for `*.test.tsx`.
const OutsideHarness = () => <div>harness</div>

export const Subject = () => (
  <section>
    <OutsideHarness />
  </section>
)
