---
instruction_id: ask-would-verification-fail-if-the-behavior-broke
title: Ask whether verification would fail if the behavior broke
summary: "One question drives the gap analysis: if this behavior broke where it is used, would any test fail? A gap is filed only as a request to add or change one test."
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
revision: 4
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Ask whether verification would fail if the behavior broke
Find changed behavior that could break later without any test failing.
Ask one question — "if this behavior broke where it is actually used, would any test fail?"
A gap finding is a request to add or change one test. File it only when you can name a specific regression that test would catch; if no such test is worth writing, there is nothing to file.
Do not hunt for correctness bugs; report the genuine problems you run into while tracing.
