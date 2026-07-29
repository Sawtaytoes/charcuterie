/**
 * `legible` — maximum contrast, saturated intents, no subtlety.
 *
 * Every content-on-surface pair here is aimed at WCAG AAA (7:1)
 * rather than AA, intent colours are pushed until they are
 * distinguishable at a glance and not merely on inspection, and
 * borders are visible rather than implied.
 *
 * Bet: the fleet's UI is read under bad conditions — a garage at
 * 2am with a failing rip, a tablet at arm's length, a kiosk across
 * a room, an ePaper panel with six colours and no backlight. This
 * direction optimises for the worst case rather than the demo.
 *
 * It also functions as the **control on the upper bound**: if the
 * winner is one of the other three, this one's contrast numbers
 * are the benchmark it should be judged against.
 *
 * Risk: high-contrast UI is tiring over a long session, and
 * saturated status colours make everything look like an alert.
 */

import type { Variant } from "../types.ts"
import {
  defaultControl,
  defaultMotion,
  defaultTypography,
} from "../variantDefaults.ts"

export const legible: Variant = {
  name: "legible",
  title: "Legible",
  description:
    "AAA-targeted contrast, saturated intents, visible borders. Optimises for a garage at 2am, not for a demo.",

  ramps: {
    neutral: {
      50: "#FAF9F7",
      100: "#F0EEEA",
      200: "#DAD7D0",
      300: "#ABA69B",
      400: "#7C776C",
      500: "#5C5850",
      600: "#403D37",
      700: "#2A2823",
      800: "#171613",
      900: "#0B0B09",
      950: "#000000",
    },
    azure: {
      100: "#DCE9FF",
      300: "#9CC0FF",
      500: "#3D7DE8",
      700: "#1E4FA8",
      900: "#0C2143",
    },
  },

  schemes: {
    dark: {
      surface: {
        base: "#0B0B09",
        raised: "#171613",
        sunken: "#000000",
        overlay: "#1F1E1A",
        inverse: "#FAF9F7",
      },
      content: {
        primary: "#FAF9F7",
        secondary: "#CFCBC2",
        muted: "#A8A398",
        disabled: "#6B675E",
        onAccent: "#04101F",
      },
      border: {
        subtle: "#2A2823",
        default: "#403D37",
        strong: "#8B857A",
        focus: "#FFD24A",
      },
      intent: {
        neutral: {
          surface: "#1F1E1A",
          surfaceHover: "#2A2823",
          border: "#5C5850",
          content: "#DAD7D0",
          solid: "#403D37",
          solidHover: "#4E4A43",
          onSolid: "#FAF9F7",
        },
        accent: {
          surface: "#0C2143",
          surfaceHover: "#122C56",
          border: "#1E4FA8",
          content: "#9CC0FF",
          solid: "#3D7DE8",
          solidHover: "#4C8BF2",
          onSolid: "#04101F",
        },
        success: {
          surface: "#052C1B",
          surfaceHover: "#083A24",
          border: "#12693F",
          content: "#5BE59C",
          solid: "#1FBE72",
          solidHover: "#26D07E",
          onSolid: "#02170D",
        },
        warning: {
          surface: "#332403",
          surfaceHover: "#422F05",
          border: "#8A6408",
          content: "#FFD24A",
          solid: "#F0B41E",
          solidHover: "#FFC42E",
          onSolid: "#1C1300",
        },
        danger: {
          surface: "#3A0D10",
          surfaceHover: "#4B1216",
          border: "#93202A",
          content: "#FF9091",
          solid: "#E8484C",
          solidHover: "#F5595C",
          onSolid: "#16090A",
        },
        info: {
          surface: "#04252F",
          surfaceHover: "#07313E",
          border: "#0F5C74",
          content: "#66D2EE",
          solid: "#2AA5C6",
          solidHover: "#31B6D9",
          onSolid: "#02141A",
        },
      },
      focus: {
        ring: "#FFD24A",
        ringOffset: "#0B0B09",
      },
      elevation: {
        none: "none",
        low: "0 1px 0 rgb(255 255 255 / 0.06)",
        medium: "0 6px 18px rgb(0 0 0 / 0.60)",
        high: "0 18px 44px rgb(0 0 0 / 0.70)",
      },
    },

    light: {
      surface: {
        base: "#F0EEEA",
        raised: "#FAF9F7",
        sunken: "#DAD7D0",
        overlay: "#FFFFFF",
        inverse: "#171613",
      },
      content: {
        primary: "#0B0B09",
        secondary: "#403D37",
        muted: "#5C5850",
        disabled: "#9A958B",
        onAccent: "#FFFFFF",
      },
      border: {
        subtle: "#DAD7D0",
        default: "#ABA69B",
        strong: "#6B665C",
        focus: "#8A4B00",
      },
      intent: {
        neutral: {
          surface: "#E4E1DB",
          surfaceHover: "#DAD7D0",
          border: "#ABA69B",
          content: "#2A2823",
          solid: "#2A2823",
          solidHover: "#171613",
          onSolid: "#FAF9F7",
        },
        accent: {
          surface: "#DCE9FF",
          surfaceHover: "#C9DCFF",
          border: "#7FA9F0",
          content: "#123C88",
          solid: "#1E4FA8",
          solidHover: "#173F8B",
          onSolid: "#FFFFFF",
        },
        success: {
          surface: "#D8F1E2",
          surfaceHover: "#C4E9D4",
          border: "#7CC9A0",
          content: "#0A4A2C",
          solid: "#0C5C36",
          solidHover: "#094B2C",
          onSolid: "#FFFFFF",
        },
        warning: {
          surface: "#FCEBC6",
          surfaceHover: "#F8DFAC",
          border: "#D6A93C",
          content: "#553800",
          solid: "#7A5000",
          solidHover: "#634100",
          onSolid: "#FFFFFF",
        },
        danger: {
          surface: "#FDE2E3",
          surfaceHover: "#FBCFD1",
          border: "#EC9EA1",
          content: "#7A0C14",
          solid: "#9A1119",
          solidHover: "#800E15",
          onSolid: "#FFFFFF",
        },
        info: {
          surface: "#D9EEF6",
          surfaceHover: "#C4E4EF",
          border: "#77C0DA",
          content: "#0A3C4C",
          solid: "#0A4B60",
          solidHover: "#083D4E",
          onSolid: "#FFFFFF",
        },
      },
      focus: {
        ring: "#8A4B00",
        ringOffset: "#F0EEEA",
      },
      elevation: {
        none: "none",
        low: "0 1px 0 rgb(11 11 9 / 0.12)",
        medium: "0 6px 18px rgb(11 11 9 / 0.14)",
        high: "0 18px 44px rgb(11 11 9 / 0.20)",
      },
    },
  },

  radius: {
    none: "0px",
    sm: "4px",
    md: "6px",
    lg: "9px",
    xl: "12px",
    full: "9999px",
  },

  motion: {
    ...defaultMotion,
    duration: {
      instant: "0ms",
      fast: "100ms",
      normal: "160ms",
      slow: "240ms",
    },
  },

  typography: {
    ...defaultTypography,
    fontSize: {
      xs: "0.8125rem",
      sm: "0.875rem",
      md: "0.9375rem",
      lg: "1.0625rem",
      xl: "1.3125rem",
      "2xl": "1.625rem",
    },
    fontWeight: {
      normal: "450",
      medium: "550",
      semibold: "650",
      bold: "750",
    },
  },

  control: defaultControl,

  focusRing: {
    // A thicker ring, because the whole premise is bad conditions.
    width: "3px",
    offset: "2px",
  },
}
