Feature: Button actions remain available to keyboard users
  A button must announce when it is unavailable or busy, and it must
  respond to the same actions whether a person uses a mouse or keyboard.

  @REQ-UI-001
  Scenario: A keyboard user activates a button
    Given the Button playground is open
    When I press Tab to focus the button named "Start rip"
    And I press Enter
    Then the button named "Start rip" has been activated 1 time
    When I press Space
    Then the button named "Start rip" has been activated 2 times

  @REQ-UI-002
  Scenario: A disabled button cannot start an action
    Given a disabled Button is open
    When I click the button named "Start rip"
    Then the button named "Start rip" is disabled
    And no action has been started

  @REQ-UI-003
  Scenario: A busy button announces its state
    Given the loading Button is open
    Then the button named "Loading… Ripping disc 3" is disabled
    And the button named "Loading… Ripping disc 3" is busy
    And a status message is visible
