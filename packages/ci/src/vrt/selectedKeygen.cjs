/** reg-suit's supported local key-generator plugin, fed by the fail-closed preflight. */
module.exports = () => ({
  keyGenerator: {
    init({ options: writtenOptions }) {
      // `writeRegConfig.js` leaves a null `expectedKey` out of the
      // config, because reg-suit's placeholder expansion throws on a
      // null. Absent means null here, and nothing else does.
      const options = {
        ...writtenOptions,
        expectedKey: writtenOptions.expectedKey ?? null,
      }
      if (
        options.expectedKey === options.actualKey ||
        !/^[0-9a-f]{40}$/.test(options.actualKey) ||
        !(
          options.expectedKey === null ||
          /^[0-9a-f]{40}$/.test(options.expectedKey)
        ) ||
        (options.expectedKey === null) !==
          (options.isInitialBaseline === true)
      ) {
        throw new Error("Invalid preflight snapshot keys")
      }
      const head = require("node:child_process")
        .execFileSync("git", ["rev-parse", "HEAD"], {
          encoding: "utf8",
        })
        .trim()
      if (head !== options.actualKey)
        throw new Error(
          "Git HEAD changed after baseline preflight",
        )
      this.selection = options
    },
    getExpectedKey() {
      return Promise.resolve(this.selection.expectedKey)
    },
    getActualKey() {
      return Promise.resolve(this.selection.actualKey)
    },
  },
})
