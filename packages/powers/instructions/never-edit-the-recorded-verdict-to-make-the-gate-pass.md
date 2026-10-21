---
instruction_id: never-edit-the-recorded-verdict-to-make-the-gate-pass
title: Never edit the recorded verdict to make the gate pass
summary: "A verdict is corrected only when the record genuinely says it; when the meaning is unclear the record is discarded and produced again, not rewritten to pass."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: A recorded verdict is wrong or unusable and the gate must be satisfied.
conditions_does_not_apply_when: The recorded verdict is right.
artifact_contract_output_type: corrected-record
artifact_contract_required_data:
  - the verdict that was written
  - the evidence that it matches what was found
artifact_contract_verified_by: the verdict matches what the run found and was not edited to satisfy the gate
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/recover-from-an-invalid-verification-status.md
status: active
revision: 1
---

# Never edit the recorded verdict to make the gate pass
Do this only when the report genuinely reflects that outcome. Setting `passed` on a phase whose verification did not pass defeats the gate. When you are unsure what the report meant, prefer Option 2.
