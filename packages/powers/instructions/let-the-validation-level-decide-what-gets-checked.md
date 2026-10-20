---
instruction_id: let-the-validation-level-decide-what-gets-checked
title: Let the validation level decide what gets checked
summary: "The level in force decides the breadth of the check: the load-bearing claims only, the two-source classes, or every claim in the ledger."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: A validation level has been resolved for the run.
conditions_does_not_apply_when: The run carries no validation level and none is needed.
artifact_contract_output_type: validation-level-set
artifact_contract_required_data:
  - the level in force
  - the claims the level covers
artifact_contract_verified_by: "the claims checked match the level, and a citation that fails to re-find is recorded whatever the level"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-deep-recon/references/verification.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-deep-recon/references/codebase.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-deep-recon/references/codebase-verifier.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-deep-recon/references/selection.md
status: active
revision: 1
---

# Let the validation level decide what gets checked
Per the resolved `validation` level (request > knob > default `normal`):
- **normal** — spot-check the **load-bearing claims only**: the handful per dimension the recommendation actually rests on. One independent-source check each, at landing.
- **high** — cross-check every claim in the pack’s *two-source classes*, and run the red-team pass on major conclusions
- **max** — cross-check every ledger claim, run the red-team pass below at full breadth (every major conclusion), and primary-source-priority ranking: where a primary source (filing, regulator text, official docs, original paper) exists, secondary reporting alone does not verify.
- **Two-source classes (added to the type’s own):** pricing figures; performance/scale numbers; any cell that decides between the top two finalists.
- a claim it fails, or reports with `symbol_found` false, gets a ledger line whatever the level.
- at validation `max`, when the claim says what code calls or depends on, follow one more edge and judge again.
