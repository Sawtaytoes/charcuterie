/**
 * `daylight` — light-first, roomy, enterprise-clean.
 *
 * The only candidate designed light-first and then darkened,
 * rather than the reverse. Cool neutrals, a blue-violet accent,
 * generous row height, medium radii, restrained motion.
 *
 * Bet: every app in the fleet is permanently dark today — not
 * because dark was chosen, but because `tailwindStyles.css`
 * hardcodes `#0f172a` and no `dark:` variant exists anywhere. This
 * is the candidate that asks whether the fleet actually wants to
 * be dark, or has just never had the option.
 *
 * Risk: roomy rows are the direct opposite of what a 16-bay list
 * wants, and a light kiosk in a dark room is a lamp.
 */

import type { Variant } from "../types.ts"
import {
  defaultControl,
  defaultMotion,
  defaultTypography,
} from "../variantDefaults.ts"

export const daylight: Variant = {
  name: "daylight",
  title: "Daylight",
  description:
    "Light-first, cool neutrals, roomy rows, restrained motion. Asks whether the fleet wants to be dark at all.",

  ramps: {
    neutral: {
      50: "#F5F7FA",
      100: "#EBEEF3",
      200: "#DDE2EA",
      300: "#B9C1CE",
      400: "#8B94A5",
      500: "#697384",
      600: "#4E5769",
      700: "#333B4A",
      800: "#1D2430",
      900: "#131822",
      950: "#0B0F16",
    },
    violet: {
      100: "#E8E7FD",
      300: "#B4B0F7",
      500: "#5A54E8",
      700: "#3E38C4",
      900: "#1B1950",
    },
  },

  schemes: {
    light: {
      surface: {
        base: "#F5F7FA",
        raised: "#FFFFFF",
        sunken: "#EBEEF3",
        overlay: "#FFFFFF",
        inverse: "#1D2430",
      },
      content: {
        primary: "#171D28",
        secondary: "#4E5769",
        muted: "#616A7C",
        disabled: "#A3ACBB",
        onAccent: "#FFFFFF",
      },
      border: {
        subtle: "#E6EAF0",
        default: "#DDE2EA",
        strong: "#878F9E",
        focus: "#3E38C4",
      },
      intent: {
        neutral: {
          surface: "#EDF0F5",
          surfaceHover: "#E3E8EF",
          border: "#DDE2EA",
          content: "#3B4353",
          solid: "#3B4353",
          solidHover: "#2C3341",
          onSolid: "#FFFFFF",
        },
        accent: {
          surface: "#E8E7FD",
          surfaceHover: "#DCDAFA",
          border: "#C0BCF3",
          content: "#332DAE",
          solid: "#3E38C4",
          solidHover: "#332DAE",
          onSolid: "#FFFFFF",
        },
        success: {
          surface: "#E1F4EA",
          surfaceHover: "#D1EDDF",
          border: "#ABDBC3",
          content: "#14603D",
          solid: "#11744A",
          solidHover: "#0E623E",
          onSolid: "#FFFFFF",
        },
        warning: {
          surface: "#FBEFD6",
          surfaceHover: "#F6E5C1",
          border: "#EACE90",
          content: "#684606",
          solid: "#855D07",
          solidHover: "#6E4D05",
          onSolid: "#FFFFFF",
        },
        danger: {
          surface: "#FCE8E9",
          surfaceHover: "#F8D9DA",
          border: "#F1BBBD",
          content: "#8A1B24",
          solid: "#B0222C",
          solidHover: "#981D26",
          onSolid: "#FFFFFF",
        },
        info: {
          surface: "#E1F0F8",
          surfaceHover: "#D0E7F3",
          border: "#A9D3E7",
          content: "#0D465B",
          solid: "#0E5C76",
          solidHover: "#0B4D63",
          onSolid: "#FFFFFF",
        },
      },
      focus: {
        ring: "#3E38C4",
        ringOffset: "#F5F7FA",
      },
      elevation: {
        none: "none",
        low: "0 1px 3px rgb(19 24 34 / 0.08)",
        medium: "0 4px 14px rgb(19 24 34 / 0.10)",
        high: "0 16px 40px rgb(19 24 34 / 0.14)",
      },
    },

    dark: {
      surface: {
        base: "#131822",
        raised: "#1D2430",
        sunken: "#0B0F16",
        overlay: "#252D3B",
        inverse: "#F5F7FA",
      },
      content: {
        primary: "#EDF0F5",
        secondary: "#A9B2C1",
        muted: "#8B94A5",
        disabled: "#5B6474",
        onAccent: "#FFFFFF",
      },
      border: {
        subtle: "#212936",
        default: "#2E3745",
        strong: "#737D8E",
        focus: "#8C88F2",
      },
      intent: {
        neutral: {
          surface: "#222A37",
          surfaceHover: "#2B3442",
          border: "#374152",
          content: "#B7C0CE",
          solid: "#374152",
          solidHover: "#434D5E",
          onSolid: "#EDF0F5",
        },
        accent: {
          surface: "#1E1C52",
          surfaceHover: "#262363",
          border: "#332F81",
          content: "#B4B0F7",
          solid: "#5A54E8",
          solidHover: "#6A64F0",
          onSolid: "#FFFFFF",
        },
        success: {
          surface: "#0E2B20",
          surfaceHover: "#133828",
          border: "#1C4B36",
          content: "#6FDDA6",
          solid: "#1B9E64",
          solidHover: "#20B372",
          onSolid: "#04150D",
        },
        warning: {
          surface: "#302512",
          surfaceHover: "#3D2F18",
          border: "#544120",
          content: "#ECC673",
          solid: "#D29B2B",
          solidHover: "#E1A936",
          onSolid: "#1B1305",
        },
        danger: {
          surface: "#351920",
          surfaceHover: "#432028",
          border: "#5C2733",
          content: "#F79399",
          solid: "#BE3241",
          solidHover: "#CE3C4B",
          onSolid: "#FFFFFF",
        },
        info: {
          surface: "#102733",
          surfaceHover: "#153341",
          border: "#1F4759",
          content: "#78CAE4",
          solid: "#2A8DAE",
          solidHover: "#309DC0",
          onSolid: "#04141B",
        },
      },
      focus: {
        ring: "#8C88F2",
        ringOffset: "#131822",
      },
      elevation: {
        none: "none",
        low: "0 1px 3px rgb(0 0 0 / 0.40)",
        medium: "0 4px 14px rgb(0 0 0 / 0.48)",
        high: "0 16px 40px rgb(0 0 0 / 0.58)",
      },
    },
  },

  radius: {
    none: "0px",
    sm: "4px",
    md: "8px",
    lg: "10px",
    xl: "14px",
    full: "9999px",
  },

  motion: defaultMotion,

  typography: {
    ...defaultTypography,
    fontSize: {
      xs: "0.75rem",
      sm: "0.8125rem",
      md: "0.9375rem",
      lg: "1.0625rem",
      xl: "1.3125rem",
      "2xl": "1.625rem",
    },
    lineHeight: {
      tight: "1.3",
      normal: "1.6",
      relaxed: "1.75",
    },
  },

  control: {
    ...defaultControl,
    height: {
      sm: "2.125rem",
      md: "2.5rem",
      lg: "3rem",
    },
    paddingInline: {
      sm: "0.75rem",
      md: "1rem",
      lg: "1.25rem",
    },
  },

  focusRing: {
    width: "2px",
    offset: "2px",
  },
}
