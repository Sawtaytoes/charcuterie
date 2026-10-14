Feature: Button actions and accessible states
  A button must announce when it is unavailable or busy, and it must
  respond to the same actions whether a person uses a mouse or keyboard.

  @REQ-UI-004
  Scenario: A button can be identified by its role and name
    Given the Button playground is open
    Then the button named "Start rip" is accessible by role and name

  @REQ-UI-001
  Scenario: A keyboard user activates a button
    Given the Button playground is open
    Then the button named "Start rip" is accessible by role and name
    When I press Tab to focus the button named "Start rip"
    Then no action has been started
    When I press Enter
    Then the button named "Start rip" has been activated 1 time
    When I press Space
    Then the button named "Start rip" has been activated 2 times

  @REQ-UI-002
  Scenario: A disabled button ignores clicks and is skipped by Tab
    Given a disabled Button is open
    When I click the button named "Start rip"
    Then the button named "Start rip" is disabled
    And no action has been started
    When I press Tab
    Then the button named "Start rip" does not have focus

  @REQ-UI-003
  Scenario: A busy button announces its state
    Given the loading Button is open
    Then the button named "Loading… Ripping disc 3" is accessible by role and name
    And the button named "Loading… Ripping disc 3" is disabled
    And the button named "Loading… Ripping disc 3" is busy
    And a status message is visible

  @REQ-UI-005
  Scenario: The states board includes a busy button
    Given the Button states board is open
    Then the button named "Loading… Start rip" is busy

  @REQ-UI-006
  Scenario: A mouse user activates a button
    Given the Button playground is open
    When I click the button named "Start rip"
    Then the button named "Start rip" has been activated 1 time
