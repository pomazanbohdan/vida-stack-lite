---
instruction_id: ask-would-verification-fail-if-the-behavior-broke
title: Ask whether verification would fail if the behavior broke
summary: "One question drives the gap analysis: if the behavior the change should produce broke where it is used, would the verification fail?"
capability_tags:
  - review-code
pattern_tags:
  - verification-before-completion
conditions_applies_when: A change is checked for the behavior that could break unnoticed.
conditions_does_not_apply_when: The review is hunting correctness bugs.
artifact_contract_output_type: verification-gap-findings
artifact_contract_required_data:
  - the changed behavior
  - the consumer
  - the evidence that no test would fail
artifact_contract_verified_by: each finding answers the one question with the evidence that was read
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
instruction_form: procedure
domains:
  - engineering
---

# Ask whether verification would fail if the behavior broke
Find changed behavior that could break without reliable verification catching it.
Ask one question — "if the behavior this change is supposed to produce broke where it's actually used, would verification fail?"
Do not hunt for correctness bugs, but report genuine problems you notice while tracing verification.
