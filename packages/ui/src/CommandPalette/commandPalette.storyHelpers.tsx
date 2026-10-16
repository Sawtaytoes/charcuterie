import type { ReactNode } from "react"

import {
  ImageIcon,
  InboxIcon,
  LinkIcon,
  MonitorIcon,
  PlayIcon,
  SearchIcon,
  SettingsIcon,
  SunIcon,
} from "../icons.storyHelpers.tsx"
import type {
  CommandPaletteGroup,
  CommandPaletteItem,
  CommandPalettePrefix,
} from "./commandPaletteSections.ts"

/**
 * A generic household launcher: apps, the members of two folders,
 * and a few bookmarks. Every host is `example.com` — this repo is
 * public, and the fixture stands in for a real start page. Each opens
 * in a new tab, so following one from Storybook does not replace the
 * story.
 */
export const LAUNCHER_ITEMS: readonly CommandPaletteItem[] =
  [
    {
      description: "Home",
      group: "Apps",
      hint: "App",
      href: "https://automation.example.com/",
      icon: <SettingsIcon />,
      key: "home-automation",
      keywords: ["lights", "thermostat"],
      target: "_blank",
      title: "Home Automation",
      weight: 40,
    },
    {
      description: "Home Theater",
      group: "Apps",
      hint: "App",
      href: "https://media.example.com/",
      icon: <PlayIcon />,
      key: "media-server",
      keywords: ["movies", "shows"],
      target: "_blank",
      title: "Media Server",
      weight: 25,
    },
    {
      description: "Household",
      group: "Apps",
      hint: "App",
      href: "https://photos.example.com/",
      icon: <ImageIcon />,
      key: "photo-library",
      target: "_blank",
      title: "Photo Library",
      weight: 12,
    },
    {
      description: "Household",
      group: "Apps",
      hint: "App",
      href: "https://tasks.example.com/",
      icon: <InboxIcon />,
      key: "task-board",
      keywords: ["todo", "chores"],
      target: "_blank",
      title: "Task Board",
      weight: 18,
    },
    {
      description: "Network & Admin",
      group: "Apps",
      hint: "App",
      href: "https://proxy.example.com/",
      icon: <SettingsIcon />,
      key: "reverse-proxy-manager",
      target: "_blank",
      title: "Reverse Proxy Manager",
      weight: 3,
    },
    {
      description: "Network & Admin",
      group: "Apps",
      hint: "App",
      href: "https://storage.example.com/",
      icon: <MonitorIcon />,
      key: "storage-server",
      keywords: ["nas", "pools"],
      target: "_blank",
      title: "Storage Server",
      weight: 9,
    },
    {
      description: "Remotes",
      group: "Apps",
      hint: "App",
      href: "https://remote-living.example.com/",
      icon: <MonitorIcon />,
      key: "living-room-remote",
      target: "_blank",
      title: "Living Room Remote",
    },
    {
      description: "Remotes",
      group: "Apps",
      hint: "App",
      href: "https://remote-bedroom.example.com/",
      icon: <MonitorIcon />,
      key: "bedroom-remote",
      target: "_blank",
      title: "Bedroom Remote",
    },
    {
      description: "Speed Tests",
      group: "Apps",
      hint: "App",
      href: "https://speed.example.com/",
      icon: <MonitorIcon />,
      key: "speed-test",
      target: "_blank",
      title: "Speed Test",
    },
    {
      description: "Bookmarks",
      group: "Bookmarks",
      hint: "Bookmark",
      href: "https://weather.example.com/",
      icon: <SunIcon />,
      key: "weather-forecast",
      keywords: ["rain"],
      target: "_blank",
      title: "Weather Forecast",
    },
    {
      description: "Bookmarks",
      group: "Bookmarks",
      hint: "Bookmark",
      href: "https://parcels.example.com/",
      icon: <LinkIcon />,
      key: "package-tracking",
      keywords: ["shipping", "parcels"],
      target: "_blank",
      title: "Package Tracking",
    },
    {
      description: "Bookmarks",
      group: "Bookmarks",
      hint: "Bookmark",
      href: "https://recipes.example.com/",
      icon: <LinkIcon />,
      key: "recipe-box",
      keywords: ["cooking", "meals"],
      target: "_blank",
      title: "Recipe Box",
    },
  ]

const byKey = (key: string): CommandPaletteItem => {
  const item = LAUNCHER_ITEMS.find(
    (candidate) => candidate.key === key,
  )

  if (item === undefined) {
    throw new Error(`No fixture item "${key}"`)
  }

  return item
}

export const LAUNCHER_SUGGESTIONS: readonly CommandPaletteGroup[] =
  [
    {
      items: [
        byKey("home-automation"),
        byKey("media-server"),
        byKey("task-board"),
      ],
      key: "pinned",
      label: "Pinned",
    },
    {
      items: [
        {
          ...byKey("weather-forecast"),
          hint: "2 hours ago",
        },
        { ...byKey("storage-server"), hint: "Yesterday" },
        { ...byKey("photo-library"), hint: "3 days ago" },
      ],
      key: "recent",
      label: "Recently opened",
    },
  ]

const searchHref =
  (host: string) =>
  (query: string): string =>
    `https://${host}.example.com/search?q=${encodeURIComponent(query)}`

export const LAUNCHER_PREFIXES: readonly CommandPalettePrefix[] =
  [
    {
      getHref: searchHref("auction"),
      icon: <SearchIcon />,
      label: "Auction Site",
      prefix: "au",
    },
    {
      getHref: searchHref("shop"),
      icon: <SearchIcon />,
      label: "Shopping Site",
      prefix: "sh",
    },
    {
      getHref: searchHref("video"),
      icon: <SearchIcon />,
      label: "Video Site",
      prefix: "vi",
    },
  ]

export const getWebSearchItem = (
  query: string,
): CommandPaletteItem => ({
  group: "The web",
  hint: "Search",
  href: searchHref("web")(query),
  icon: <SearchIcon />,
  key: "web-search",
  target: "_blank",
  title: `Search the web for “${query}”`,
})

/** The bordered box an inline panel sits in on a board, standing in for the dialog's own. */
export const PanelFrame = ({
  children,
}: {
  children: ReactNode
}): ReactNode => (
  <div className="flex max-h-[28rem] w-full flex-col overflow-hidden rounded-lg border border-border-default bg-surface-overlay text-content-primary shadow-high">
    {children}
  </div>
)
