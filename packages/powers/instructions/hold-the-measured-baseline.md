---
instruction_id: hold-the-measured-baseline
title: Hold the measured baseline
summary: "Record where a metric stands today and refuse to get worse, instead of setting a number the codebase fails today."
capability_tags:
  - measure-performance
pattern_tags:
  - performance-measurement
conditions_applies_when: "No agreed number exists for a metric, or the current number is below the one being proposed."
conditions_does_not_apply_when: The target number is already agreed and the codebase meets it today.
artifact_contract_output_type: measured-baseline
artifact_contract_required_data:
  - the metric
  - "today's value"
  - the direction
  - the check that compares against it
artifact_contract_verified_by: the recorded value is the current measured value and the check compares against the record
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/constraint-driven-development/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Hold the measured baseline

Set 80% coverage on a codebase at 62% and you get a red build forever, then a team that learns to ignore red builds.

The alternative asks for no decision: record where you are, then refuse to get worse. Put it in the "Measured, not yet enforced" table with today's number and a direction. Every check compares against the recorded value, not an aspiration. When a number improves, update it; when it drops, that's the finding.

This also answers a fair objection to training. Models are rewarded for passing tests, which you can evaluate in seconds. Architectural rot shows up over months and never reaches the weights. A ratchet is the missing penalty, written down where the build can see it.

**Red Flags**

- A budget was set that the codebase fails today, with no plan to reach it
