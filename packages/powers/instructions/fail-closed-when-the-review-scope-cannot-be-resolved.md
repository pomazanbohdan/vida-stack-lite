---
instruction_id: fail-closed-when-the-review-scope-cannot-be-resolved
title: Fail closed when the review scope cannot be resolved
summary: "When the files in scope cannot be determined, the review stops with an error instead of guessing a range."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: The set of files to review is not given.
conditions_does_not_apply_when: An explicit file list was supplied.
artifact_contract_output_type: review-report
artifact_contract_required_data:
  - the reason the scope could not be resolved
artifact_contract_verified_by: the run failed loudly and no heuristic range was used
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-code-reviewer.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-code-reviewer.compact.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Fail closed when the review scope cannot be resolved
Do NOT invent a heuristic (e.g., HEAD~5) or a `base..HEAD` range — silent mis-scoping is worse than failing loudly.
If the resolver reports `status: unresolvable` (it exits 69 and still prints its JSON), or returns no `files`, **fail closed** with error:
