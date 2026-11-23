Feature: Field
  A field gives one control its label, its help text, and its error, so
  a person who reaches the control hears all three, in that order.

  Rule: The label names the control, and the help text describes it

    @REQ-UI-016
    Scenario: A text field is named by its label and described by its help text
      Given the Field story "Playground" is open
      Then the textbox named "Output directory" is accessible by role and name
      And the textbox named "Output directory" is described as "Where finished rips are moved."
      And the story passes an accessibility audit

    @REQ-UI-017
    Scenario: A picker in a field is named by its label and its value
      Given the Field story "All Variants" is open
      Then the button named "Rip profile: Lossless" is accessible by role and name
      And the story passes an accessibility audit

  Rule: A required field says so to the browser and to a screen reader

    @REQ-UI-018
    Scenario: A required text field is required both ways
      Given the Field story "All Variants" is open
      Then the textbox named "Disc label" is accessible by role and name
      And the textbox named "Disc label" is required

  Rule: Only an error makes a field invalid, and the error is read after the help text

    @REQ-UI-019
    Scenario: A field with an error is invalid and announces the error
      Given the Field story "All States" is open
      Then the textbox named "Bay name" is accessible by role and name
      And the textbox named "Bay name" is not marked invalid
      And the textbox named "Scratch path" is accessible by role and name
      And the textbox named "Scratch path" is marked invalid
      And the textbox named "Scratch path" is described as "That path is not writable."
      And the story passes an accessibility audit

    @REQ-UI-020
    Scenario: The help text is read before the error
      Given the Field story "All States" is open
      Then the textbox named "Archive path" is accessible by role and name
      And the textbox named "Archive path" is described as "Absolute paths only. That path is not writable."

    @REQ-UI-021
    Scenario: A caller's own description is read first, then the help text, then the error
      Given the Field story "Forwards Rest Props" is open
      Then the textbox named "Scratch path" is accessible by role and name
      And the textbox named "Scratch path" is described as "Cleared between runs. Absolute paths only. That path is not writable."
      And the textbox named "Scratch path" is marked invalid

  Rule: A field inside a tooltip, or a tooltip inside a field, still reaches the control

    @REQ-UI-022
    Scenario: A field around a tooltip keeps the control required and described
      Given the Field story "Nested" is open
      Then the textbox named "Rename pattern" is accessible by role and name
      And the textbox named "Rename pattern" is required
      And the textbox named "Rename pattern" is described as "Applied to every title."
      And the story passes an accessibility audit

    @REQ-UI-023
    Scenario: Focus opens the inner tooltip, which is read after the help text
      Given the Field story "Nested" is open
      Then the textbox named "Rename pattern" is accessible by role and name
      When I move focus to the textbox named "Rename pattern"
      Then the tooltip named "A JavaScript regular expression." is visible
      And the textbox named "Rename pattern" is described as "Applied to every title. A JavaScript regular expression."

    @REQ-UI-024
    Scenario: Focus opens the outer tooltip, which is read before the error
      Given the Field story "Nested" is open
      Then the textbox named "Archive path" is accessible by role and name
      When I move focus to the textbox named "Archive path"
      Then the tooltip named "Where finished rips are moved." is visible
      And the textbox named "Archive path" is described as "Where finished rips are moved. Not writable."

  Rule: A group of controls is named by its legend

    @REQ-UI-025
    Scenario: A group is named by its legend, and its controls keep their own names
      Given the Field story "Group" is open
      Then the group named "Rename pattern" is accessible by role and name
      And the textbox named "Pattern" is accessible by role and name
      And the textbox named "Flags" is accessible by role and name
      And the textbox named "Sample" is accessible by role and name
      And the group named "Rename pattern" is described as "Applied to every title in the disc."
      And the story passes an accessibility audit

    @REQ-UI-026
    Scenario: A group describes its error instead of marking itself invalid
      Given the Field story "Group" is open
      Then the group named "Chapter split" is accessible by role and name
      And the group named "Chapter split" is not marked invalid
      And the group named "Chapter split" is described as "A pattern needs at least one capture group."

    @REQ-UI-027
    Scenario: A disabled group disables every control inside it
      Given the Field story "Forwards Rest Props" is open
      Then the group named "Playback" is accessible by role and name
      And the group named "Playback" is described as "The whole group is turned off by the element itself."
      And the spinbutton named "Episodes" is disabled
      And the story passes an accessibility audit
