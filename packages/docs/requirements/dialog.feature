Feature: Dialog
  A dialog asks one question over the page. While it is open it holds
  keyboard focus, it closes the way a person expects, and it gives focus
  back to the control that opened it.

  Rule: A dialog is named by its question and can be found anywhere on the page

    @REQ-UI-007
    Scenario: An open dialog can be identified by its role and name
      Given the Dialog story "Playground" is open
      When I click the button named "Show the read error"
      Then the dialog named "Read error on title 4" is accessible by role and name
      And the dialog named "Read error on title 4" passes an accessibility audit

    @REQ-UI-008
    Scenario: A dialog with no body is its question and its answers
      Given the Dialog story "No Body" is open
      When I click the button named "Delete the file"
      Then the dialog named "Delete this file? This cannot be undone." is accessible by role and name
      And the button named "Delete" is accessible by role and name
      And the dialog named "Delete this file? This cannot be undone." passes an accessibility audit

  Rule: An open dialog holds keyboard focus and gives it back when it closes

    @REQ-UI-009
    Scenario: Escape closes a dialog and returns focus to the button that opened it
      Given the Dialog story "Interactive" is open
      Then the button named "Stop the rip" is accessible by role and name
      When I click the button named "Stop the rip"
      Then the dialog named "Stop the rip?" is accessible by role and name
      And focus is inside the dialog named "Stop the rip?"
      When I press Escape
      Then the dialog named "Stop the rip?" has closed
      And the button named "Stop the rip" has focus

    @REQ-UI-010
    Scenario: A dialog that holds a form puts the caret in its field
      Given the Dialog story "Initial Focus" is open
      When I click the button named "Add a title"
      Then the textbox named "Title" is accessible by role and name
      And the textbox named "Title" has focus
      When I type "Sharpen the chisels"
      Then the textbox named "Title" has the value "Sharpen the chisels"

  Rule: A dialog that the app still needs cannot be dismissed

    @REQ-UI-011
    Scenario: A non-dismissable dialog ignores Escape and closes from its own answer
      Given the Dialog story "All States" is open
      When I click the button named "Not dismissable"
      Then the dialog named "This erases eight completed titles" is accessible by role and name
      And there is no button named "Close"
      When I press Escape
      Then the dialog named "This erases eight completed titles" is visible
      When I click the button named "Keep the titles"
      Then the dialog named "This erases eight completed titles" has closed

  Rule: Layers close from the top down

    @REQ-UI-012
    Scenario: A second dialog covers the first, and they close top-first
      Given the Dialog story "Stacked" is open
      When I click the button named "Open the first dialog"
      And I click the button named "Open a second over it"
      Then the dialog named "Second dialog" is accessible by role and name
      And the dialog named "First dialog" is hidden from assistive technology
      And focus is inside the dialog named "Second dialog"
      And the button named "Close this one" is accessible by role and name
      And the button named "Close this one" is not covered
      When I click outside the dialog
      Then the dialog named "Second dialog" has closed
      And the dialog named "First dialog" is accessible by role and name
      When I press Escape
      Then every dialog has closed

    @REQ-UI-013
    Scenario: Escape closes a picker inside a dialog, and the next Escape closes the dialog
      Given the Dialog story "Picker Draft" is open
      Then the textbox named "Draft name" is accessible by role and name
      When I replace the text in the textbox named "Draft name" with "An unsaved change"
      And I click the button named "Draft parent: No parent"
      Then the option named "No parent" has focus
      When I press Escape
      Then every listbox has closed
      And the button named "Draft parent: No parent" has focus
      And the dialog named "Edit a draft" is visible
      And the textbox named "Draft name" has the value "An unsaved change"
      When I click the button named "Draft parent: No parent"
      Then the option named "No parent" has focus
      When I press Escape
      Then every listbox has closed
      When I press Escape
      Then the dialog named "Edit a draft" has closed

    @REQ-UI-014
    Scenario: A click elsewhere in a dialog closes only its picker, which still opens and chooses
      Given the Dialog story "Picker Draft" is open
      When I replace the text in the textbox named "Draft name" with "An unsaved change"
      And I click the button named "Draft parent: No parent"
      Then the option named "No parent" has focus
      When I click the textbox named "Draft name"
      Then every listbox has closed
      And the dialog named "Edit a draft" is visible
      And the textbox named "Draft name" has the value "An unsaved change"
      When I click the button named "Draft parent: No parent"
      And I click the option named "Another draft"
      Then the dialog named "Edit a draft" is visible
      And the button named "Draft parent: Another draft" has focus
      When I press Escape
      Then the dialog named "Edit a draft" has closed

    @REQ-UI-015
    Scenario: Choosing an option keeps the dialog open, and the next Escape closes it
      Given the Dialog story "Picker Draft" is open
      When I click the button named "Draft parent: No parent"
      And I click the option named "Another draft"
      Then the dialog named "Edit a draft" is visible
      And the button named "Draft parent: Another draft" has focus
      When I press Escape
      Then the dialog named "Edit a draft" has closed
