Feature: Button
  A button starts one action. It responds the same way to a mouse and a
  keyboard, and it tells everyone, including screen reader users, when it
  cannot be used.

  Rule: People and agents find a button by its role and name

    @REQ-UI-004
    Scenario: A button can be identified by its role and name
      Given the Button playground is open
      Then the button named "Start rip" is accessible by role and name

  Rule: A button responds the same way to a mouse and a keyboard

    @REQ-UI-001
    Scenario Outline: A keyboard user activates a button with <key>
      Given the Button playground is open
      When I press Tab
      Then the button named "Start rip" has focus
      And the button named "Start rip" has not been activated
      When I press <key>
      Then the button named "Start rip" has been activated 1 time

      Examples:
        | key   |
        | Enter |
        | Space |

    @REQ-UI-006
    Scenario: A mouse user activates a button
      Given the Button playground is open
      When I click the button named "Start rip"
      Then the button named "Start rip" has been activated 1 time

  Rule: A button that cannot be used says so

    @REQ-UI-002
    Scenario: A disabled button ignores clicks, and Tab does not focus it
      Given a disabled Button is open
      When I click the button named "Start rip"
      Then the button named "Start rip" is disabled
      And the button named "Start rip" has not been activated
      When I press Tab
      Then the button named "Start rip" does not have focus

    @REQ-UI-003
    Scenario: A busy button announces its state
      Given the loading Button is open
      Then the button named "Loading… Ripping disc 3" is accessible by role and name
      And the button named "Loading… Ripping disc 3" is disabled
      And the button named "Loading… Ripping disc 3" is busy
      And the status named "Loading…" is visible

    @REQ-UI-005
    Scenario: The states board includes a busy button
      Given the Button states board is open
      Then the button named "Loading… Start rip" is busy
