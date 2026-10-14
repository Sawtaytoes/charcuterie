import { h, render } from "preact"
import { act } from "preact/test-utils"
import { expect, test } from "vitest"
import { ChartPlot } from "./preact.ts"

const labels = ["Mon", "Tue"]
const series = [
  { id: "tasks", label: "Tasks", values: [100, 200] },
  { id: "bonus", label: "Bonuses", values: [10, 20] },
  { id: "penalty", label: "Penalties", values: [0, -50] },
]
test("native Preact drives keyboard focus, updates samples, and unmounts the adapter", async () => {
  const container = document.createElement("div")
  container.style.width = "640px"
  container.style.height = "240px"
  document.body.append(container)
  try {
    await act(() =>
      render(
        h(ChartPlot, {
          title: "Daily points",
          labels,
          series,
          barLayout: "stacked",
          isAnimated: false,
        }),
        container,
      ),
    )
    const plot = container.querySelector<SVGSVGElement>(
      'svg[aria-label="Daily points"]',
    )
    expect(plot).not.toBeNull()
    plot?.focus()
    plot?.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "End",
        bubbles: true,
      }),
    )
    const tooltip = container.querySelector(
      '[role="status"]',
    )
    expect(tooltip?.getAttribute("aria-label")).toContain(
      "Tue",
    )
    expect(tooltip?.textContent).toContain("Penalties-50")
    expect(tooltip?.textContent).toContain("Bonuses20")
    await act(() =>
      render(
        h(ChartPlot, {
          title: "Daily points",
          labels,
          series: [
            {
              id: "tasks",
              label: "Tasks",
              values: [300, 400],
            },
          ],
          isAnimated: false,
        }),
        container,
      ),
    )
    const updated =
      container.querySelector<SVGSVGElement>("svg")
    updated?.focus()
    updated?.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "End",
        bubbles: true,
      }),
    )
    expect(
      container.querySelector('[role="status"]')
        ?.textContent,
    ).toContain("400")
    await act(() => render(null, container))
    expect(container.childElementCount).toBe(0)
  } finally {
    render(null, container)
    container.remove()
  }
})
