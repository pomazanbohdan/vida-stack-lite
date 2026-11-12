---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-docs-build-autonomous-development-loops-md-190f4fbe-c01"
title: "bmad-method: docs/build/autonomous-development-loops.md module"
summary: "Carrier for 6 atomic instructions from bmad-method:docs/build/autonomous-development-loops.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"docs/build/autonomous-development-loops.md\"}"
atom_ids:
  - read-the-state-from-the-record-that-owns-it
  - route-review-findings-into-one-action
  - save-the-attempted-work-as-a-patch-before-reverting
  - start-each-run-in-its-own-session
  - state-the-risk-on-every-ticket
  - stay-on-the-one-item-in-scope
atom_count: 6
atoms: "[{\"atom_id\":\"read-the-state-from-the-record-that-owns-it\",\"file_sha256\":\"ce25b788df631c6d91feadaf72a22afa1aa81427d9e65e66962d462af121abc0\",\"content_sha256\":\"a6073a732bc74976b7ca8e89da517b0717b24afe74c869beaab76a993c5ed7d5\",\"file_bytes\":3177,\"body_bytes\":1543},{\"atom_id\":\"route-review-findings-into-one-action\",\"file_sha256\":\"8d06eb987c64cc199d4615a650a02d519a7965ee28a115ffe2787849e3e96834\",\"content_sha256\":\"8a80a9a8272d96f77269600b14332234822643030479d3194cb277feeb3477dd\",\"file_bytes\":5225,\"body_bytes\":3727},{\"atom_id\":\"save-the-attempted-work-as-a-patch-before-reverting\",\"file_sha256\":\"c1dacc94c17f42751e350a5dfd49bd6a4abdb5532c226ec3d450ace508588ba6\",\"content_sha256\":\"93869d78d183bb53d19ae5eaa2a769fbd09b8dff0beabd53f3df6d1365df8fce\",\"file_bytes\":1857,\"body_bytes\":636},{\"atom_id\":\"start-each-run-in-its-own-session\",\"file_sha256\":\"2048da250490c6db9a682f945781d08aa9510b81447cf455ee8f8f4be760f41f\",\"content_sha256\":\"3c1c18d0e669c00e143a88b86bb1dde9e4aa53f5a056ca37c39278e9d39d0a67\",\"file_bytes\":1497,\"body_bytes\":191},{\"atom_id\":\"state-the-risk-on-every-ticket\",\"file_sha256\":\"88983fab88d409392b414dbba6bd247c1d743aa37629a758bd241008d9fd2857\",\"content_sha256\":\"46a7e667ff16161d08140f91cb8ad4c61b6fcfa5abab0d8172a92462b678af80\",\"file_bytes\":1774,\"body_bytes\":453},{\"atom_id\":\"stay-on-the-one-item-in-scope\",\"file_sha256\":\"272518f41f85a4d840de723e4ac805c81d987f5a6d8c15c277c229a29bbca592\",\"content_sha256\":\"faf15d27f0da7fe582f0ca0de6b811b4515a3a3101d855cc2d49cc06c3f56f16\",\"file_bytes\":1445,\"body_bytes\":269}]"
carrier_sha256: 594b057d293a82f21a0f171547fb339a0ea10b190e0adfb654bcf7849503543d
carrier_bytes: 15768
revision: 1
status: active
---
<!-- vpmodule:atom:begin read-the-state-from-the-record-that-owns-it -->
---
instruction_id: read-the-state-from-the-record-that-owns-it
title: Read the state from the record that owns it
summary: The state of the work comes from the record that holds it — the verification status read through its owner and never through a second parser — and never from another file that happens to mention the work.
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: You need to know where the work stands.
conditions_does_not_apply_when: The state was already read from its own record.
artifact_contract_output_type: state-source
artifact_contract_required_data:
  - the record that was read
  - the state it carried
artifact_contract_verified_by: the state was taken from the record that owns it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build-auto/step-01-clarify-and-route.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=docs/build/autonomous-development-loops.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=tools/ticket-tree-rules.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/docs-update.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/transition.md
status: active
revision: 4
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Read the state from the record that owns it
Do not infer workflow state from non-plan files.
Read the status, the blocking condition, and the follow-up review recommendation rather than inferring success from chat output alone.
The workflow always tries to leave behind a durable artifact describing what happened.
Monitor the plan file or fallback result file for terminal state
An older leaf file can still carry `status`.
It is read only when there is no plan.
This is the single source of truth for every subsequent step — the orchestrator MUST read this file at each step instead of relying on memory.
Every subsequent step
MUST begin by reading
and update the `status` field for items it processes.
This prevents the orchestrator from "forgetting" any work item across the multi-step workflow.
The manifest is the source of truth for what was processed.
the verification status is read through its ONE owner — never with awk/sed/grep over the report (that bypassed the closed enum, the staleness check and the phase-pinned report resolution, #3492).
A non-zero exit is the owner's hard error (a status outside passed | gaps_found | human_needed).
If VERIFY_STATUS is not `passed`:
Stop before confirming:
Detect post-completion mode when the caller states that phase completion and verification have already run.
SKIP `verify_completion` and `update_roadmap_and_state` (re-running `phase.complete` would double-write STATE.md/ROADMAP.md).
When in doubt, run standalone (mode 1) — it is idempotent enough to be safe, just slower.
<!-- vpmodule:atom:end read-the-state-from-the-record-that-owns-it -->
<!-- vpmodule:atom:begin route-review-findings-into-one-action -->
---
instruction_id: route-review-findings-into-one-action
title: Route every review finding into one action
summary: "Surviving findings are grouped by shared root cause and each group is routed into exactly one category: an intent gap, a bad plan, a patch, or a defer."
capability_tags:
  - triage-reports
  - apply-review-feedback
pattern_tags:
  - report-triage
conditions_applies_when: A review produced findings and each of them has been verified and given a verdict.
conditions_does_not_apply_when: There are no findings to route.
artifact_contract_output_type: finding-routing
artifact_contract_required_data:
  - the surviving findings
  - the shared root cause of each group
  - the category of each group
  - the action taken for each group
artifact_contract_verified_by: every group carries exactly one category and the category follows the rules of the group
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build/step-04-review.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build-auto/step-04-review.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=docs/build/autonomous-development-loops.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Route every review finding into one action

Group the survivors by shared root cause — two findings belong in one entry only when the same defect produced both. Same location alone is not a shared root cause, and neither is a shared fix.

- An entry carries every member's verified bad outcome and the highest verdict among them

Critical > Important > Minor > maybe-false.

Route each entry into exactly one triage category.

A group that includes verified `Critical`, `Important`, or `Minor` members routes by its highest such verdict — not to defer just because a member is `maybe-false`.

The first three are **this change's problem** — caused or exposed by the current change. The last is **not this change's problem**.

**intent_gap** — caused by the change; cannot be resolved from the plan because the captured intent is incomplete. Do not infer intent unless there is exactly one possible reading.

**bad_plan** — caused by the change, including direct deviations from the plan. The plan should have been clear enough to prevent it. When in doubt between bad_plan and patch, prefer bad_plan — a plan-level fix is more likely to produce coherent code.

**patch** — caused by the change; its smallest fix is trivial, adds no public surface, and guards no state you did not demonstrate. Just part of the diff. A finding whose smallest fix fails any of those conditions routes to intent_gap when the plan does not settle that fix, otherwise to bad_plan.

**defer** — pre-existing issue not caused by this change; or an entry whose members are all `maybe-false` and the claim, if true, would be `Important` or `Critical` — record that severity marked unverified, plus what would settle it (if it would only be `Minor`, reject it with the same note); or any entry whose fix edits agent-context files (CLAUDE.md, AGENTS.md, rules, etc).

All remaining findings continue to grouping.

Reject `false` findings on their refutation.

Reject `Minor` findings when it is unlikely that users or developers would meet the defect in everyday use (judged plainly — no proof needed) and the fix is more than a direct correction or deletion — adding guards, branches, parameters, or other complexity.

Out of scope: reject or defer a finding as out of scope only when the intent itself excludes it — not because the plan's scope section or the shape of the diff says so. If only those would exclude it, keep the finding: the plan drew the line somewhere the intent did not, so it routes to intent_gap or bad_plan, never to patch or defer.

Reject any finding whose fix is to edit this build's plan.
# Route each finding to exactly one disposition
If neither exists, process patch and defer normally.
An intent gap — caused by the change; cannot be resolved from the plan because the captured intent is incomplete. Do not infer intent unless there is exactly one possible reading.
A plan defect — caused by the change, including direct deviations from the plan. The plan should have been clear enough to prevent it.
A patch — caused by the change; its smallest fix is trivial, adds no public surface, and guards no state you did not demonstrate.
When in doubt between a plan defect and a patch, prefer a plan defect — a plan-level fix is more likely to produce coherent code.
A `maybe-false` finding is deferred only when its claim, if true, would be Important or worse; its evidence records what would settle it.
Weaker ones are rejected in the plan's triage log with the same note.
This is intentionally not a backlog. It is a machine-readable review output.
The orchestrator has to decide what happens next: create a ticket, append to a central queue, correlate duplicates across runs, or do nothing.
<!-- vpmodule:atom:end route-review-findings-into-one-action -->
<!-- vpmodule:atom:begin save-the-attempted-work-as-a-patch-before-reverting -->
---
instruction_id: save-the-attempted-work-as-a-patch-before-reverting
title: Save the attempted work as a patch before reverting
summary: "Before the code changes are reverted, the attempt is saved as a patch file and referenced from the record, so nothing is lost."
capability_tags:
  - apply-review-feedback
pattern_tags:
  - code-review
conditions_applies_when: The code changes of the pass are about to be reverted.
conditions_does_not_apply_when: Nothing is being reverted.
artifact_contract_output_type: saved-patch
artifact_contract_required_data:
  - the patch file
  - the record that references it
  - the questions that remain open
artifact_contract_verified_by: the patch file exists and the record points at it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build-auto/step-04-review.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=docs/build/autonomous-development-loops.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Save the attempted work as a patch before reverting
Save the attempted change as a patch file beside the plan and reference it from the triage-log entry, then revert code changes.
Append the triage-log entry for this pass, then HALT with status `blocked`, blocking condition `intent gap`, and include the unresolved questions and the saved patch path.
The patch shows which reading of the intent the run implemented — concrete evidence for repairing the intent.
If the attempted reading turns out to be correct, `git apply` the patch and set the plan status to `in-review` to resume review on it instead of re-running from scratch.
<!-- vpmodule:atom:end save-the-attempted-work-as-a-patch-before-reverting -->
<!-- vpmodule:atom:begin start-each-run-in-its-own-session -->
---
instruction_id: start-each-run-in-its-own-session
title: Start each run in its own session
summary: "Open a fresh session for every run, because a session reused from another workflow mixes the contexts and confuses the run."
capability_tags:
  - curate-context
pattern_tags:
  - worktree-isolation
conditions_applies_when: A run starts while a session from another workflow is still open.
conditions_does_not_apply_when: The same session is deliberately continuing the same run.
artifact_contract_output_type: session-isolation
artifact_contract_required_data:
  - the session opened
  - the run it serves
artifact_contract_verified_by: "the run starts in a session that carries no other workflow's context"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=docs/build/build-a-change.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=docs/build/review-a-change.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=docs/build/autonomous-development-loops.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Start each run in its own session
Open a **fresh chat** in your AI IDE.
Reusing a session from another workflow can mix contexts and confuse the run.
Start a fresh chat and name the skill.
<!-- vpmodule:atom:end start-each-run-in-its-own-session -->
<!-- vpmodule:atom:begin state-the-risk-on-every-ticket -->
---
instruction_id: state-the-risk-on-every-ticket
title: State the risk on every item
summary: "Every item carries a risk level, the business impact if the change is wrong, and a one-line reason; the highest level names one check outside its own criteria."
capability_tags:
  - plan-implementation
pattern_tags:
  - output-formatting
conditions_applies_when: A work item is written.
conditions_does_not_apply_when: The item records a defect rather than a change.
artifact_contract_output_type: risk-statement
artifact_contract_required_data:
  - the risk level
  - the business impact if the change is wrong
  - the one-line reason
  - the outside check for the highest level
artifact_contract_verified_by: the risk level and its reason are stated and the highest level names one check outside the criteria
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/references/ticket.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=docs/build/autonomous-development-loops.md
status: active
revision: 6
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - business
  - operations
---

# State the risk on every item
Risk on every ticket: `low`, `medium`, or `high` — the business impact if this change is wrong, proposed with a one-line reason; the user's value wins.
A high-risk ticket names one check outside its own criteria in Notes: a person who confirms, a suite beyond the ticket's tests, a monitor.
The build confirms or raises the risk in its plan, which is where a CI process reads it to decide how much review a change gets.
<!-- vpmodule:atom:end state-the-risk-on-every-ticket -->
<!-- vpmodule:atom:begin stay-on-the-one-item-in-scope -->
---
instruction_id: stay-on-the-one-item-in-scope
title: Stay on the one item in scope
summary: "One invocation works one item: it never reads another entry and never moves to a different item, whatever the outcome."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: The request names one item of work.
conditions_does_not_apply_when: The request names several items to be worked in sequence.
artifact_contract_output_type: scope-boundary
artifact_contract_required_data:
  - the item in scope
  - the items left untouched
artifact_contract_verified_by: no other item was read and the run never moved to a different one
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build-auto/step-01-clarify-and-route.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=docs/build/autonomous-development-loops.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Stay on the one item in scope
One ticket per invocation: never read another entry, and never advance to a different ticket regardless of outcome.
The main input is the invocation prompt.
It treats that prompt as workflow input, not as a finished implementation plan.
<!-- vpmodule:atom:end stay-on-the-one-item-in-scope -->