---
instruction_id: report-the-run-outcome-assumptions-and-open-questions
title: "Report the run outcome, the assumptions and the open questions"
summary: "End the run with a status of complete, partial or blocked, the intent, the reason when blocked, the assumptions made, the questions left open and the files touched."
capability_tags:
  - communicate-concisely
pattern_tags:
  - output-formatting
conditions_applies_when: A run has finished and its outcome is reported back to a caller.
conditions_does_not_apply_when: The run is still in progress.
artifact_contract_output_type: run-outcome
artifact_contract_required_data:
  - the status
  - the intent
  - the reason when the status is blocked
  - the assumptions
  - the open questions
  - the files touched
artifact_contract_verified_by: "the status matches the artifact, a blocked run carries a reason, and no key is present for an artifact that was not produced"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-prd/references/headless.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-prd/assets/headless-schemas.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-spec/assets/headless-schemas.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Report the run outcome, the assumptions and the open questions
Use `status: "partial"` when the artifact was produced but `open_questions[]` is non-empty or critical inputs were inferred (Create with no brief; Update with a vague signal acted on best-effort; Validate that could not load the checklist).
`complete` = stands on its own; `partial` = caller should review before downstream use; `blocked` = no artifact produced.
Always include the intent (best-guess if not certain) and a one-sentence `reason`.
`reason` — required when `status` is `"blocked"`; one-sentence explanation
`assumptions` — array of inferred values that were not directly confirmed by inputs
`open_questions` — array of items that need a human decision before the artifact can be considered final
The `intent` field must match the detected intent. Omit keys for artifacts not produced.
The contract is intentionally tiny — return the outcome and the files touched. Anything else a caller needs is inside those files
`files` lists every file written or modified in this run, in any order.
