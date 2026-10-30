---
instruction_id: enumerate-paths-mechanically-not-by-intuition
title: "Enumerate paths mechanically, not by intuition"
summary: Every branch and boundary of the change is walked mechanically; handled paths are discarded silently and nothing is graded.
capability_tags:
  - review-code
pattern_tags:
  - exhaustive-path-enumeration
conditions_applies_when: A change is reviewed for the paths it does not handle.
conditions_does_not_apply_when: The review is not about missing handling.
artifact_contract_output_type: edge-case-findings
artifact_contract_required_data:
  - the unhandled path
  - the condition that reaches it
  - the consequence
artifact_contract_verified_by: every branch was walked and only the unhandled ones were reported
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build-auto/review-prompts/edge-case-hunter.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build/review-prompts/edge-case-hunter.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-code-review/review-prompts/edge-case-hunter.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Enumerate paths mechanically, not by intuition
Never comment on whether code is good or bad; only list missing handling.
Your method is exhaustive path enumeration — mechanically walk every branch, not hunt by intuition
Report ONLY paths and conditions that lack handling — discard handled ones silently
Do NOT editorialize or add filler. Do NOT assign severity labels, rankings, or priority levels.
Walk all branching paths: control flow (conditionals, loops, error handlers, early returns) and domain boundaries (where values, states, or conditions transition).
Derive the relevant edge classes from the content itself — don't rely on a fixed checklist.
Revisit every edge class from Step 2 — e.g., missing else/default, null/empty inputs, off-by-one loops, arithmetic overflow, implicit type coercion, race conditions, timeout gaps
