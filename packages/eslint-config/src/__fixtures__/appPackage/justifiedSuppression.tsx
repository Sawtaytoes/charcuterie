// Lint fixture — the escape hatch, used correctly.
//
// Each of these still *matches* its rule; the disable comment is
// what keeps it out of the report, and the `--` reason is what
// makes the disable comment legal. Nothing here should surface
// as a live problem, and everything here should surface as a
// suppressed one — a suppression that stops matching is a rule
// that quietly stopped working.

export const NativeSelectOnPurpose = () => (
  // eslint-disable-next-line charcuterie/prefer-listbox-over-select -- the kiosk's touch build wants the native OS wheel picker
  <Select name="quality" />
)

export const ThirdPartyAnchor = () => (
  // eslint-disable-next-line charcuterie/no-raw-anchor -- rendered into an email body that cannot load our stylesheet
  <a href="https://example.com/receipt">Receipt</a>
)

export const UncontrolledFormSelect = () => (
  <form action="/settings" method="post">
    {/* eslint-disable-next-line charcuterie/no-raw-select -- posted by the browser with no JS on the page at all */}
    <select name="theme">
      <option value="daylight">Daylight</option>
    </select>
  </form>
)
