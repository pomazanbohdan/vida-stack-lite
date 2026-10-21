---
instruction_id: treat-the-unmentioned-members-of-a-changed-set-as-implicit-branches
title: Treat the unmentioned members of a changed set as implicit branches
summary: "When a change handles some members of a fixed set of values, the members it does not mention are branches too, and they have to be walked."
capability_tags:
  - review-code
pattern_tags:
  - exhaustive-path-enumeration
conditions_applies_when: "The change special-cases members of an enum, a status set, a sentinel list, a type tag, a flag or a value range."
conditions_does_not_apply_when: The change handles the whole set.
artifact_contract_output_type: implicit-branch-findings
artifact_contract_required_data:
  - the set
  - the members the change handles
  - the members it does not
artifact_contract_verified_by: every member of the set was walked
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build-auto/review-prompts/edge-case-hunter.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build/review-prompts/edge-case-hunter.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-code-review/review-prompts/edge-case-hunter.md
status: active
revision: 2
---

# Treat the unmentioned members of a changed set as implicit branches
Consider implicit branches: the diff special-cases or changes the handling of one or more members of a fixed set of values — enums, status codes, sentinels, type tags, flags, value ranges. The rest of the set is implicit branches (e.g. the diff changes the `RED` and `YELLOW` cases of a `RED`/`YELLOW`/`GREEN` enum; `GREEN` is the implicit branch)
