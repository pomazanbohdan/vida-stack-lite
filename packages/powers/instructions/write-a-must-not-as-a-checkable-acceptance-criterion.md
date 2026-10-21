---
instruction_id: write-a-must-not-as-a-checkable-acceptance-criterion
title: Write a must-NOT as a checkable acceptance criterion
summary: A constraint the author assumed but never wrote becomes an acceptance criterion the verifier can enforce before any code exists.
capability_tags:
  - clarify-requirements
pattern_tags:
  - testable-criteria
conditions_applies_when: A specification surfaces a must-NOT constraint for one requirement.
conditions_does_not_apply_when: The constraint is already written as an acceptance criterion.
artifact_contract_output_type: prohibition-decision
artifact_contract_required_data:
  - the must-NOT statement
  - the requirement it belongs to
  - the acceptance criterion it becomes
artifact_contract_verified_by: the must-NOT appears as a line in the acceptance criteria of the specification
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/resolve-prohibition-findings.md
status: active
revision: 1
---

# Write a must-NOT as a checkable acceptance criterion
Turn each must-NOT the spec phase surfaces into an explicit, checkable spec decision — so a constraint the author assumed but never wrote (the reminder that must not shame the user, the model that must not proxy on protected attributes, the log that must not store raw PII) becomes an acceptance criterion the verifier can enforce *before* any code exists, instead of an unwritten intent a literal `✅ done` can silently violate.
Each finding is one **bespoke** must-NOT for one requirement — a values, safety, fairness, privacy, or transparency constraint the probe kept after dropping routine-engineering noise.
A finding is phrased as a must-NOT statement, for example:
Claude writes a must-NOT line into the spec's **Acceptance Criteria**, marks the prohibition `resolved`, and you pick its **verification tier**
