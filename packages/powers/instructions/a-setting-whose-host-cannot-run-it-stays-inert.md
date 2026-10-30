---
instruction_id: a-setting-whose-host-cannot-run-it-stays-inert
title: A setting whose host cannot run it stays inert
summary: "When the host does not meet the condition the setting needs, the setting simply does not fire; that is the design, not a bug to work around."
capability_tags:
  - degrade-gracefully-under-failure
pattern_tags:
  - safe-defaults
conditions_applies_when: A setting is enabled but the host does not satisfy its precondition.
conditions_does_not_apply_when: The host satisfies the precondition.
artifact_contract_output_type: inert-setting-record
artifact_contract_required_data:
  - the setting
  - the precondition the host does not meet
  - what happens instead
artifact_contract_verified_by: the setting does nothing and the behaviour is the same as before it was enabled
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/enable-concurrent-chunked-planning.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# A setting whose host cannot run it stays inert
This is not a bug to work around: it means the setting never fires concurrent dispatch on a host that cannot usefully run it.
