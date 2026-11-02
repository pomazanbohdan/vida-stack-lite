---
instruction_id: add-automation-triggers-gradually
title: Add automation triggers gradually
summary: "Every automated trigger is an accelerator; add one at a time, throttle it, keep human review on every PR, and cap every loop before a human."
capability_tags:
  - automate-rule-enforcement
pattern_tags:
  - risk-first-ordering
conditions_applies_when: A software factory or agent workflow is adding automated triggers that start runs.
conditions_does_not_apply_when: No automated trigger or unattended loop is being added.
artifact_contract_output_type: automation-rollout
artifact_contract_required_data:
  - trigger
  - throttle
  - brakes
  - loop cap
artifact_contract_verified_by: one trigger is enabled, throttled, gated by review, and capped before a human
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=matt-skills; license=MIT; revision=4ae2317ddb22b046e26455e4f9c9b3aaaf62212d; path=skills/in-progress/software-factory/SKILL.md
status: active
revision: 1
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - operations
---

# Add automation triggers gradually
Every trigger is an accelerator. Accelerators without brakes make a slop cannon.

Keep three brakes:
- **Automated checks**: deterministic gates such as types, lint and tests.
- **Automated review**: a separate run that reads the diff cold against the codebase standards and the ticket.
- **Human review**: a human reads the PR before it merges.

Add one automated trigger at a time.
Throttle it at first: one bug report in ten, a clock once a day.
Keep human review on every PR while the brakes earn trust.
Cap every loop of runs at a few tries before a human.
What a human catches becomes a new automated check and a sharper automated review.
