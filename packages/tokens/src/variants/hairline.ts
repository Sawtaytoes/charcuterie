/**
 * `hairline` — dense, low-chroma, 1px borders, fast motion.
 *
 * Separation comes from a hairline border and a small surface
 * step, not from shadow. Motion is 120ms and linear-ish, so the
 * UI feels immediate rather than animated.
 *
 * Bet: the fleet is mostly **lists of jobs, queues, and bays**.
 * That is the workload this direction is built for — maximum rows
 * legible at once, nothing decorative competing with status
 * colour, which is the only colour that carries meaning.
 *
 * Risk: reads as austere, and at kiosk distance the hairlines may
 * disappear entirely.
 *
 * Use it for: a surface that is mostly rows, read at desk distance.
 * Try `data-density="compact"` on `daylight` first — that is the
 * per-surface axis, and this one is not. The long form, including
 * why all three attributes have to travel together, is on
 * `Tokens/Overview`.
 */

import type { Variant } from "../types.ts"
import {
  defaultControl,
  defaultMotion,
  defaultTypography,
} from "../variantDefaults.ts"

export const hairline: Variant = {
  name: "hairline",
  title: "Hairline",
  description:
    "Dense, low-chroma, hairline borders, 120ms motion. Built for job/queue/bay lists.",

  ramps: {
    neutral: {
      50: "#F6F4F1",
      100: "#EDEAE4",
      200: "#D6D1C8",
      300: "#B4AEA3",
      400: "#868C94",
      500: "#686D74",
      600: "#53575D",
      700: "#2C3138",
      800: "#15171A",
      900: "#0D0E10",
      950: "#08090A",
    },
    indigo: {
      100: "#E9EAFB",
      300: "#AEB6F7",
      500: "#5E6AD2",
      700: "#2F38A8",
      900: "#191D3C",
    },
  },

  schemes: {
    dark: {
      surface: {
        base: "#0D0E10",
        raised: "#15171A",
        sunken: "#08090A",
        overlay: "#1A1D21",
        inverse: "#F2F3F5",
      },
      content: {
        primary: "#EAECEF",
        secondary: "#A7ACB4",
        muted: "#838991",
        disabled: "#565C64",
        onAccent: "#FFFFFF",
      },
      border: {
        subtle: "#1B1E22",
        default: "#282D34",
        strong: "#6A7078",
        focus: "#7C8AF0",
      },
      intent: {
        neutral: {
          surface: "#191C20",
          surfaceHover: "#21252A",
          border: "#2C3138",
          content: "#B6BBC3",
          solid: "#2C3138",
          solidHover: "#363C45",
          onSolid: "#EAECEF",
        },
        accent: {
          surface: "#191D3C",
          surfaceHover: "#202547",
          border: "#2E3563",
          content: "#AEB6F7",
          solid: "#5E6AD2",
          solidHover: "#6D78DC",
          onSolid: "#FFFFFF",
        },
        success: {
          surface: "#0E2A1D",
          surfaceHover: "#133624",
          border: "#1C4832",
          content: "#6EDCA1",
          solid: "#1E9E5F",
          solidHover: "#23B36C",
          onSolid: "#04140C",
        },
        warning: {
          surface: "#2E2411",
          surfaceHover: "#3A2E16",
          border: "#503F1E",
          content: "#E9C46F",
          solid: "#D19A28",
          solidHover: "#E0A833",
          onSolid: "#1A1204",
        },
        danger: {
          surface: "#33171B",
          surfaceHover: "#401D22",
          border: "#58242B",
          content: "#F58E8E",
          solid: "#D2453F",
          solidHover: "#E0524C",
          onSolid: "#FFFFFF",
        },
        info: {
          surface: "#0F2630",
          surfaceHover: "#14313D",
          border: "#1D4554",
          content: "#74C9E0",
          solid: "#2A8CA8",
          solidHover: "#309CBA",
          onSolid: "#04141A",
        },
      },
      focus: {
        ring: "#7C8AF0",
        ringOffset: "#0D0E10",
      },
      elevation: {
        none: "none",
        low: "0 1px 2px rgb(0 0 0 / 0.40)",
        medium: "0 4px 12px rgb(0 0 0 / 0.45)",
        high: "0 12px 32px rgb(0 0 0 / 0.55)",
      },
    },

    light: {
      surface: {
        // Not pure white. "Raised" has to mean *more separated
        // from base*, and a white base leaves raised nowhere to go.
        base: "#F6F4F1",
        raised: "#FFFFFF",
        sunken: "#EDEAE4",
        overlay: "#FFFFFF",
        inverse: "#15171A",
      },
      content: {
        primary: "#1A1C1F",
        secondary: "#53575D",
        muted: "#686D74",
        disabled: "#A9AEB5",
        onAccent: "#FFFFFF",
      },
      border: {
        subtle: "#E7E3DC",
        default: "#D6D1C8",
        strong: "#8F8A80",
        focus: "#4A56C8",
      },
      intent: {
        neutral: {
          surface: "#EFECE6",
          surfaceHover: "#E7E3DB",
          border: "#D6D1C8",
          content: "#3E4247",
          solid: "#3E4247",
          solidHover: "#4C5157",
          onSolid: "#FFFFFF",
        },
        accent: {
          surface: "#E9EAFB",
          surfaceHover: "#DFE1F8",
          border: "#C3C7F0",
          content: "#2F38A8",
          solid: "#4A56C8",
          solidHover: "#3F4BB8",
          onSolid: "#FFFFFF",
        },
        success: {
          surface: "#E4F4EA",
          surfaceHover: "#D7EDE0",
          border: "#B4DCC4",
          content: "#1A5E39",
          solid: "#177346",
          solidHover: "#136139",
          onSolid: "#FFFFFF",
        },
        warning: {
          surface: "#FAF0DA",
          surfaceHover: "#F5E7C8",
          border: "#E8D19A",
          content: "#6C4A0A",
          solid: "#8A5F08",
          solidHover: "#745006",
          onSolid: "#FFFFFF",
        },
        danger: {
          surface: "#FBE9E9",
          surfaceHover: "#F7DBDB",
          border: "#EFBFBF",
          content: "#8D1E22",
          solid: "#B4262B",
          solidHover: "#9C2025",
          onSolid: "#FFFFFF",
        },
        info: {
          surface: "#E3F1F7",
          surfaceHover: "#D4E9F2",
          border: "#AFD6E5",
          content: "#10495C",
          solid: "#116077",
          solidHover: "#0D5164",
          onSolid: "#FFFFFF",
        },
      },
      focus: {
        ring: "#4A56C8",
        ringOffset: "#F6F4F1",
      },
      elevation: {
        none: "none",
        low: "0 1px 2px rgb(20 18 14 / 0.06)",
        medium: "0 4px 12px rgb(20 18 14 / 0.08)",
        high: "0 12px 32px rgb(20 18 14 / 0.12)",
      },
    },
  },

  radius: {
    none: "0px",
    sm: "3px",
    md: "5px",
    lg: "7px",
    xl: "10px",
    full: "9999px",
  },

  motion: {
    ...defaultMotion,
    duration: {
      instant: "0ms",
      fast: "90ms",
      normal: "120ms",
      slow: "180ms",
      loopFast: "620ms",
      loopSlow: "1100ms",
    },
  },

  typography: {
    ...defaultTypography,
    letterSpacing: {
      tight: "-0.014em",
      normal: "-0.006em",
      wide: "0.02em",
    },
  },

  control: defaultControl,

  focusRing: {
    width: "2px",
    offset: "2px",
  },
}
