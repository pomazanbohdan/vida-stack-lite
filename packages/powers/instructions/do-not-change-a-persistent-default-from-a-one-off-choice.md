---
instruction_id: do-not-change-a-persistent-default-from-a-one-off-choice
title: Do not change a persistent default from a one-off choice
summary: A choice made for this run is not written into the setting that governs later runs; changing that setting silently changes every future run.
capability_tags:
  - write-configuration-override
pattern_tags:
  - override-layering
conditions_applies_when: A one-off decision would be persisted into a standing setting.
conditions_does_not_apply_when: The decision is meant to change the standing setting.
artifact_contract_output_type: default-change-report
artifact_contract_required_data:
  - the choice that was made
  - the setting that stays untouched
artifact_contract_verified_by: the standing setting is unchanged after a one-off choice
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/new-milestone.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: "The body separates a one-off choice from a persistent setting across runs, but does not state what the setting controls."
---

# Do not change a persistent default from a one-off choice
Do not persist this choice.
Changing it here would silently alter future
A preference governs later runs.
Change the default in settings.
