---
instruction_id: red-team-each-major-conclusion-in-a-fresh-context
title: Red-team each major conclusion in a fresh context
summary: "A fresh-context skeptic receives only the conclusion and a search budget and hunts for the strongest good-faith case that it is wrong; the result is weighed, not appended."
capability_tags:
  - review-code
pattern_tags:
  - adversarial-self-review
conditions_applies_when: A major conclusion is about to be stated as final.
conditions_does_not_apply_when: No conclusion is load-bearing enough to be attacked.
artifact_contract_output_type: red-team-pass
artifact_contract_required_data:
  - the conclusions attacked
  - the disconfirming evidence found
  - how each conclusion changed
artifact_contract_verified_by: every major conclusion was attacked by a fresh context and the surviving counter-arguments are acknowledged
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-deep-recon/references/verification.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - research
---

# Red-team each major conclusion in a fresh context
The single adversarial mechanism — no other verifier duplicates it.
- for each major conclusion, a **fresh-context** skeptic subagent — the conclusion and a search budget, no supporting evidence, no run context — hunts for disconfirming evidence: the bear case, failed attempts, contrary data, the strongest good-faith argument the conclusion is wrong.
What comes back is weighed, not appended: a conclusion that survives gets its strongest counter-argument acknowledged in the synthesis; one that doesn’t is revised before the report states it. Material findings land in a **Contrary Evidence** section with full citation discipline. Zero findings after a real search is itself reportable — say what was searched for and not found.
