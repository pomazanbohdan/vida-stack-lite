---
instruction_id: prove-the-guarded-state-cannot-occur
title: Prove the guarded state cannot occur
summary: "Before calling code unnecessary, prove the state it guards cannot occur and cite the type, deployment, call sites or flag values that prove it; the pattern name alone is not a finding."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: A review is judging whether code guards against a real problem.
conditions_does_not_apply_when: The review is judging correctness, quality or security rather than necessity.
artifact_contract_output_type: necessity-finding
artifact_contract_required_data:
  - the guarded state
  - why it cannot occur or why the requirement lapsed
  - the evidence that proves it
artifact_contract_verified_by: every necessity finding cites where the impossibility or lapse is proven
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/necessity-review.md
status: active
revision: 1
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Prove the guarded state cannot occur
Before calling code unnecessary, prove the state it guards cannot occur and cite where that is proven: the type signature, the build or deploy configuration, the call sites, the flag's values.
A necessity finding states why the guarded state cannot occur, or why the requirement lapsed. The pattern name alone is not a finding; without that evidence, drop it or report it as info.
The taxonomy is a prompt, not a verdict: impossible-state guard, already-defended-elsewhere, cargo-culted pattern, phantom requirement, and generality without instantiation.
