---
instruction_id: stop-the-gap-analysis-at-the-inference-boundary
title: Stop the gap analysis at the inference boundary
summary: "For behavior that ends in a model call, the demand for verification stops at the inference boundary; the deterministic part around it still has to be verified."
capability_tags:
  - review-code
pattern_tags:
  - code-review
  - verification-before-completion
conditions_applies_when: The changed behavior is backed by a model call.
conditions_does_not_apply_when: No model call is involved in the changed behavior.
artifact_contract_output_type: inference-boundary
artifact_contract_required_data:
  - the deterministic part that is still eligible
  - the boundary where the demand stops
artifact_contract_verified_by: "no finding demands a live inference, and the deterministic construction and response handling are still checked"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-review/references/lens-verification-gap.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Stop the gap analysis at the inference boundary
For LLM-backed behavior, stop at the inference boundary: do not require invoking a model or judging its semantic response.
Deterministic request construction and response handling remain eligible without live inference; existing inference tests are not precedent for more.
