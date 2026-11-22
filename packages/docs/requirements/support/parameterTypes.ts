import { defineParameterType } from "quickpickle"

import type { Role } from "../helpers/queries.ts"

/**
 * `{role}` keeps the ARIA role in the sentence, as a person reads it
 * ("the button named …", "the status named …"), while one step
 * definition serves every role.
 *
 * The list is closed on purpose. An open `{word}` would let a typo
 * such as "the buton named …" match and then fail inside the query
 * with a confusing message; a closed list makes it an undefined step,
 * which the checker reports before anything runs. Add a role when a
 * scenario needs it.
 *
 * The regexp must stay a literal: the checker reads it from this
 * file to match steps without running them.
 */
defineParameterType({
  name: "role",
  regexp:
    /button|checkbox|combobox|dialog|link|listbox|menuitem|option|radio|status|switch|tab|textbox/,
  transformer: (role: string) => role as Role,
})
