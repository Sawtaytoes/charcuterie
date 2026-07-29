/**
 * Emits the generated token artifacts.
 *
 * Deliberately ~200 lines of Node across this and `buildCss.ts`
 * rather than Style Dictionary: the DTCG plugin churn costs more
 * than the generator does, and the generator is the thing that has
 * to stay understandable when a token role is added at 11pm.
 */

import {
  mkdirSync,
  writeFileSync,
} from "node:fs"
import {
  dirname,
  join,
} from "node:path"
import { fileURLToPath } from "node:url"

import {
  buildThemeCss,
  buildVariablesCss,
} from "../src/buildCss.ts"
import { variants } from "../src/variants/index.ts"

/**
 * Until M0 concludes, there is no winner — so the default is the
 * first candidate and the value is meaningless. The pick replaces
 * this with the chosen name, and that one-line diff is the whole
 * "the winner is already a real theme file" claim.
 */
const DEFAULT_VARIANT = "hairline"

const distDirectory = join(
  dirname(
    dirname(fileURLToPath(import.meta.url)),
  ),
  "dist",
)

mkdirSync(distDirectory, { recursive: true })

const artifacts = [
  {
    name: "variables.css",
    contents: buildVariablesCss(
      variants,
      DEFAULT_VARIANT,
    ),
  },
  {
    name: "theme.css",
    contents: buildThemeCss(),
  },
  {
    name: "tokens.json",
    contents: `${
      JSON.stringify(
        Object.fromEntries(
          variants.map((variant) => [
            variant.name,
            variant,
          ]),
        ),
        null,
        2,
      )
    }\n`,
  },
]

for (const artifact of artifacts) {
  writeFileSync(
    join(distDirectory, artifact.name),
    artifact.contents,
    "utf8",
  )

  console.log(
    `wrote dist/${artifact.name} (${
      artifact.contents.length
    } bytes)`,
  )
}
