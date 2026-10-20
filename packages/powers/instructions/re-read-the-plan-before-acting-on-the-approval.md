---
instruction_id: re-read-the-plan-before-acting-on-the-approval
title: Re-read the plan before acting on the approval
summary: "The plan is presented with its risk and its path, the human picks one of three answers, and the plan is read again from disk before the approval is acted on."
capability_tags:
  - clarify-requirements
pattern_tags:
  - approval-policy-gate
conditions_applies_when: A plan is written and is about to be approved.
conditions_does_not_apply_when: The plan was already approved and the work continues.
artifact_contract_output_type: plan-approval
artifact_contract_required_data:
  - the summary with the risk and the reason for it
  - the plan path
  - the answer of the human
  - the state of the plan file as read from disk
artifact_contract_verified_by: the plan was re-read from disk after the approval and any external edit was acknowledged
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build/step-02-plan.md
status: active
revision: 1
---

# Re-read the plan before acting on the approval

Only when Open Questions is empty.

Present summary, with the plan's `risk` and the reason for it.

Display the plan file path in whatever form is clickable where you are presenting it (e.g. code citation in chat, CWD-relative path with no leading `/` in terminal). If unsure, use CWD-relative path.

- **Approve and continue** — approve the plan and proceed to implementation in this session.
- **Approve and stop** — approve the plan, leave it `ready-for-dev`, and stop so a fresh session can resume at implementation.
- **Review plan** — review the plan, use a subagent if available, and discuss the findings and revisions with the user until the user is ready to approve, then either stop or continue.

Before acting on approval, re-read `{plan_file}` from disk. If it is missing, HALT without recreating it, changing status, or proceeding. If it changed, acknowledge the external edits and continue with the updated version.
