// Lint fixture — the clean control, and the near-miss set.
//
// The near misses are the point. `rows.push(…)` is an array
// append inside a click handler, `name.replace(…)` is a string
// method, and a `<li>` that carries a `role` or a `tabIndex` is
// somebody's deliberate custom widget rather than a `<div>`
// pretending to be a button. A rule that fires on any of them is
// a rule somebody switches off within a week.

export const Navigation = () => (
  <nav>
    <TextLink href="/jobs">Jobs</TextLink>
    <ButtonLink href="/errors">Errors</ButtonLink>
    <UnstyledLink className="app-owned-link" href="/logs">
      Logs
    </UnstyledLink>
  </nav>
)

export const Actions = ({ deleteJob, runJob }) => (
  <div>
    <Button onClick={() => runJob()}>Run</Button>
    <IconButton label="Delete job" onClick={() => deleteJob()}>
      <TrashGlyph />
    </IconButton>
  </div>
)

export const Choices = ({ languages, qualities }) => (
  <>
    <Listbox name="quality" options={qualities} />
    <Combobox name="language" options={languages} />
  </>
)

export const NearMisses = ({ name, rows, setName, setRows }) => (
  <ul>
    <li>
      <span>Not clickable at all.</span>
    </li>
    <li onClick={() => setRows([])} role="option">
      A role means somebody meant this.
    </li>
    <li onClick={() => setRows([])} tabIndex={-1}>
      So does a tabIndex.
    </li>
    <label onClick={() => setRows([])}>
      A label activating its own control is the platform working.
    </label>
    <li>
      <Button onClick={() => rows.push("row")}>Append</Button>
    </li>
    <li>
      <Button onClick={() => setName(name.replace("a", "b"))}>
        Rename
      </Button>
    </li>
  </ul>
)
