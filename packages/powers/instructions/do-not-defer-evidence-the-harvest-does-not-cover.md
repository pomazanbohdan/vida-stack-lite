---
instruction_id: do-not-defer-evidence-the-harvest-does-not-cover
title: Do not defer evidence the harvest does not cover
summary: A human observation that the end-of-phase harvest never collects is not deferred to the end; it halts where it is produced.
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: A mode would defer a piece of human evidence to the end of the phase.
conditions_does_not_apply_when: The end-of-phase harvest covers that evidence.
artifact_contract_output_type: evidence-disposition
artifact_contract_required_data:
  - the evidence
  - the harvest that covers it or does not
artifact_contract_verified_by: no evidence is deferred to a collector that does not read it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/planner-human-verify-mode.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Do not defer evidence the harvest does not cover
**the end-of-phase harvest does not cover tracers.** `agents/gsd-verifier.md` collects `<verify><human-check>` blocks from `auto` tasks; deferring a tracer's human evidence without first widening that seam would drop the evidence on the floor entirely — strictly worse than halting
Second, the tracer gate exists to stop expansion being layered onto an unproven slice; deferring its human evidence would let every expansion task build on a slice no human has confirmed, the exact failure the gate was introduced to prevent
Third, the reported defect is scoped to tracers with *no* human-observable evidence, and fail-closed is the safe direction outside that scope. If uniformity is later preferred, the harvest must be widened to tracers in the same change — record that decision here rather than re-deriving it
