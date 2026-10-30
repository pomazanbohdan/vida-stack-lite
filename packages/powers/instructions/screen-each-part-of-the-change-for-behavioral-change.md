---
instruction_id: screen-each-part-of-the-change-for-behavioral-change
title: Screen each part of the change for behavioral change
summary: "Each part of the change is screened on its own; a part counts as non-behavioral only when it alters no return value, error, side effect or observable state."
capability_tags:
  - review-code
pattern_tags:
  - verification-before-completion
conditions_applies_when: A change is screened before its behavior is traced.
conditions_does_not_apply_when: The change is a single part.
artifact_contract_output_type: behavioral-screen
artifact_contract_required_data:
  - the parts
  - the behavioral parts
  - the parts that were skipped
artifact_contract_verified_by: every part was screened against the behavioural test
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build-auto/review-prompts/verification-gap.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build/review-prompts/verification-gap.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-code-review/review-prompts/verification-gap.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Screen each part of the change for behavioral change
Screen each part of the change separately. If a part is non-behavioral, skip it.
Call a part non-behavioral only when the changed code does not alter return values, thrown errors, caller-visible side effects, or observable state (including iteration order and emitted messages).
Once a part meets that test, move on; do not inspect callers or tests for extra confirmation.
Common non-behavioral examples: formatting, comments, whitespace; pure renames; trivial getters/setters and pass-throughs; type-only or compiler-enforced changes with no runtime effect; etc.
