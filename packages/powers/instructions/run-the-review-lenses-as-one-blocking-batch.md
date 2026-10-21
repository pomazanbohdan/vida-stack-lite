---
instruction_id: run-the-review-lenses-as-one-blocking-batch
title: Run the review lenses as one blocking batch
summary: "Launch every active lens together as blocking calls at the same capability, spawn them all before reading any output, and collect only once the last one is launched."
capability_tags:
  - review-code
pattern_tags:
  - parallel-execution
  - review-application-policy
conditions_applies_when: Several independent review lenses are about to run against the same change.
conditions_does_not_apply_when: The lenses have to run one after another because they depend on each other.
artifact_contract_output_type: lens-batch
artifact_contract_required_data:
  - the lenses that were launched
  - the single blocking launch
  - the findings that were collected
artifact_contract_verified_by: every reviewer was spawned before any output was read
compatibility_excludes:
  - keep-review-read-only
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-code-review/step-02-review.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-code-review/workflow.md
status: active
revision: 3
---

# Run the review lenses as one blocking batch
Run subagents synchronously: launch them together as blocking calls awaited in this turn — never backgrounded or detached, never ending the turn to await results.
When running lenses as subagents, spawn every reviewer before reading or reacting to any of their output; begin collection only once all are launched.
Subagents are an important part of this workflow. Use them wherever a step calls for them, if you can. If you need the user's permission to run them, ask once now for the whole run.
