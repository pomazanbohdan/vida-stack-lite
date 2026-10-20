---
instruction_id: name-the-three-shapes-of-a-verification-gap
title: Name the three shapes of a verification gap
summary: "A verification gap is a regression, a missing adoption or a broken verification, and the three shapes are named before the search starts."
capability_tags:
  - review-code
pattern_tags:
  - code-review
  - verification-before-completion
conditions_applies_when: The verification of a change is being searched for gaps.
conditions_does_not_apply_when: The review is hunting correctness bugs rather than missing verification.
artifact_contract_output_type: gap-shapes
artifact_contract_required_data:
  - the three gap shapes
artifact_contract_verified_by: every gap that is reported names one of the three shapes
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-review/references/lens-verification-gap.md
status: active
revision: 1
---

# Name the three shapes of a verification gap
The main verification gap shapes are:
1. **Regression gap:** the changed code regresses where it's used, and no test covering that use would fail.
2. **Missing-adoption gap:** a place that should now use the new behavior doesn't; it handles the same case its own way, or not at all, and no test would flag the omission.
3. **Broken-verification gap:** a test appears to cover the changed behavior, but would not actually protect it because it is skipped, flaky, not run in the normal verification path, or too weak to observe the regression.
