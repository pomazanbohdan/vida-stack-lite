---
instruction_id: try-to-falsify-each-checkable-claim
title: Try to falsify each checkable claim
summary: "Every checkable claim is extracted and tried against the code that was already traced; where the trace cannot decide it, the code that decides it is read."
capability_tags:
  - review-code
pattern_tags:
  - evidence-analysis
conditions_applies_when: The claims of the change have been extracted.
conditions_does_not_apply_when: There are no claims to check.
artifact_contract_output_type: claim-findings
artifact_contract_required_data:
  - the claim
  - the code that contradicts it
  - what goes wrong for someone who believed it
artifact_contract_verified_by: each claim was tried and only the falsified ones were reported
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build-auto/references/claims-check.md
status: active
revision: 1
---

# Try to falsify each checkable claim
Extract each checkable claim — what the change does, what it preserves, ordering, arithmetic, and parity with existing code ("exactly as X does") — then try to falsify each one against the code you have already traced.
Where your trace is not enough to decide, read the code that decides it: the compared-to function, the actual callee, the state the claim assumes.
Verified claims produce nothing. Add nothing if nothing is falsified.
