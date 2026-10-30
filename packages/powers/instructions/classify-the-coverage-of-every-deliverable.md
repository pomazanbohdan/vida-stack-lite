---
instruction_id: classify-the-coverage-of-every-deliverable
title: Classify the coverage of every deliverable
summary: "Every shipped deliverable is classified as machine-covered or human-judged; an undetermined coverage defaults to human judgment, and only a proven pass skips the human."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: A unit of work wrote up what it shipped.
conditions_does_not_apply_when: Nothing was shipped.
artifact_contract_output_type: coverage-classification
artifact_contract_required_data:
  - the deliverables
  - the verification per deliverable
  - the human judgment per deliverable
artifact_contract_verified_by: every deliverable is classified and an unproven pass is not claimed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/execute-plan.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Classify the coverage of every deliverable
**Every deliverable MUST be classified.** If you cannot determine coverage, default to `human_judgment: true` with `rationale: "Coverage not determined at authoring time — verifier must classify"`.
Never set `human_judgment: false` without a non-empty all-`pass` `verification`
auto-passes (skips the human) ONLY on that proof, so an unproven `false` still routes to the human but loses the audit trail.
