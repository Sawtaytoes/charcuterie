/**
 * The answer to "which code runs for this line?" — the question
 * Gherkin is worst at, because the feature and its step definitions
 * live in different files and are joined only by pattern matching
 * at runtime.
 *
 * Given a feature line, a requirement ID, or step text, this prints
 * the matched definition with its file:line, the helpers it calls
 * with theirs, and the files its step file loads beyond the runtime
 * every scenario shares. An agent debugging a failure starts there.
 *
 * @typedef {import("./check.js").Analysis} Analysis
 * @typedef {import("./check.js").StepMatch} StepMatch
 */

/**
 * @param {Analysis} analysis
 * @param {import("./sources.js").StepDefinition} definition
 * @param {string} indent
 */
const describeDefinition = (
  analysis,
  definition,
  indent,
) => {
  const lines = [
    `${indent}definition  ${definition.file}:${definition.line}  ${definition.kind}("${definition.expression}")`,
  ]

  if (definition.summary) {
    lines.push(`${indent}            ${definition.summary}`)
  }

  for (const [index, call] of analysis.sources
    .callsOf(definition)
    .entries()) {
    const label = index === 0 ? "calls     " : "          "

    lines.push(
      `${indent}${label}  ${call.file}:${call.line}  ${call.name}`,
    )
  }

  const loaded = [...analysis.sources.reachOf(definition)]
    .filter((key) => key !== definition.file)
    .sort(
      (left, right) =>
        Number(left.startsWith("..")) -
          Number(right.startsWith("..")) ||
        left.localeCompare(right),
    )

  for (const [index, key] of loaded.entries()) {
    const label = index === 0 ? "loads     " : "          "

    lines.push(`${indent}${label}  ${key}`)
  }

  return lines
}

/**
 * @param {Analysis} analysis
 * @param {StepMatch} match
 */
const describeMatch = (analysis, match) => {
  const id =
    match.scenario.ownTags.find((tag) =>
      analysis.idPattern.test(tag.name),
    )?.name ?? "(no ID)"
  const header = `${match.step.file}:${match.step.line}  ${match.step.keyword} ${match.step.text}  [${id.replace(/^@/, "")}]`

  if (match.matches.length === 0) {
    return [
      header,
      "  UNDEFINED  no step definition matches this text",
    ]
  }

  if (match.matches.length > 1) {
    return [
      header,
      `  AMBIGUOUS  ${match.matches.length} definitions match:`,
      ...match.matches.flatMap((definition) =>
        describeDefinition(analysis, definition, "    "),
      ),
    ]
  }

  const [definition] = match.matches

  return definition
    ? [
        header,
        ...describeDefinition(analysis, definition, "  "),
      ]
    : [header]
}

/**
 * Outline steps produce one match per example row. Show each
 * distinct text once.
 *
 * @param {StepMatch[]} matches
 */
const unique = (matches) => {
  /** @type {Set<string>} */
  const seen = new Set()

  return matches.filter((match) => {
    const key = `${match.step.file}:${match.step.line}:${match.step.text}`

    if (seen.has(key)) {
      return false
    }

    seen.add(key)

    return true
  })
}

/**
 * @param {Analysis} analysis
 * @param {string} target `file.feature:line`, a requirement ID, or step text
 * @returns {string | null} null when nothing matched
 */
export const traceTarget = (analysis, target) => {
  const location = /^(.+\.feature):(\d+)$/.exec(target)

  if (location) {
    const [, file = "", lineText = "0"] = location
    const line = Number(lineText)
    const matches = analysis.stepMatches.filter(
      (match) =>
        match.step.line === line &&
        (match.step.file === file ||
          match.step.file.endsWith(`/${file}`) ||
          file.endsWith(`/${match.step.file}`)),
    )

    if (matches.length > 0) {
      return unique(matches)
        .flatMap((match) => describeMatch(analysis, match))
        .join("\n")
    }

    const scenarioMatches = analysis.stepMatches.filter(
      (match) =>
        match.scenario.line === line &&
        (match.step.file === file ||
          match.step.file.endsWith(`/${file}`) ||
          file.endsWith(`/${match.step.file}`)),
    )

    return scenarioMatches.length > 0
      ? unique(scenarioMatches)
          .flatMap((match) =>
            describeMatch(analysis, match),
          )
          .join("\n")
      : null
  }

  const idMatches = analysis.stepMatches.filter((match) =>
    match.scenario.ownTags.some(
      (tag) => tag.name === `@${target.replace(/^@/, "")}`,
    ),
  )

  if (idMatches.length > 0) {
    const [first] = idMatches

    return [
      `${first?.scenario.file}:${first?.scenario.line}  ${first?.scenario.keyword}: ${first?.scenario.name}`,
      "",
      ...unique(idMatches).flatMap((match) => [
        ...describeMatch(analysis, match),
        "",
      ]),
    ]
      .join("\n")
      .trimEnd()
  }

  const text = target.replace(
    /^(Given|When|Then|And|But)\s+/,
    "",
  )
  const textMatches = analysis.stepMatches.filter(
    (match) => match.step.text === text,
  )

  if (textMatches.length > 0) {
    return unique(textMatches)
      .flatMap((match) => describeMatch(analysis, match))
      .join("\n")
  }

  const definitions = analysis.sources.definitions.filter(
    (definition) =>
      definition.expression === text ||
      definition.expression.includes(text),
  )

  return definitions.length > 0
    ? definitions
        .flatMap((definition) =>
          describeDefinition(analysis, definition, ""),
        )
        .join("\n")
    : null
}

/**
 * Every step in every feature, traced: the whole map at once.
 *
 * @param {Analysis} analysis
 */
export const traceIndex = (analysis) =>
  unique(analysis.stepMatches)
    .flatMap((match) => [
      ...describeMatch(analysis, match),
      "",
    ])
    .join("\n")
    .trimEnd()

/**
 * The same map as data, for tools.
 *
 * @param {Analysis} analysis
 */
export const traceIndexJson = (analysis) =>
  unique(analysis.stepMatches).map((match) => ({
    feature: `${match.step.file}:${match.step.line}`,
    step: `${match.step.keyword} ${match.step.text}`,
    requirement:
      match.scenario.ownTags
        .find((tag) => analysis.idPattern.test(tag.name))
        ?.name.slice(1) ?? null,
    definitions: match.matches.map((definition) => ({
      location: `${definition.file}:${definition.line}`,
      kind: definition.kind,
      expression: definition.expression,
      summary: definition.summary,
      calls: analysis.sources
        .callsOf(definition)
        .map(
          (call) =>
            `${call.file}:${call.line} ${call.name}`,
        ),
      loads: [
        ...analysis.sources.reachOf(definition),
      ].filter((key) => key !== definition.file),
    })),
  }))
