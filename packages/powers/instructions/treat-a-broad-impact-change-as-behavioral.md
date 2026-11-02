---
instruction_id: treat-a-broad-impact-change-as-behavioral
title: Screen a broad-impact change instead of assuming it is behavioral
summary: "A dependency, toolchain, build setting or data-file change is screened like any other part: behavioral when it changes runtime behavior, and skipped when the build or CI run itself checks it."
capability_tags:
  - review-code
pattern_tags:
  - code-review
  - verification-before-completion
conditions_applies_when: A change is screened for behavioral effect and it touches something wider than one function.
conditions_does_not_apply_when: The change is confined to one function and the screen has already been done.
artifact_contract_output_type: behavioral-screen
artifact_contract_required_data:
  - the parts of the change
  - which of them are behavioral
artifact_contract_verified_by: "a broad-impact change is counted as behavioral only when it changes runtime behavior, and a change the build or CI run itself checks is not reported as a gap"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-review/references/lens-verification-gap.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Screen a broad-impact change instead of assuming it is behavioral
Do not treat a dependency, toolchain, build/config or data-file change as behavioral by default.
Screen it like any other part: it is behavioral when it alters return values, errors, side effects callers can see, or observable state at runtime.
A broad-impact change that alters runtime behavior is still behavioral even when no single changed line looks important.
When the build or CI run itself checks the change, it is not worth a gap finding: that check is the verification.
