// Lint fixture — the escape hatch used as a mute button.
//
// A disable with no `-- reason` is the failure mode the whole
// block is trying to prevent: the rule stops firing, nobody
// learns why the native element was the right call, and the next
// agent copies the pattern. Two of the three comments below owe
// a reason; the third names somebody else's rule and is none of
// this block's business.

export const NativeSelectNoReason = () => (
  // eslint-disable-next-line charcuterie/prefer-listbox-over-select
  <Select name="quality" />
)

// A blanket disable silences these rules too, so it owes the
// same one line.
export const BlanketDisable = () => (
  // eslint-disable-next-line
  <a href="/jobs">Jobs</a>
)

export const SomebodyElsesRule = ({ jobCount }) => (
  // eslint-disable-next-line no-console
  <TextLink href="/jobs">{console.log(jobCount)}</TextLink>
)
