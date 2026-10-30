---
instruction_id: hand-the-review-prompt-to-a-separate-session-when-no-subagent-exists
title: Hand the review prompt to a separate session when no executor is available
summary: "When the review needs an executor and none can be launched, write each reviewer's prompt as a standalone file with the referenced contents inlined, then ask the human to run it in another session."
capability_tags:
  - review-code
  - delegate-subagent-tasks
pattern_tags:
  - code-review
  - subagent-delegation
  - review-execution-policy
conditions_applies_when: A review step needs a separate reviewer and no executor can be launched in this session.
conditions_does_not_apply_when: "An executor can be launched, or the review is done in this session without a separate reviewer."
artifact_contract_output_type: review-prompt-handoff
artifact_contract_required_data:
  - one standalone prompt file per reviewer
  - the file contents inlined into the prompt
  - the request to the human to run them
artifact_contract_verified_by: each prompt file stands alone with every referenced content inlined and the run is handed to the human
compatibility_excludes:
  - keep-review-read-only
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build/step-04-review.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build/step-oneshot.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-code-review/step-02-review.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Hand the review prompt to a separate session when no executor is available

If a lens's instruction requires subagents and none are available, for each such lens write beside `{plan_file}`, named after it with the lens id appended, that lens's child prompt with every file it points to — the diff, the claims, the reviewer instruction file — replaced inline by that file's contents, and every other line left exactly as written.

That session shares no filesystem with this one, so its prompt has to stand alone; this is the only place you read a reviewer instruction file yourself.

Then HALT. Ask the human to run each in a separate session (ideally a different LLM) and paste back the findings.

If a lens needs subagents and you cannot launch them, write the full prompt for each lens beside `{plan_file}`, named after it with the lens id appended (with placeholders filled in, not just file paths). Stop and ask the user to run each prompt in a separate session and paste back the findings.
# Run the review elsewhere when no subagent is available
If a lens's instruction requires subagents and none are available, for each such lens write that lens's child prompt beside `{plan_file}`, named after it with the lens id appended
With every file it points to — the diff, the claims, the reviewer instruction file — replaced inline by that file's contents, and every other line left exactly as written.
Then HALT. Ask the user to run each in a separate session (ideally a different LLM) and paste back the findings.
When findings are pasted, treat them as those lenses' findings and resume from this point.
