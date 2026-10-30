---
instruction_id: review-code-quality-and-tests
title: Review the quality of the code and the tests
summary: "Check separation of concerns, error handling, types, duplication, edge cases and tests that prove real behavior."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: "The change contains code, configuration or tests."
conditions_does_not_apply_when: The change is documentation only.
artifact_contract_output_type: quality-review
artifact_contract_required_data:
  - code quality
  - error handling
  - tests
  - risks
artifact_contract_verified_by: tests exercise real behavior and edge cases
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/requesting-code-review/code-reviewer.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.openclaw/skills/ponytail-review/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.opencode/command/ponytail-review.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=skills/ponytail-review/SKILL.md
status: active
revision: 4
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Review the quality of the code and the tests
Clean separation of concerns?
Proper error handling?
Type safety where applicable?
DRY without premature abstraction?
Edge cases handled?
Tests verify real behavior, not mocks?
Edge cases covered?
Integration tests where they matter?
All tests passing?
Is all planned functionality present?
Sound design decisions?
Integrates cleanly with surrounding code?
Merge near-copies that must change together.
Split the function that does several unrelated jobs by job, never by line count.
Never split into helpers that exist only to make a function shorter.
