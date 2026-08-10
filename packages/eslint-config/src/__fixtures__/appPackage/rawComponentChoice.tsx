// Lint fixture — app code reaching past the library, one case
// per component-choice rule. Every shape here was copied from a
// real offender measured in the fleet on 2026-08-10.

// mux-magic's `PageHeader.tsx` and `HomePage.tsx`, 14 of these.
export const RawAnchor = () => <a href="/jobs">Jobs</a>

// bambuddy's toolbars, and every icon-only control in the fleet.
export const RawButton = () => (
  <button type="button" onClick={() => {}}>
    Run
  </button>
)

// 134 of these in bambuddy alone.
export const RawSelect = () => (
  <select name="quality">
    <option value="high">High</option>
  </select>
)

// Legal, but no longer the default — it needs a stated reason.
export const NativeSelect = () => <Select name="quality" />

// points-market's `AppShell.tsx`: a header title that no
// keyboard can reach.
export const ClickableTitle = () => (
  <div className="cursor-pointer" onClick={() => {}}>
    Points Market
  </div>
)

export const ClickableRow = () => <li onClick={() => {}}>Bay 3</li>

export const ClickableSpan = () => (
  <span onClick={() => {}}>Rename</span>
)

// plex-channels' whole shell, and mail-sifter's.
export const NavigatingAction = ({ navigate }) => (
  <Button onClick={() => navigate("/jobs")}>Jobs</Button>
)

export const RouterPushAction = ({ router }) => (
  <Button onClick={() => router.push("/errors")}>Errors</Button>
)

export const LocationHrefAction = () => (
  <Button
    onClick={() => {
      window.location.href = "/logs"
    }}
  >
    Logs
  </Button>
)
