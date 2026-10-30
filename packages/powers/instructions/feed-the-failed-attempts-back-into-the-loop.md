---
instruction_id: feed-the-failed-attempts-back-into-the-loop
title: Feed the failed attempts back into the loop
summary: "Hand the improver the attempts it already made and why each fell short, so it tries a structurally different cut instead of nudging the same wording."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: A loop rewrites a description or an instruction over several rounds.
conditions_does_not_apply_when: Only one attempt exists.
artifact_contract_output_type: attempt-history
artifact_contract_required_data:
  - the earlier attempts
  - why each of them fell short
artifact_contract_verified_by: the next attempt differs structurally from the ones that failed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-eval/references/description-optimization.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Feed the failed attempts back into the loop
Also hand the improver the descriptions it already tried and why each fell short, so it tries something structurally different rather than nudging the same wording round after round.
Without this, the loop tends to oscillate between two phrasings that each fix one failure and reintroduce the other.
Feeding the history back pushes the improver toward a different cut of the boundary: reframing around intent instead of keywords, naming the adjacent skill the near misses belong to, or moving a qualifier from the trigger clause into the body.
Keep the description within whatever length and format bounds the runtime enforces (character cap, no angle brackets, and so on); a rewrite that triggers well but violates the bound is not a candidate.
