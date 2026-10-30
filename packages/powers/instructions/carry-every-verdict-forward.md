---
instruction_id: carry-every-verdict-forward
title: Carry every verdict forward
summary: "A failed experiment is not discarded: a validated one carries proven patterns, a partial one carries constraints, and an invalidated one carries the landmine."
capability_tags:
  - curate-context
pattern_tags:
  - decision-trail
conditions_applies_when: The results of finished experiments are packaged for later work.
conditions_does_not_apply_when: Only the successful experiments are worth keeping.
artifact_contract_output_type: carried-verdicts
artifact_contract_required_data:
  - the verdict per experiment
  - what each verdict carries forward
artifact_contract_verified_by: "every experiment, including the invalidated ones, contributes what it carries forward"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/spike-wrap-up.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - research
---

# Carry every verdict forward
**VALIDATED** spikes provide proven patterns
**PARTIAL** spikes provide constrained patterns
**INVALIDATED** spikes provide landmines and dead ends
