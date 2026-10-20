---
instruction_id: give-every-question-a-default
title: Give every question a default
summary: "Every question in an intake carries a default, so an unsure answer still produces a working result, and the intake stops after four questions."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: "You interview a person to set up a policy, a configuration or a set of thresholds."
conditions_does_not_apply_when: "The answers are already written down, or the questions have no sensible default."
artifact_contract_output_type: questionnaire-with-defaults
artifact_contract_required_data:
  - the question
  - the guess
  - the default if unsure
  - what each option costs
artifact_contract_verified_by: "the user can answer 'I don't know' to every question and still get a working result"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/constraint-driven-development/SKILL.md
status: active
revision: 1
---

# Give every question a default

Follow the one-question-at-a-time discipline, with one change: every question here has a default, so "I don't know" is a complete answer that still produces a working config.

```
Q1: Beyond the floor, which of these do you want enforced?
    (a) Test coverage on new code
    (b) Security scanning
    (c) Performance budgets
    (d) Accessibility
    (e) Architecture boundaries
    GUESS: (a) and (b) — you have a test runner already and you're handling user input.
    DEFAULT if unsure: (a) and (b).
    Say what each pick costs: (c) and (d) need a running URL, (e) needs a rules file written.
```

```
Q2: When a check fails while the agent is mid-task, should it block or warn?
    GUESS: Block. You're running agents unattended and a warning nobody reads is a warning.
    DEFAULT if unsure: Block on the floor, warn on everything else for the first two weeks.
```

```
Q3: Do you have target numbers in mind, or should I measure where you are today and hold that line?
    GUESS: Measure. Most teams don't have a number, and an invented one gets ignored.
    DEFAULT if unsure: Measure and hold. See "Ratchets" below.
```

```
Q4: What's the slowest check you'll tolerate before the agent hands work back?
    GUESS: About 90 seconds. Longer and you'll stop running it.
    DEFAULT if unsure: 90 seconds at task end, unlimited in CI.
```

Stop at four. A twelve-question intake produces a config nobody understands and a user who regrets starting.

The interview needs a live user. **Don't run it in non-interactive contexts** (CI, scheduled runs, autonomous runs). If constraints are missing and you're in one of those, apply the Floor below, note that you did, and flag the rest for a human.
