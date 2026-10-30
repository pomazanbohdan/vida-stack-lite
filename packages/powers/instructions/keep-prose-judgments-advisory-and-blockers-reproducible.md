---
instruction_id: keep-prose-judgments-advisory-and-blockers-reproducible
title: Keep prose judgments advisory and blockers reproducible
summary: A vacuous failure statement is reported as Important; the Critical level stays with the deterministic layer so that it is always reproducible.
capability_tags:
  - review-code
pattern_tags:
  - finding-severity-policy
conditions_applies_when: A failure statement is present but says nothing observable.
conditions_does_not_apply_when: The deterministic check found the statement missing or empty.
artifact_contract_output_type: vacuous-statement-finding
artifact_contract_required_data:
  - the command
  - the vacuous statement
  - what a usable statement looks like
artifact_contract_verified_by: the finding is Important and names an observable signal instead of raising it to Critical
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/failing-direction.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Keep prose judgments advisory and blockers reproducible
Do **not** escalate a vacuous statement to Critical: the deterministic layer owns the blockers so that a Critical is always reproducible, and prose judgment stays advisory.
Raise those as an Important, naming what a usable statement looks like (an exit code, a string in the output, a missing line).
Your added judgment, on `ok` rows only:
