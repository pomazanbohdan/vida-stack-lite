---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-code-review-step-02-review-md-6b55c051-c01"
title: "bmad-method: skills/bmad-code-review/step-02-review.md module"
summary: "Carrier for 3 atomic instructions from bmad-method:skills/bmad-code-review/step-02-review.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-code-review/step-02-review.md\"}"
atom_ids:
  - record-a-failed-lens-and-continue
  - run-the-review-lenses-as-one-blocking-batch
  - skip-and-announce-the-lenses-that-do-not-apply
atom_count: 3
atoms: "[{\"atom_id\":\"record-a-failed-lens-and-continue\",\"file_sha256\":\"c04dedb7892aa8fb817da555f8f042be6c2ece971f1c13468367d94d8b36ad75\",\"content_sha256\":\"d26a9114b566c3d86dcb97ee41e6555bb3729b38f6ab71f3261a383096078b59\",\"file_bytes\":2241,\"body_bytes\":712},{\"atom_id\":\"run-the-review-lenses-as-one-blocking-batch\",\"file_sha256\":\"42250d74bc1da5dd894a04e5d55ba3f9e9265fa35b961b173ca9b14660e448ac\",\"content_sha256\":\"06e54c1e1d3ab2ec48fdd878a002627007429f911cf9d05edda866e76f0d836e\",\"file_bytes\":1997,\"body_bytes\":636},{\"atom_id\":\"skip-and-announce-the-lenses-that-do-not-apply\",\"file_sha256\":\"36db45bd3b56177934369efb0ae6215869e9828aaddb431bb3d6e15a3c0a6e2b\",\"content_sha256\":\"5074689bbce668bc68284a443690d64ddc6355a8da0416fc6bc8f82a3b04be81\",\"file_bytes\":1440,\"body_bytes\":287}]"
carrier_sha256: 847436bd116c927e3dd874de6b7bbf1049dce06ba73a6edaac711054c2d55dc5
carrier_bytes: 6095
revision: 1
status: active
---
<!-- vpmodule:atom:begin record-a-failed-lens-and-continue -->
---
instruction_id: record-a-failed-lens-and-continue
title: Record a failed lens and continue with the rest
summary: "A lens that fails, times out, or returns nothing is written down by name, the run continues with the lenses that did report, and every finding keeps the lens that produced it."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: "A lens of the review failed, timed out, or came back empty."
conditions_does_not_apply_when: Every lens reported.
artifact_contract_output_type: failed-lens-ledger
artifact_contract_required_data:
  - the failed lens names
  - the findings that did come back
  - the lens each finding came from
artifact_contract_verified_by: every failed lens is named and every finding names the lens that produced it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-code-review/step-02-review.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/docs-update.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/execute-phase/steps/verify-phase-goal.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/map-codebase.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Record a failed lens and continue with the rest
If any lens fails, times out, or returns empty results, append the lens's `name` to `failed_layers` (comma-separated) and proceed with findings from the remaining lenses.
Collect all findings from the completed lenses, keeping track of each finding's originating lens `id`.
Note the failure
Continue with the successful docs
The missing doc will be noted in the final report
Only include files that were successfully written to disk. Do not include failed or skipped docs.
Review failures must never block execution.
Advisory only — never blocks execution flow.
If one of the workers fails, note the failure and continue with the documents that were produced.
<!-- vpmodule:atom:end record-a-failed-lens-and-continue -->
<!-- vpmodule:atom:begin run-the-review-lenses-as-one-blocking-batch -->
---
instruction_id: run-the-review-lenses-as-one-blocking-batch
title: Run the review lenses as one blocking batch
summary: "Launch every active lens together as blocking calls at the same capability, spawn them all before reading any output, and start triage only after the last one reports."
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
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-code-review/step-02-review.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-code-review/workflow.md
status: active
revision: 5
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Run the review lenses as one blocking batch
Run subagents synchronously: launch them together as blocking calls awaited in this turn — never backgrounded or detached, never ending the turn to await results.
When running lenses as subagents, spawn every reviewer before reading or reacting to any of their output; begin collection only once all are launched.
Triage starts only after the last lens has reported. Do not triage findings as they arrive.
Subagents are an important part of this workflow. Use them wherever a step calls for them, if you can. If you need the user's permission to run them, ask once now for the whole run.
<!-- vpmodule:atom:end run-the-review-lenses-as-one-blocking-batch -->
<!-- vpmodule:atom:begin skip-and-announce-the-lenses-that-do-not-apply -->
---
instruction_id: skip-and-announce-the-lenses-that-do-not-apply
title: Skip and announce the lenses that do not apply
summary: "A lens that names a condition the current context does not satisfy is skipped, and the skip is announced with its reason before anything is launched."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: The review has a list of lenses and each of them may name a condition for running.
conditions_does_not_apply_when: Every lens applies to the change under review.
artifact_contract_output_type: active-lens-set
artifact_contract_required_data:
  - the active lenses
  - the skipped lenses
  - the reason for each skip
artifact_contract_verified_by: every skipped lens is named and its reason is stated before the launch
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-code-review/step-02-review.md
status: active
revision: 4
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Skip and announce the lenses that do not apply
`Run only when` present and not satisfied by the current context (`{review_mode}`, `{plan_file}`, `{ticket_file}`, `{verbatim_intent}`) → skip the lens and tell the user which lens was skipped and why.
otherwise → the lens is active.
<!-- vpmodule:atom:end skip-and-announce-the-lenses-that-do-not-apply -->