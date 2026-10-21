Feature: Courses home
  A learner opens Courses, sees progress on each course and continues where they stopped.
  Draft written with docs/superpowers/specs/2026-10-21-courses-home.md; it cannot run until the framework and the page are built.

  Background:
    Given I am logged in

  Scenario: The list shows progress and state for each course
    Given the courses API returns:
      | title  | lessons | completed |
      | HTML   | 5       | 0         |
      | Python | 4       | 2         |
    When I open "/courses"
    Then I see the course "HTML" with state "não iniciado" and progress "0 de 5"
    And I see the course "Python" with state "em andamento" and progress "2 de 4"

  Scenario: A finished course shows as completed
    Given the courses API returns:
      | title | lessons | completed |
      | HTML  | 5       | 5         |
    When I open "/courses"
    Then I see the course "HTML" with state "concluído" and progress "5 de 5"
    And the course "HTML" has a "revisar" button

  Scenario: Courses in progress come first
    Given the courses API returns:
      | title  | lessons | completed |
      | HTML   | 5       | 5         |
      | Git    | 3       | 0         |
      | Python | 4       | 2         |
    When I open "/courses"
    Then the courses are listed in this order: "Python", "Git", "HTML"

  Scenario: Continue opens the first unfinished lesson
    Given the courses API returns a "Python" course with 4 lessons where the first 2 are completed
    When I open "/courses"
    And I press "continuar" on the course "Python"
    Then the address is "/courses/python-course/0-2"
    And I see the lesson player for the third lesson

  Scenario: A course that was never started offers to begin
    Given the courses API returns a "HTML" course with 5 lessons where none are completed
    When I open "/courses"
    Then the course "HTML" has a "começar" button

  Scenario: Opening a course shows its map in the address
    Given the courses API returns a "Python" course with 4 lessons where the first 2 are completed
    When I open "/courses"
    And I press the course "Python"
    Then the address is "/courses/python-course"
    And I see the lesson map of "Python"

  Scenario: Reloading a lesson address reopens the same lesson
    Given the courses API returns a "Python" course with 4 lessons where the first 2 are completed
    When I open "/courses/python-course/0-2"
    And I reload the page
    Then I see the lesson player for the third lesson

  Scenario: Back from a lesson returns to the map and then to the list
    Given the courses API returns a "Python" course with 4 lessons where the first 2 are completed
    When I open "/courses/python-course/0-2"
    And I go back
    Then the address is "/courses/python-course"
    When I go back
    Then the address is "/courses"

  Scenario: An unknown course is labelled, not blank
    Given the courses API returns a "Python" course with 4 lessons where none are completed
    When I open "/courses/does-not-exist"
    Then I see "curso não encontrado"
    And I see a link back to "/courses"

  Scenario: An unknown lesson is labelled, not blank
    Given the courses API returns a "Python" course with 4 lessons where none are completed
    When I open "/courses/python-course/9-9"
    Then I see "lição não encontrada"
    And I see a link back to "/courses/python-course"

  Scenario: No courses yet
    Given the courses API returns no courses
    When I open "/courses"
    Then I see "Nenhum curso ainda."
    And I see that courses are created by the AI assistant
    And I do not see a button to create a course

  Scenario: The courses request fails
    Given the courses API fails
    When I open "/courses"
    Then I see "Não foi possível carregar os cursos."
    When the courses API returns a "Python" course with 4 lessons where none are completed
    And I press "tentar de novo"
    Then I see the course "Python"

  @mobile
  Scenario: Inside a course the bottom menu is hidden and the AI button moves to the top
    Given the courses API returns a "Python" course with 4 lessons where none are completed
    When I open "/courses/python-course"
    Then the bottom menu is not visible
    And the AI button is a small square at the top right
    And the AI button does not cover another control

  @mobile
  Scenario: On the list the bottom menu and the AI button stay as they are
    Given the courses API returns a "Python" course with 4 lessons where none are completed
    When I open "/courses"
    Then the bottom menu is visible
    And the AI button is at its usual place above the bottom menu

  @desktop
  Scenario: Desktop keeps the sidebar and the chat bubble
    Given the courses API returns a "Python" course with 4 lessons where none are completed
    When I open "/courses/python-course"
    Then the sidebar is visible
    And the AI button is at its usual place at the bottom right
