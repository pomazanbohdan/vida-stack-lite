---
instruction_id: announce-the-review-plan-in-one-line
title: Announce the review plan in one line
summary: "Before anything runs, one line names the content class, the lenses and the lens that will run on top of another one — unless the caller pinned an exact output contract."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: A review is about to run its lenses.
conditions_does_not_apply_when: The caller pinned an exact output contract that covers everything the run emits.
artifact_contract_output_type: review-plan-announcement
artifact_contract_required_data:
  - the content class
  - the lenses about to run
  - the dependency between the lenses
artifact_contract_verified_by: the announcement is one line and it names the content class and every lens that will run
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-review/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - design-ux
  - operations
---

# Announce the review plan in one line
Announce the plan in one line before running anything: the content class, the lenses about to run, and — when any lens has `after` set — that it runs on top of the named lens's findings.
Skip the announcement entirely when the caller pinned an exact output contract
Their contract covers everything you emit, not just the findings block.
