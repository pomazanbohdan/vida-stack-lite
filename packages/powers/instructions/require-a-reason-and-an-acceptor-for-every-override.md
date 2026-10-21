---
instruction_id: require-a-reason-and-an-acceptor-for-every-override
title: Require a reason and an acceptor for every override
summary: "An override names what it overrides, why the deviation is acceptable, who accepted it and when."
capability_tags:
  - write-configuration-override
pattern_tags:
  - override-layering
conditions_applies_when: An override of a failed must-have is declared.
conditions_does_not_apply_when: No must-have is being overridden.
artifact_contract_output_type: override-record
artifact_contract_required_data:
  - the overridden must-have
  - the reason
  - the acceptor
  - the timestamp
artifact_contract_verified_by: all four fields are present and the reason is specific
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/verification-overrides.md
status: active
revision: 1
---

# Require a reason and an acceptor for every override
Why this deviation is acceptable. Must be specific — not just "not needed"
Who accepted the override (username or role). Required
ISO timestamp of when the override was accepted. Required
The must-have truth, artifact description, or key link being overridden. Does not need to be an exact match — fuzzy matching applies
