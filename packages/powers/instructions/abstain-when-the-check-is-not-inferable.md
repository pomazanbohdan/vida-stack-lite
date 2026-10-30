---
instruction_id: abstain-when-the-check-is-not-inferable
title: Abstain when the check is not inferable
summary: "On a check whose answer is not derivable from the spec, the verifier abstains instead of reporting a confident pass; the item is never marked passed."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: A check on a requirement cannot be decided from the stated spec alone.
conditions_does_not_apply_when: The check is inferable from the spec and is graded normally.
artifact_contract_output_type: abstention
artifact_contract_required_data:
  - the check that is not inferable
  - "the explicit evidence that was found, if any"
  - the distinguishable reason
artifact_contract_verified_by: the item was abstained on with a distinguishable reason and never reported as passed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/honest-verifier.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - research
  - operations
---

# Abstain when the check is not inferable
A verifier is trustworthy on **inferable** checks - defects determined by the stated spec. On a **non-inferable** check the correct answer is *not derivable from the spec alone* (e.g. "does `[1,2]` touching `[2,3]` merge?", "is a 'character' a grapheme or a code unit?"). On these the verifier *does not know that it does not know*: measured behavior is a **confident PASS on the blind-spot check ~100% of the time** (mean confidence ~0.93), because a model cannot self-detect a gap it does not perceive.
- **Explicit evidence** = a wired held-out/property-based test that passes, or a behavior the verifier directly observed. Symbol presence + wiring is **not** explicit evidence for a non-inferable truth.
- **Distinguishable reason.** The abstain disposition carries `reason: insufficient_spec` so the `human_needed` outcome is never conflated with an ordinary manual-UAT `human_needed`.
- **abstain** → ⚠️ `insufficient_spec`, flagged, → `human_needed` — **never `passed`**
