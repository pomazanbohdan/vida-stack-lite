---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-code-review-step-05-present-md-52b86402-c01"
title: "bmad-method: skills/bmad-code-review/step-05-present.md module"
summary: "Carrier for 2 atomic instructions from bmad-method:skills/bmad-code-review/step-05-present.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-code-review/step-05-present.md\"}"
atom_ids:
  - hand-over-the-review-as-a-fix-brief
  - record-review-findings-in-the-plan
atom_count: 2
atoms: "[{\"atom_id\":\"hand-over-the-review-as-a-fix-brief\",\"file_sha256\":\"5c1bf1bce7a8b68fac2367a83a0d7688b1f1033929f57dd199ca276c0e2f6d6d\",\"content_sha256\":\"58b16ad95bfa04e814e56af14c53fbc34e2269ae69c8382fa064191117beb4a5\",\"file_bytes\":2194,\"body_bytes\":863},{\"atom_id\":\"record-review-findings-in-the-plan\",\"file_sha256\":\"b4ea48314894beed5a4b13acabc3d477612a4d20940e696924051821af95702e\",\"content_sha256\":\"961ebc82be1dffaaf30db8d9ff17d7a96f604c344160e775633a4f3f0af452f5\",\"file_bytes\":2839,\"body_bytes\":1490}]"
carrier_sha256: a1802c4ab79d4c4886d2988d02ecb9c024289402463660c88de53df5362e935a
carrier_bytes: 5286
revision: 1
status: active
---
<!-- vpmodule:atom:begin hand-over-the-review-as-a-fix-brief -->
---
instruction_id: hand-over-the-review-as-a-fix-brief
title: Hand over the review as a fix brief
summary: "Write one block a coding agent can fix the findings from without redoing the review: the base and the commit by full SHA, what is wrong and how you know, what the fixed code should do, and how to check it."
capability_tags:
  - communicate-concisely
pattern_tags:
  - code-review
conditions_applies_when: The review is handed to another agent that is to apply the findings.
conditions_does_not_apply_when: The findings are applied in this session.
artifact_contract_output_type: review-handoff
artifact_contract_required_data:
  - the base and the reviewed commit
  - what is wrong and how you know
  - the outcome the fixed code should have
  - how to check the fix
  - "the findings that are not the other agent's to fix"
artifact_contract_verified_by: "the brief names the range, carries an outcome and a check per patch finding, and never claims that a fix was verified"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-code-review/step-05-present.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Hand over the review as a fix brief
Write one Markdown block a coding agent can fix the findings from without redoing the review.
Name the base it was compared to by full SHA, and the reviewed commit the same way, or say that the change is uncommitted on top of the base.
Then, for each `patch` finding (including any resolved from `decision-needed`): what is wrong and how you know; the files or symbols it touches; what the fixed code should do, as an outcome, not a recipe; and how to check the fix, including anything that has to be run to confirm the defect.
If there are no `patch` findings, say so.
Then, under their own headings, list the `decision-needed` findings still unresolved and the `defer` findings, each with its reason, so the agent knows they are not its to fix.
Nothing was run in this review, so never claim a fix works or a check passed.
<!-- vpmodule:atom:end hand-over-the-review-as-a-fix-brief -->
<!-- vpmodule:atom:begin record-review-findings-in-the-plan -->
---
instruction_id: record-review-findings-in-the-plan
title: Record the review findings in the plan
summary: "Append a dated block to the plan's code-review section — decision-needed first, then patch, then defer — rendered from the triage file, and never change the plan's status."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: The review has findings and a plan document that is the record of this work.
conditions_does_not_apply_when: "There is no plan document, or the plan is not where this work is recorded."
artifact_contract_output_type: recorded-findings
artifact_contract_required_data:
  - the dated block
  - the findings by bucket
  - the deferred list
artifact_contract_verified_by: "the plan carries the dated block with the findings in order, and every deferred finding also appears in the deferred list"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-code-review/step-05-present.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=tools/ticket-tree-rules.md
status: active
revision: 4
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Record the review findings in the plan
When `{plan_file}` is set, always write findings to it before offering action choices.
Never change a plan's `status`. The build leaves it at `built`; only the user marks a ticket done.
If `{plan_file}` is set, append a block to its `## Code Review` section, creating that section at the end of the file when it is absent.
The block opens with `### {date}` and the summary line from section 3, then the findings below, then the `Rejected` appendix.
Write all findings from `{triage_file}` in this order, using its verdict, route, evidence and rejection reason:
`decision-needed` findings (unchecked): `- [ ] [Review][Decision] <Title> — <Detail> Options: <each option, one line>. Recommended: <option> — <reason>.`
`patch` findings (unchecked): `- [ ] [Review][Patch] <Title> [<file>:<line>]`
`defer` findings (checked off, marked deferred): `- [x] [Review][Defer] <Title> [<file>:<line>] — deferred: <pre-existing, or for maybe-false the evidence that would settle it>`
Also append each `defer` finding to `{deferred_work_file}` under a heading `## Deferred from: code review ({date})`.
One bullet per finding with description.
If the user chooses to defer, ask: Quick one-line reason for deferring this item? (helps future reviews): — then append that reason to both the finding's bullet in `{plan_file}` and the `{deferred_work_file}` entry.
Each run adds a dated block with that run's findings. Deferred findings go into the same block.
<!-- vpmodule:atom:end record-review-findings-in-the-plan -->