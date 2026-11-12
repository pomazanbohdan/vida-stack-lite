---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-workflows-execute-plan-md-5ff71dee-c01"
title: "gsd-core: gsd-core/workflows/execute-plan.md module"
summary: "Carrier for 8 atomic instructions from gsd-core:gsd-core/workflows/execute-plan.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/workflows/execute-plan.md\"}"
atom_ids:
  - bound-the-repair-attempts-and-then-escalate
  - classify-the-coverage-of-every-deliverable
  - clear-the-acceptance-criteria-before-the-next-step
  - close-out-in-one-atomic-order
  - complete-a-shared-item-only-when-every-owner-is-done
  - document-the-deviations-even-when-there-are-none
  - make-a-checkpoint-a-verification-or-a-decision
  - treat-a-recorded-external-job-as-a-legal-deferred-state
atom_count: 8
atoms: "[{\"atom_id\":\"bound-the-repair-attempts-and-then-escalate\",\"file_sha256\":\"2a7b21a498ddc5d6b04ae6909c45b9b96a8fd1b6d18b7eaf345b462d3f642085\",\"content_sha256\":\"4726d82da048e34bc2144fbd1d7cd6de21896bec07dd958629f3a821472b452f\",\"file_bytes\":1478,\"body_bytes\":380},{\"atom_id\":\"classify-the-coverage-of-every-deliverable\",\"file_sha256\":\"94d59b483df3566ed0b8ad23c86cdbc818a0fcf8ec207a24f0df17fc3e2a5629\",\"content_sha256\":\"692ded396244e0b90650b306c3446937d1d4dd85911a2084bff951e6cfac1290\",\"file_bytes\":1577,\"body_bytes\":451},{\"atom_id\":\"clear-the-acceptance-criteria-before-the-next-step\",\"file_sha256\":\"9c948b913e6030021fedaf278817a4e67b3b20b7727be51179ae79f21a4f090f\",\"content_sha256\":\"c05b5bdab83af1a433e9e878afa75e7cd1399948caddc2521a1169d920630391\",\"file_bytes\":2031,\"body_bytes\":667},{\"atom_id\":\"close-out-in-one-atomic-order\",\"file_sha256\":\"a9ee4e1c0fdac4d9cac29bd65ff590a9cac721d936613832a3676982172486a6\",\"content_sha256\":\"2e35119f4e4f74d6bacaa34d5dbeba1b94ac416c33c9d42722dafe0acbfff06e\",\"file_bytes\":1600,\"body_bytes\":485},{\"atom_id\":\"complete-a-shared-item-only-when-every-owner-is-done\",\"file_sha256\":\"4f7ae736ef5e7bb3798c506970c7fcc3e910e06c354dc2f9547ea63aa1e0722d\",\"content_sha256\":\"6c2584e4cc4544e5d56123cbe6095eb22a3da12ec6efa7924df57721423b962a\",\"file_bytes\":1866,\"body_bytes\":671},{\"atom_id\":\"document-the-deviations-even-when-there-are-none\",\"file_sha256\":\"38b6625834b2c0154d9d9665237301e9c5dcc22067e5db92855850141fa2a108\",\"content_sha256\":\"4e96c9623255bf8cc4796188f663b003a8bdb1bb82814418de9a3784b5eca3bb\",\"file_bytes\":1473,\"body_bytes\":384},{\"atom_id\":\"make-a-checkpoint-a-verification-or-a-decision\",\"file_sha256\":\"2862b04c846967bd3eeda783310345a5dff1f505608af1fcb87faaa30711e04e\",\"content_sha256\":\"6d44227b57e81c28622e96f7f4d3a9ccf48b94c5f8eb1b2c5ee0f6548d36e793\",\"file_bytes\":1580,\"body_bytes\":262},{\"atom_id\":\"treat-a-recorded-external-job-as-a-legal-deferred-state\",\"file_sha256\":\"e63686e5d84ed5e03181937f2bcbc2852e706c374bd3f675458cfcc6589b80f4\",\"content_sha256\":\"eee7ade4fbc8a6fea0efaa93ad25155bb831158e8b6e9aa052a408fa43fc3506\",\"file_bytes\":1478,\"body_bytes\":299}]"
carrier_sha256: 8b62cb46cfba43b9682a4049f3a1ea235329fe8e2e02ada902dbd32fbcf40544
carrier_bytes: 14276
revision: 1
status: active
---
<!-- vpmodule:atom:begin bound-the-repair-attempts-and-then-escalate -->
---
instruction_id: bound-the-repair-attempts-and-then-escalate
title: Bound the repair attempts and then escalate
summary: "The repair of a failed verification is bounded; when the budget is spent the run stops and the choice — retry, skip as incomplete, or stop to investigate — goes to the person."
capability_tags:
  - execute-plan
pattern_tags:
  - resource-bounds
conditions_applies_when: A verification of a finished task failed.
conditions_does_not_apply_when: The verification passed.
artifact_contract_output_type: repair-escalation
artifact_contract_required_data:
  - what the repair attempted
  - the repair budget
  - the options offered
artifact_contract_verified_by: the repair stopped at its budget and the run did not decide on its own
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/execute-plan.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Bound the repair attempts and then escalate
Repair will attempt RETRY, DECOMPOSE, or PRUNE autonomously. Only reaches this gate again if repair budget is exhausted (ESCALATE).
Present: "Verification failed for Task [X]: [name]. Expected: [criteria]. Actual: [result]. Repair attempted: [summary of what was tried]." Options: Retry | Skip (mark incomplete) | Stop (investigate).
<!-- vpmodule:atom:end bound-the-repair-attempts-and-then-escalate -->
<!-- vpmodule:atom:begin classify-the-coverage-of-every-deliverable -->
---
instruction_id: classify-the-coverage-of-every-deliverable
title: Classify the coverage of every deliverable
summary: "Every shipped deliverable is classified as machine-covered or human-judged; an undetermined coverage defaults to human judgment, and only a proven pass skips the human."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: A unit of work wrote up what it shipped.
conditions_does_not_apply_when: Nothing was shipped.
artifact_contract_output_type: coverage-classification
artifact_contract_required_data:
  - the deliverables
  - the verification per deliverable
  - the human judgment per deliverable
artifact_contract_verified_by: every deliverable is classified and an unproven pass is not claimed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/execute-plan.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Classify the coverage of every deliverable
**Every deliverable MUST be classified.** If you cannot determine coverage, default to `human_judgment: true` with `rationale: "Coverage not determined at authoring time — verifier must classify"`.
Never set `human_judgment: false` without a non-empty all-`pass` `verification`
auto-passes (skips the human) ONLY on that proof, so an unproven `false` still routes to the human but loses the audit trail.
<!-- vpmodule:atom:end classify-the-coverage-of-every-deliverable -->
<!-- vpmodule:atom:begin clear-the-acceptance-criteria-before-the-next-step -->
---
instruction_id: clear-the-acceptance-criteria-before-the-next-step
title: Clear the acceptance criteria before the next step
summary: "The acceptance criteria of a finished unit are checked before the next unit starts: a failing criterion is fixed and re-checked, and a criterion that cannot be satisfied is recorded as a deviation — never silently skipped."
capability_tags:
  - execute-plan
pattern_tags:
  - testable-criteria
  - acceptance-criteria-timing-policy
conditions_applies_when: A unit declares acceptance criteria and the implementation has just finished them.
conditions_does_not_apply_when: The unit declares no acceptance criteria.
artifact_contract_output_type: acceptance-criteria-gate
artifact_contract_required_data:
  - the criteria checked
  - the result of each check
  - the deviations recorded
artifact_contract_verified_by: every criterion passed before the next unit started and no failing criterion was skipped
compatibility_excludes:
  - judge-the-acceptance-criteria-at-review-not-during-implementation
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/execute-plan.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Clear the acceptance criteria before the next step
After completing each task, if it has `<acceptance_criteria>` (inline or resolved), you MUST run a verification loop before proceeding:
For each criterion: execute the grep, file check, or CLI command that proves it passes
If ANY criterion fails: fix the implementation immediately, then re-run ALL criteria
Repeat until all criteria pass — you are BLOCKED from starting the next task until this gate clears
If a criterion cannot be satisfied after 2 fix attempts, log it as a deviation with reason — do NOT silently skip it
This is not advisory. A task with failing acceptance criteria is an incomplete task.
<!-- vpmodule:atom:end clear-the-acceptance-criteria-before-the-next-step -->
<!-- vpmodule:atom:begin close-out-in-one-atomic-order -->
---
instruction_id: close-out-in-one-atomic-order
title: Close out in one atomic order
summary: "Production commits, then the summary commit, then the state update; returning without the committed summary leaves an illegal partial state that the next resume has to detect."
capability_tags:
  - execute-plan
pattern_tags:
  - single-source-of-truth
conditions_applies_when: A unit of work finished and has to be closed out.
conditions_does_not_apply_when: Nothing was committed in this run.
artifact_contract_output_type: close-out-sequence
artifact_contract_required_data:
  - the production commits
  - the summary commit
  - the state update
artifact_contract_verified_by: the summary was committed and no narrative was emitted between the write and the commit
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/execute-plan.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Close out in one atomic order
the only complete close-out order is: production-code commit(s) -> summary commit -> state/roadmap update.
Once production commits for a plan exist, returning without a committed SUMMARY.md is an illegal partial-plan state.
The next execute-phase resume must detect that condition before dispatching another executor.
Do NOT emit narrative output between the Write tool call and the commit tool call.
Truncation at this boundary is a known failure mode
<!-- vpmodule:atom:end close-out-in-one-atomic-order -->
<!-- vpmodule:atom:begin complete-a-shared-item-only-when-every-owner-is-done -->
---
instruction_id: complete-a-shared-item-only-when-every-owner-is-done
title: Complete a shared item only when every owner is done
summary: "An identifier that several units declare is complete only when all of them are finished; the ready subset is computed first, so the first unit to finish cannot flip the shared item."
capability_tags:
  - coordinate-program
pattern_tags:
  - completion-criteria
conditions_applies_when: Several units of the same effort declare the same identifier.
conditions_does_not_apply_when: Only one unit declares the identifier.
artifact_contract_output_type: shared-item-state
artifact_contract_required_data:
  - the identifiers declared
  - the units that declare them
  - the ready subset
artifact_contract_verified_by: a shared identifier reads complete only after every unit that declares it finished
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/execute-plan.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Complete a shared item only when every owner is done
a requirement ID declared by more than one plan in this phase must not read `Complete` until every plan declaring it has finished
otherwise the first plan to finish flips it `Complete` while its sibling plans are still running, before phase verification ever gets a chance to catch a real gap.
Compute the ready subset first, then mark only those
It scans sibling `*-PLAN.md` files in this plan's phase directory and blocks an ID only when a sibling ALSO declares it and that sibling has no `*-SUMMARY.md` yet.
An ID no sibling declares is always ready (single-plan requirements mark immediately, no added latency).
<!-- vpmodule:atom:end complete-a-shared-item-only-when-every-owner-is-done -->
<!-- vpmodule:atom:begin document-the-deviations-even-when-there-are-none -->
---
instruction_id: document-the-deviations-even-when-there-are-none
title: Document the deviations even when there are none
summary: "The deviations section is always present, even when there were none, and every deviation carries where it was found, what was fixed, the files, the verification and the commit."
capability_tags:
  - keep-decision-trail
pattern_tags:
  - decision-trail
conditions_applies_when: A unit of work is written up.
conditions_does_not_apply_when: No write-up is produced.
artifact_contract_output_type: deviations-section
artifact_contract_required_data:
  - the deviations
  - the rule that classified each of them
  - the total
artifact_contract_verified_by: the section is present even when the work went exactly as planned
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/execute-plan.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Document the deviations even when there are none
Summary MUST include deviations section. None? → `## Deviations from Plan\n\nNone - plan executed exactly as written.`
Per deviation: **[Rule N - Category] Title** — Found during: Task X | Issue | Fix | Files modified | Verification | Commit hash
End with: **Total deviations:** N auto-fixed (breakdown). **Impact:** assessment.
<!-- vpmodule:atom:end document-the-deviations-even-when-there-are-none -->
<!-- vpmodule:atom:begin make-a-checkpoint-a-verification-or-a-decision -->
---
instruction_id: make-a-checkpoint-a-verification-or-a-decision
title: Make a checkpoint a verification or a decision
summary: "Everything that can be automated is automated first; a checkpoint carries only a verification or a decision, and the run waits for the human instead of assuming the answer."
capability_tags:
  - guide-a-human-review
pattern_tags:
  - human-in-the-loop
conditions_applies_when: The work reaches a point where the human has to look at something.
conditions_does_not_apply_when: The remaining work can be completed without the human.
artifact_contract_output_type: checkpoint-request
artifact_contract_required_data:
  - what was built
  - the verification or the decision needed
  - the answer that resumes the work
artifact_contract_verified_by: "the checkpoint asks for a verification or a decision only, and the run waited for the answer"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/execute-plan.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: The body sets a generic human checkpoint rule but names no domain-specific artifact or activity; a domain assignment would be speculative.
---

# Make a checkpoint a verification or a decision
automate everything possible first. Checkpoints are for verification/decisions only.
After response: verify if specified. Pass → continue. Fail → inform, wait. WAIT for user — do NOT hallucinate completion.
<!-- vpmodule:atom:end make-a-checkpoint-a-verification-or-a-decision -->
<!-- vpmodule:atom:begin treat-a-recorded-external-job-as-a-legal-deferred-state -->
---
instruction_id: treat-a-recorded-external-job-as-a-legal-deferred-state
title: Treat a recorded external job as a legal deferred state
summary: "A unit of work whose external job is still running is deferred, not partial, and the resume reconciles it instead of dispatching a second executor."
capability_tags:
  - execute-plan
pattern_tags:
  - single-source-of-truth
conditions_applies_when: The work handed over to an external job that has not reached a terminal state.
conditions_does_not_apply_when: The external job finished and its output was verified.
artifact_contract_output_type: deferred-job-record
artifact_contract_required_data:
  - the manifest of the external job
  - its terminal state
  - the output that was verified
artifact_contract_verified_by: no second executor was dispatched for the deferred work
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/execute-plan.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Treat a recorded external job as a legal deferred state
the summary-absent state is a **legal deferred state**
not an illegal partial.
Resume reconciles against the manifest and must NOT re-dispatch a fresh executor for a plan with a non-terminal manifest (that would duplicate the external job).
<!-- vpmodule:atom:end treat-a-recorded-external-job-as-a-legal-deferred-state -->