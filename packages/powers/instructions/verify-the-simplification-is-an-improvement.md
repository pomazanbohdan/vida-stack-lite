---
instruction_id: verify-the-simplification-is-an-improvement
title: Verify the simplification is an improvement
summary: Compare before and after as a whole and revert when the simplified version is harder to understand or review.
capability_tags:
  - simplify-code
pattern_tags:
  - verification-before-completion
conditions_applies_when: A simplification pass is finished and the result must be judged as a whole.
conditions_does_not_apply_when: The pass is still running.
artifact_contract_output_type: simplification-verdict
artifact_contract_required_data:
  - the before and after comparison
  - the consistency check
  - the verdict
artifact_contract_verified_by: the comparison was done and the verdict is keep or revert
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/code-simplification/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Verify the simplification is an improvement

After all simplifications, step back and evaluate the whole:

```
COMPARE BEFORE AND AFTER:
- Is the simplified version genuinely easier to understand?
- Did you introduce any new patterns inconsistent with the codebase?
- Is the diff clean and reviewable?
- Would a teammate approve this change?
```

If the "simplified" version is harder to understand or review, revert. Not every simplification attempt succeeds.

"Simplified" code that is longer and harder to follow than the original
