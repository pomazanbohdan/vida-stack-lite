---
instruction_id: validate-the-assembled-artifact-with-the-rule-the-later-check-uses
title: Validate the assembled artifact with the rule the later check uses
summary: "The assembled artefact is checked with the same validator the later verification applies, so it cannot pass here and fail later."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: An artefact is assembled from parts and a later stage will check it.
conditions_does_not_apply_when: No later stage checks the artefact.
artifact_contract_output_type: assembly-validation
artifact_contract_required_data:
  - the validator result
  - the fields that were rejected
  - the rebuilt artefact
artifact_contract_verified_by: the later check cannot fail on an artefact that was validated with its own rule
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/mvp-phase.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Validate the assembled artifact with the rule the later check uses
Validate via the centralized user story validator.
will satisfy the same guard the verifier applies later
Re-run only the offending prompt field(s), rebuild
and validate again before continuing.
