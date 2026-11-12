---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-docs-build-build-a-change-md-d40a0a15-c01"
title: "bmad-method: docs/build/build-a-change.md module"
summary: "Carrier for 4 atomic instructions from bmad-method:docs/build/build-a-change.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"docs/build/build-a-change.md\"}"
atom_ids:
  - gate-the-plan-on-the-three-facts-of-the-settled-design
  - look-for-the-evidence-before-you-ask-the-question
  - re-derive-the-code-from-a-corrected-plan
  - warn-on-multiple-goals-and-continue
atom_count: 4
atoms: "[{\"atom_id\":\"gate-the-plan-on-the-three-facts-of-the-settled-design\",\"file_sha256\":\"d75c64ce25f6f0649d9db740b71fec1b3a24f4af063bf74733df1dbf947b167f\",\"content_sha256\":\"9d202122e643fc5c95237fad80e7a1677c9405da1aa300dc1d611ff174d3d68b\",\"file_bytes\":1821,\"body_bytes\":612},{\"atom_id\":\"look-for-the-evidence-before-you-ask-the-question\",\"file_sha256\":\"a0835e34133946384076b38b36a8184f97bf5ce8c166e7b71f5b1e946f6ddec5\",\"content_sha256\":\"3fe3ea9f97d567e5e36b8005728543e2a66137fe32cf131e0450da43629a3f70\",\"file_bytes\":2212,\"body_bytes\":938},{\"atom_id\":\"re-derive-the-code-from-a-corrected-plan\",\"file_sha256\":\"a70a509b30afa25e868e07d9af16739a2a4f8d1b061e43d4233fa308024742da\",\"content_sha256\":\"4f5df190e318f2c21e250f7683497eaf70ddc88b0f0b241bcbb246071dc37a75\",\"file_bytes\":3051,\"body_bytes\":1542},{\"atom_id\":\"warn-on-multiple-goals-and-continue\",\"file_sha256\":\"cf61aa3dc3fa35a7ae7106efd8bee15dcd42bc927ddf5e999d10b505ec5de67d\",\"content_sha256\":\"9e4f34982de97e9cbc1b8760440335918c2bad4fc9a2ee24f0274e49fc732fdb\",\"file_bytes\":1438,\"body_bytes\":263}]"
carrier_sha256: 6af1f500949688d1dfa5583f4b26e35cc5e9823b0af06ac1d27e0b8b56e98c3d
carrier_bytes: 9109
revision: 1
status: active
---
<!-- vpmodule:atom:begin gate-the-plan-on-the-three-facts-of-the-settled-design -->
---
instruction_id: gate-the-plan-on-the-three-facts-of-the-settled-design
title: Gate the plan on the three facts of the settled design
summary: "Report the intent gaps, the irreversible actions and the footprint, then take the light path only when all three are clean."
capability_tags:
  - plan-implementation
pattern_tags:
  - approval-policy-gate
conditions_applies_when: "The intent is settled, the shape of the change is known, and the depth of the plan is still to be decided."
conditions_does_not_apply_when: The work is not understood well enough to settle the design yet.
artifact_contract_output_type: plan-gate-decision
artifact_contract_required_data:
  - intent gaps
  - irreversible actions
  - footprint
  - the path taken
artifact_contract_verified_by: all three facts are reported and every flagged intent gap is answered before approval
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=docs/build/build-a-change.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Gate the plan on the three facts of the settled design
It reports three facts about the settled design: intent gaps (things you did not say that you would notice in the result), irreversible actions, and footprint.
A design clean on all three takes the light path — a minimal plan and implementation in the same session, reviewed afterwards.
Anything flagged gets a full written plan first, with each intent gap recorded as an open question you answer before approval.
Approve the plan when it describes the right thing to build.
Push back if it does not — fixing the plan is cheaper than fixing the code.
<!-- vpmodule:atom:end gate-the-plan-on-the-three-facts-of-the-settled-design -->
<!-- vpmodule:atom:begin look-for-the-evidence-before-you-ask-the-question -->
---
instruction_id: look-for-the-evidence-before-you-ask-the-question
title: Look for the evidence before you ask the question
summary: "Settle what the repository and the planning context can settle, and turn only what is left into an open question on a finished design."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: A request arrives rough and something in it is unclear.
conditions_does_not_apply_when: The intent is already settled and the work is the implementation.
artifact_contract_output_type: evidence-backed-questions
artifact_contract_required_data:
  - the evidence found
  - the open question
  - the design it sits on
artifact_contract_verified_by: every open question is one the repository and the planning context could not settle
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=docs/build/build-a-change.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/spec-phase.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Look for the evidence before you ask the question
The input can start rough; clear, evidence-supported requests proceed without a clarification turn.
When something is unclear, it looks for evidence first — only what the repository and planning context cannot settle becomes an open question on a finished design, not an interview before work starts.
It does not have to be tidy. A ramble, a voice dump, a half-formed thought, an issue link, a file, or a ticket from the tree all work — anything the model can turn into a concrete goal.
Answer open questions carefully when they appear.
A wrong call there is the most expensive kind of mistake to find later.
Scout the codebase BEFORE the first question — grounded questions only.
Grep the codebase for code/files relevant to this phase goal.
Confirm your current state synthesis internally. Do not present it to the user yet — you'll use it to ask precise, grounded questions.
<!-- vpmodule:atom:end look-for-the-evidence-before-you-ask-the-question -->
<!-- vpmodule:atom:begin re-derive-the-code-from-a-corrected-plan -->
---
instruction_id: re-derive-the-code-from-a-corrected-plan
title: Re-derive the code from a corrected plan
summary: "A finding whose root cause is in the plan sends the work back to the human; a root cause in the plan itself is fixed in the plan, the code is reverted and re-derived, and the loop count stops the run."
capability_tags:
  - plan-implementation
pattern_tags:
  - expand-contract
conditions_applies_when: A review routed a finding to an intent gap or to a bad plan.
conditions_does_not_apply_when: The findings were routed to a patch or a defer.
artifact_contract_output_type: plan-amendment
artifact_contract_required_data:
  - the root cause of the finding
  - the loop iteration count
  - the amendment of the plan
  - the KEEP instructions
  - the change-log entry
artifact_contract_verified_by: the code was re-derived from the amended plan and the change log records the amendment and what was kept
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build/step-04-review.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build/plan-template.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=docs/build/build-a-change.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Re-derive the code from a corrected plan

Process entries in cascading order. If intent_gap or bad_plan entries exist, they trigger a loopback — lower entries are moot since code will be re-derived. If neither exists, process patch and defer normally.

Before each loopback, read `{plan_file}` frontmatter `review_loop_iteration` (missing means `0`), increment it by 1, and write it back. If it exceeds 5, HALT and escalate to the human.

**intent_gap** — Root cause is inside `<frozen-after-approval>`. Revert code changes. Loop back to the human to resolve.

**bad_plan** — Root cause is outside `<frozen-after-approval>`. Before reverting code: extract KEEP instructions for positive preservation (what worked well and must survive re-derivation). Revert code changes. Read the `## Plan Change Log` in `{plan_file}` and strictly respect all logged constraints when amending the non-frozen sections that contain the root cause. Append a new change-log entry recording: the triggering finding, what was amended, the known-bad state avoided, and the KEEP instructions.

Do not modify or delete existing entries.

Each entry records: what finding triggered the change, what was amended, what known-bad state the amendment avoids, and any KEEP instructions (what worked well and must survive re-derivation).

Empty until the first bad_plan loopback.
If the code is wrong because the plan was weak, or the plan is wrong because the goal was wrong, it goes back to that layer and regenerates from there instead of patching only the diff.
<!-- vpmodule:atom:end re-derive-the-code-from-a-corrected-plan -->
<!-- vpmodule:atom:begin warn-on-multiple-goals-and-continue -->
---
instruction_id: warn-on-multiple-goals-and-continue
title: Warn on multiple goals and continue
summary: Several independently shippable goals in one request are flagged as a warning; the work is neither split nor blocked.
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: The intent carries more than one independently shippable goal.
conditions_does_not_apply_when: The intent carries a single goal.
artifact_contract_output_type: multi-goal-warning
artifact_contract_required_data:
  - the goals found
  - the warning that was recorded
artifact_contract_verified_by: the warning was recorded and the work continued
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build-auto/step-01-clarify-and-route.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=docs/build/build-a-change.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - product
  - operations
---

# Warn on multiple goals and continue
If the intent appears to contain multiple independently shippable goals, carry `multiple-goals` forward
Do not split or block
Each run stays focused on one goal.
Check that file after a run — it is a backlog of follow-ups.
<!-- vpmodule:atom:end warn-on-multiple-goals-and-continue -->