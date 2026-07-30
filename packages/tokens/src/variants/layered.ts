/**
 * `layered` — soft, large radii, layered surfaces, springy motion.
 *
 * Separation comes from a real surface step and a shadow; borders
 * are nearly absent. Radii are 12–20px, motion is 200–320ms on an
 * overshooting curve, and the accent is warm rather than blue.
 *
 * Bet: the surfaces people actually *stand in front of* are the
 * kiosk Pis and xander. Big soft shapes and generous spacing
 * survive being read from across a room, where a 1px hairline
 * simply does not exist.
 *
 * Risk: eats vertical space, so a bay list fits fewer rows; and
 * shadow-based separation collapses to nothing on ePaper.
 *
 * Use it for: the kiosk Pi and xander, two or three metres away,
 * driven by a finger or a remote — paired with
 * `data-density="kiosk"`. Never for ePaper. Long form on
 * `Tokens/Overview`.
 */

import type { Variant } from "../types.ts"
import {
  defaultControl,
  defaultTypography,
} from "../variantDefaults.ts"

export const layered: Variant = {
  name: "layered",
  title: "Layered",
  description:
    "Soft surfaces, large radii, springy 200ms motion, warm accent. Built for across-the-room kiosks.",

  ramps: {
    neutral: {
      50: "#F7F5F7",
      100: "#EFEDF1",
      200: "#DCD9E1",
      300: "#B9B5C4",
      400: "#8C8799",
      500: "#6C6779",
      600: "#514D5C",
      700: "#343141",
      800: "#1E1C28",
      900: "#131118",
      950: "#0B0A0F",
    },
    coral: {
      100: "#FCE9E4",
      300: "#F9AFA1",
      500: "#E8604A",
      700: "#B03A28",
      900: "#3A1611",
    },
  },

  schemes: {
    dark: {
      surface: {
        base: "#131118",
        raised: "#1E1C28",
        sunken: "#0B0A0F",
        overlay: "#282534",
        inverse: "#F7F5F7",
      },
      content: {
        primary: "#F3F1F6",
        secondary: "#B3AEC0",
        muted: "#9A95AB",
        disabled: "#5B5670",
        // Dark, not white: this direction's accent is a vivid
        // coral, and vivid warm fills carry near-black better than
        // white. See `intent.accent.onSolid`, which this mirrors.
        onAccent: "#2A0D07",
      },
      border: {
        subtle: "#221F2C",
        default: "#302D3E",
        strong: "#6F6B80",
        focus: "#F0836E",
      },
      intent: {
        neutral: {
          surface: "#242130",
          surfaceHover: "#2E2B3C",
          border: "#3A3648",
          content: "#C0BBD0",
          solid: "#3A3648",
          solidHover: "#474357",
          onSolid: "#F3F1F6",
        },
        accent: {
          surface: "#3A1611",
          surfaceHover: "#4A1D16",
          border: "#66291F",
          content: "#F9AFA1",
          solid: "#E8604A",
          solidHover: "#F2705B",
          onSolid: "#2A0D07",
        },
        success: {
          surface: "#0F2C22",
          surfaceHover: "#15392C",
          border: "#1F4E3B",
          content: "#72E0B0",
          solid: "#199C6C",
          solidHover: "#1DB37B",
          onSolid: "#04150E",
        },
        warning: {
          surface: "#332612",
          surfaceHover: "#403018",
          border: "#584121",
          content: "#F0C878",
          solid: "#D89B2E",
          solidHover: "#E7A93A",
          onSolid: "#1C1305",
        },
        danger: {
          surface: "#38181D",
          surfaceHover: "#471F25",
          border: "#61272F",
          content: "#FA9494",
          // Deeper and less orange than `accent` on purpose — the
          // two are neighbours on this variant's wheel, and
          // "destructive" reading as "primary" is the one
          // confusion a coral accent must not cause.
          solid: "#C22F2A",
          solidHover: "#D13830",
          onSolid: "#FFFFFF",
        },
        info: {
          surface: "#122630",
          surfaceHover: "#18313E",
          border: "#224555",
          content: "#7ECBE4",
          solid: "#2C8DAC",
          solidHover: "#329DBE",
          onSolid: "#04141B",
        },
      },
      focus: {
        ring: "#F0836E",
        ringOffset: "#131118",
      },
      elevation: {
        none: "none",
        low: "0 2px 6px rgb(0 0 0 / 0.35)",
        medium: "0 8px 24px rgb(0 0 0 / 0.45)",
        high: "0 20px 56px rgb(0 0 0 / 0.55)",
      },
    },

    light: {
      surface: {
        base: "#F4F1F5",
        raised: "#FFFFFF",
        sunken: "#E9E5EC",
        overlay: "#FFFFFF",
        inverse: "#1E1C28",
      },
      content: {
        primary: "#1C1A24",
        secondary: "#514D5C",
        muted: "#676274",
        disabled: "#A9A4B6",
        onAccent: "#FFFFFF",
      },
      border: {
        subtle: "#E7E3EB",
        default: "#DCD9E1",
        strong: "#8D8899",
        focus: "#B03A28",
      },
      intent: {
        neutral: {
          surface: "#EDEAF0",
          surfaceHover: "#E4E0E9",
          border: "#DCD9E1",
          content: "#413D4C",
          solid: "#413D4C",
          solidHover: "#514D5C",
          onSolid: "#FFFFFF",
        },
        accent: {
          surface: "#FCE9E4",
          surfaceHover: "#F9DCD4",
          border: "#F2BDB0",
          content: "#9E3221",
          solid: "#B03A28",
          solidHover: "#983122",
          onSolid: "#FFFFFF",
        },
        success: {
          surface: "#E2F4EC",
          surfaceHover: "#D3EDE1",
          border: "#AEDCC7",
          content: "#166046",
          solid: "#12734F",
          solidHover: "#0F6144",
          onSolid: "#FFFFFF",
        },
        warning: {
          surface: "#FAEFD8",
          surfaceHover: "#F5E5C4",
          border: "#E9CE94",
          content: "#6A4708",
          solid: "#855D09",
          solidHover: "#6F4D07",
          onSolid: "#FFFFFF",
        },
        danger: {
          surface: "#FBE8E8",
          surfaceHover: "#F7D9D9",
          border: "#F0BCBC",
          content: "#8B1D21",
          solid: "#B22429",
          solidHover: "#9A1F23",
          onSolid: "#FFFFFF",
        },
        info: {
          surface: "#E2F0F7",
          surfaceHover: "#D2E8F2",
          border: "#ACD4E5",
          content: "#0F4759",
          solid: "#105E74",
          solidHover: "#0C4F62",
          onSolid: "#FFFFFF",
        },
      },
      focus: {
        ring: "#B03A28",
        ringOffset: "#F4F1F5",
      },
      elevation: {
        none: "none",
        low: "0 2px 6px rgb(28 26 36 / 0.07)",
        medium: "0 8px 24px rgb(28 26 36 / 0.10)",
        high: "0 20px 56px rgb(28 26 36 / 0.16)",
      },
    },
  },

  radius: {
    none: "0px",
    sm: "8px",
    md: "12px",
    lg: "16px",
    xl: "22px",
    full: "9999px",
  },

  motion: {
    duration: {
      instant: "0ms",
      fast: "140ms",
      normal: "220ms",
      slow: "340ms",
      loopFast: "780ms",
      loopSlow: "1500ms",
    },
    easing: {
      // Overshoots slightly — this is the "springy" in the bet.
      standard: "cubic-bezier(0.34, 1.56, 0.64, 1)",
      entrance: "cubic-bezier(0.16, 1, 0.3, 1)",
      exit: "cubic-bezier(0.7, 0, 0.84, 0)",
      emphasized: "cubic-bezier(0.34, 1.56, 0.64, 1)",
    },
  },

  typography: {
    ...defaultTypography,
    fontSize: {
      xs: "0.8125rem",
      sm: "0.875rem",
      md: "0.9375rem",
      lg: "1.0625rem",
      xl: "1.375rem",
      "2xl": "1.75rem",
    },
    lineHeight: {
      tight: "1.3",
      normal: "1.6",
      relaxed: "1.8",
    },
  },

  control: {
    ...defaultControl,
    height: {
      sm: "2.25rem",
      md: "2.625rem",
      lg: "3.125rem",
    },
    paddingInline: {
      sm: "0.875rem",
      md: "1.125rem",
      lg: "1.375rem",
    },
  },

  focusRing: {
    width: "2px",
    offset: "3px",
  },
}
