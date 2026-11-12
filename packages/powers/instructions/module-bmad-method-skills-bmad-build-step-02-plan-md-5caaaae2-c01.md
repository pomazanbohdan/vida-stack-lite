---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-build-step-02-plan-md-5caaaae2-c01"
title: "bmad-method: skills/bmad-build/step-02-plan.md module"
summary: "Carrier for 5 atomic instructions from bmad-method:skills/bmad-build/step-02-plan.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-build/step-02-plan.md\"}"
atom_ids:
  - gate-the-plan-on-the-readiness-standard
  - hand-the-plan-to-the-implementer-as-the-only-source-of-truth
  - re-read-the-plan-before-acting-on-the-approval
  - record-the-route-the-review-and-the-lenses-that-ran
  - stop-when-the-request-left-out-something-the-user-would-notice
atom_count: 5
atoms: "[{\"atom_id\":\"gate-the-plan-on-the-readiness-standard\",\"file_sha256\":\"77545b642acc0e41c309e5c0a31f534e7f1989bd6c616763572a4c0aaa8ecd2b\",\"content_sha256\":\"7954568d2fe07025dccb87ef6d3745aa64b2e3ce80336cc87dcd8a404bb975d5\",\"file_bytes\":2350,\"body_bytes\":993},{\"atom_id\":\"hand-the-plan-to-the-implementer-as-the-only-source-of-truth\",\"file_sha256\":\"ec20d9d581297d21433b80cab4d69fa0859f87ed3cb7b79f2b225db149396c78\",\"content_sha256\":\"dbf5e796d52140f4d357129701a59a2a9a198464f8725780a652fe19ffe81551\",\"file_bytes\":2603,\"body_bytes\":1200},{\"atom_id\":\"re-read-the-plan-before-acting-on-the-approval\",\"file_sha256\":\"743200a56fd5f5ebeb84f511cd5ddca772cba7408c78f32dff73f21c0f432657\",\"content_sha256\":\"0ee88a74b860d41ecc752797b01d0774eb26eead5f22c32f76de0993740c7587\",\"file_bytes\":2198,\"body_bytes\":986},{\"atom_id\":\"record-the-route-the-review-and-the-lenses-that-ran\",\"file_sha256\":\"171de875540ddb52ada531d25145eb06a808dc2a0a176bc8f696b5df32564eed\",\"content_sha256\":\"2dda870b5c693169de15379c77effeca01eccabf5feda0a3cd8f877fbdfcbbff\",\"file_bytes\":2238,\"body_bytes\":674},{\"atom_id\":\"stop-when-the-request-left-out-something-the-user-would-notice\",\"file_sha256\":\"199c1f283fb3efe783215e217296e8907c9682571da612e3cef91b53eb95adf7\",\"content_sha256\":\"3180235ddff8e3b61ef979c870ef95431a2ef7a2c2b2ddcafbb984a7b14aa125\",\"file_bytes\":2387,\"body_bytes\":1039}]"
carrier_sha256: c237c5e57138cb265a069dfff86c9f403faecabf45bd45f1c6543259c1ed6cf9
carrier_bytes: 12581
revision: 1
status: active
---
<!-- vpmodule:atom:begin gate-the-plan-on-the-readiness-standard -->
---
instruction_id: gate-the-plan-on-the-readiness-standard
title: Gate the plan on the readiness standard
summary: "A plan is ready only when it is actionable, logical, testable, complete, sufficient and coherent; anything missing is fixed or asked about, never invented."
capability_tags:
  - plan-implementation
pattern_tags:
  - completion-criteria
conditions_applies_when: A plan has been written and is about to be handed over for approval.
conditions_does_not_apply_when: The plan is a draft that is still being written.
artifact_contract_output_type: plan-readiness-check
artifact_contract_required_data:
  - the six readiness properties
  - what is missing for each of them
  - the fix or the open question raised for each gap
artifact_contract_verified_by: every property of the standard is checked and each gap is either fixed in the plan or recorded as an open question
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build/workflow.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build/step-02-plan.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
  - operations
---

# Gate the plan on the readiness standard

A plan is "Ready for Development" when:

**Actionable**: Every task has a file path and specific action.

**Logical**: Tasks ordered by dependency.

**Testable**: All ACs use Given/When/Then, and each is a check the implementer can prove it met without pointing at code.

**Verifiable**: `## Verification` runs every test file a loaded ticket companion lists, and each command names the result that makes it pass.

**Complete**: No placeholders or TBDs.

**Sufficient**: No known requirement, acceptance, dependency, or implementation gaps remain unresolved.

**Coherent**: No unresolved ambiguities or internal contradictions.

Implementation should work from the plan without being told the investigation again.

Self-review against READY FOR DEVELOPMENT standard. For anything important that's missing: if the repository can tell you, go look and fix the plan; if a human has to decide, add an `## Open Questions` entry. Do not invent the answer.
<!-- vpmodule:atom:end gate-the-plan-on-the-readiness-standard -->
<!-- vpmodule:atom:begin hand-the-plan-to-the-implementer-as-the-only-source-of-truth -->
---
instruction_id: hand-the-plan-to-the-implementer-as-the-only-source-of-truth
title: Hand the plan to the implementer as the only source of truth
summary: "The dispatch points at the plan and adds nothing: the goal, the files, the investigation and the acceptance criteria already live in the plan, and the implementation runs one task at a time."
capability_tags:
  - delegate-subagent-tasks
pattern_tags:
  - subagent-delegation
conditions_applies_when: "A written plan is about to be implemented, by another executor or by the same session."
conditions_does_not_apply_when: There is no plan and the work is done directly from a request.
artifact_contract_output_type: implementation-dispatch
artifact_contract_required_data:
  - the plan path
  - the dispatch text
  - the executor that took the work
artifact_contract_verified_by: the dispatch carries no plan content and the executor worked from the plan alone
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build/step-03-implement.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build/step-02-plan.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Hand the plan to the implementer as the only source of truth

Sequential execution only.

No push. No remote ops.

Do not add goal restatements, file lists, ownership boundaries, investigation detail, acceptance criteria, or CLAUDE.md/house-style rules to the dispatch — the plan is the subagent's sole source of truth, and that material already lives in it (investigation findings in its Code Map, the rest in the plan body).

One line of sanctioned hedging belongs in the plan at planning time, not in the dispatch.

The handoff directs the subagent to load the plan's `context:` files itself, so never pre-load and paste those files into the dispatch.
The plan's `context:` carries the companions the ticket names that this work needs, plus project-wide standards; keep it to what is not already distilled into the plan body.

Only when you implement directly (no subagent available) do you load a non-empty `context:` list yourself before starting.

If no subagents are available, implement directly from the plan.

If the platform allows, keep the subagent available for re-engagement after it returns

Do not retell the investigation when implementation starts — the plan already has it.
<!-- vpmodule:atom:end hand-the-plan-to-the-implementer-as-the-only-source-of-truth -->
<!-- vpmodule:atom:begin re-read-the-plan-before-acting-on-the-approval -->
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
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build/step-02-plan.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Re-read the plan before acting on the approval

Only when Open Questions is empty.

Present summary, with the plan's `risk` and the reason for it.

Display the plan file path in whatever form is clickable where you are presenting it (e.g. code citation in chat, CWD-relative path with no leading `/` in terminal). If unsure, use CWD-relative path.

- **Approve and continue** — approve the plan and proceed to implementation in this session.
- **Approve and stop** — approve the plan, leave it `ready-for-dev`, and stop so a fresh session can resume at implementation.
- **Review plan** — review the plan, use a subagent if available, and discuss the findings and revisions with the user until the user is ready to approve, then either stop or continue.

Before acting on approval, re-read `{plan_file}` from disk. If it is missing, HALT without recreating it, changing status, or proceeding. If it changed, acknowledge the external edits and continue with the updated version.
<!-- vpmodule:atom:end re-read-the-plan-before-acting-on-the-approval -->
<!-- vpmodule:atom:begin record-the-route-the-review-and-the-lenses-that-ran -->
---
instruction_id: record-the-route-the-review-and-the-lenses-that-ran
title: "Record the route, the review and the lenses that ran"
summary: "The run state lives in the artifact itself: the route, the review depth, whether each was pinned or chosen automatically, and the ids of the review lenses in launch order."
capability_tags:
  - keep-decision-trail
pattern_tags:
  - decision-trail
conditions_applies_when: A route is chosen or a review pass starts.
conditions_does_not_apply_when: Nothing was chosen and no review ran.
artifact_contract_output_type: run-state-record
artifact_contract_required_data:
  - the route
  - the source of the route choice
  - the review depth
  - the source of the review choice
  - "the ids of the lenses that ran, in launch order"
artifact_contract_verified_by: "a later run can read the route, the review depth and the lens ids from the artifact"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build/step-04-review.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build/step-02-plan.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build/step-oneshot.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: The body lists route and review metadata writes but gives no selection conditions or ordered execution sequence.
---

# Record the route, the review and the lenses that ran

Set `route: 'oneshot'`, `route_source: 'pinned'`, and `status: 'in-progress'`, resolving `date` to the current system date.

Set `route: 'full'` and `route_source: 'pinned'`, then continue.

Set `route: 'full'` and `route_source: 'auto'`, then continue.

Write `review: 'none'`, `review_source: 'pinned'`, and `lenses_ran: []` to `{plan_file}` frontmatter.

Write `review: 'quick'` and `review_source: 'auto'` to `{plan_file}` frontmatter.

Write `review: 'thorough'` and `review_source: 'auto'` to `{plan_file}` frontmatter.

Write `lenses_ran` — the ids launched, in launch order — to `{plan_file}` frontmatter.
<!-- vpmodule:atom:end record-the-route-the-review-and-the-lenses-that-ran -->
<!-- vpmodule:atom:begin stop-when-the-request-left-out-something-the-user-would-notice -->
---
instruction_id: stop-when-the-request-left-out-something-the-user-would-notice
title: Stop when the request left out something the user would notice
summary: "When the request is missing something the user would see in the result, the coding stops, the gap is written down and the human is asked instead of a guess."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: The work is under way and a gap shows up that the user would notice in the result.
conditions_does_not_apply_when: The gap is a detail the user does not see in the result.
artifact_contract_output_type: gap-report
artifact_contract_required_data:
  - the gap
  - where the gap was written down
  - the question put to the human
artifact_contract_verified_by: "the coding stopped at the gap and nothing was guessed on the user's behalf"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build/step-oneshot.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build/step-02-plan.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Stop when the request left out something the user would notice

Stop coding if the request left out something the user would notice in the result.

Write the gap in `## Implementation Notes`, then ask the human — do not guess.

Then update `{plan_file}`: add back `## Code Map` (filled in from what you learned while implementing) and `## Open Questions` (one question per gap), set `route: 'full'` and `status: 'draft'`.

Do not ask the human during investigation. When something is unclear, look in the repository, planning artifacts, or history first. Keep looking until you know, or until those sources have nothing more to say. Leave any remaining choice for the next step.

If there are intent gaps, add a `## Open Questions` section with one entry per gap: the choice, the options, and what each option means.

Present every entry as a numbered question with its options and what each option means, and HALT for the human's answers. Write each answer into the `<frozen-after-approval>` block as a decision and delete the entry.
<!-- vpmodule:atom:end stop-when-the-request-left-out-something-the-user-would-notice -->