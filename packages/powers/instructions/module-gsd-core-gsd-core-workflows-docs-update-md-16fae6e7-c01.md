---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-workflows-docs-update-md-16fae6e7-c01"
title: "gsd-core: gsd-core/workflows/docs-update.md module"
summary: "Carrier for 8 atomic instructions from gsd-core:gsd-core/workflows/docs-update.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/workflows/docs-update.md\"}"
atom_ids:
  - ask-before-you-overwrite-a-hand-written-document
  - check-every-conditional-signal-not-only-the-primary-one
  - do-not-ask-a-question-whose-answer-cannot-change-the-result
  - do-not-duplicate-the-work-of-a-running-delegate
  - generate-the-foundations-before-the-docs-that-reference-them
  - halt-the-fix-loop-when-a-fix-breaks-something-that-passed
  - keep-the-delegation-prompt-to-the-assignment-and-the-return-instruction
  - mark-the-claim-the-repository-cannot-prove
atom_count: 8
atoms: "[{\"atom_id\":\"ask-before-you-overwrite-a-hand-written-document\",\"file_sha256\":\"7326f67ef29543e63cfec48ae3bfd8cda085f10e3183bbfef2b9da6cb937ccca\",\"content_sha256\":\"807c8b18fc5f66e5e94bef1cd8042e30e2b1d358fabcf271cfb9a3d0f5304a3d\",\"file_bytes\":1493,\"body_bytes\":380},{\"atom_id\":\"check-every-conditional-signal-not-only-the-primary-one\",\"file_sha256\":\"5180a2956f9d14f5c5a2a0254c310693cb02ff97020493d9520ba96e9d454ed9\",\"content_sha256\":\"13de3f44966f5a27262d3ada982fa4b554c19a71c731590f188afee2ae5aa352\",\"file_bytes\":1302,\"body_bytes\":246},{\"atom_id\":\"do-not-ask-a-question-whose-answer-cannot-change-the-result\",\"file_sha256\":\"f4aaf62357a1a48b27624c13aa1921b8959716adf8a1de3734534dfee2ca4f91\",\"content_sha256\":\"f0e9ba0077c6690f3496d2bdf934fc2468e2c69cc9f2ebc3d447a16f24f958d8\",\"file_bytes\":1342,\"body_bytes\":195},{\"atom_id\":\"do-not-duplicate-the-work-of-a-running-delegate\",\"file_sha256\":\"b0be163f8ffbfa0a6a95237535b7b5af1b8079c8e2df08a843ac9847271cd217\",\"content_sha256\":\"354268fbec0c1ee3bdbad263e3db798888af8198f9c35a67287275c32ffb53d6\",\"file_bytes\":1712,\"body_bytes\":431},{\"atom_id\":\"generate-the-foundations-before-the-docs-that-reference-them\",\"file_sha256\":\"19f6b2f3c282211e5a9b7d149e1b2cc6f25ad7c7728559c73f9359725dea008f\",\"content_sha256\":\"13a2fbdde9213628e87889b8ee49da6a8435b9627d55cc7cd07371c0cf2c2805\",\"file_bytes\":1460,\"body_bytes\":274},{\"atom_id\":\"halt-the-fix-loop-when-a-fix-breaks-something-that-passed\",\"file_sha256\":\"51c66bc57574b70441e9bf4aaa60fa5ab17e31d73a3998c63ec33ac4e75f74bd\",\"content_sha256\":\"4123d46a2b6ca80afe6228657272db73ec456419c1a79c451565ad493be23f91\",\"file_bytes\":1721,\"body_bytes\":481},{\"atom_id\":\"keep-the-delegation-prompt-to-the-assignment-and-the-return-instruction\",\"file_sha256\":\"db78886c3f3f8a9a823e8cd3b4c203c540057744f719a1c1777a38f6b3ddcccf\",\"content_sha256\":\"13edf1fb15646f191796b8839cf84aa97ccdd58ef71a83d5bb1f022433119635\",\"file_bytes\":1449,\"body_bytes\":372},{\"atom_id\":\"mark-the-claim-the-repository-cannot-prove\",\"file_sha256\":\"9aa4dad70527537fd147d0fb8cb59b93d2b17ceea3a7d4e7e8ce9743ab643a9d\",\"content_sha256\":\"41277974ed908f34bb638b7546e340b16590fda223334dee3214cbaca6555039\",\"file_bytes\":1350,\"body_bytes\":192}]"
carrier_sha256: b6d8c1dd3b8c1e0cac5543419cf796658917c2b12e8b81d38fe8f56210a3fb2c
carrier_bytes: 13170
revision: 1
status: active
---
<!-- vpmodule:atom:begin ask-before-you-overwrite-a-hand-written-document -->
---
instruction_id: ask-before-you-overwrite-a-hand-written-document
title: Ask before you overwrite a hand-written document
summary: "A hand-written file is preserved, supplemented or regenerated on the user's decision; the safe default applies otherwise."
capability_tags:
  - ship-a-change-safely
pattern_tags:
  - approval-policy-gate
conditions_applies_when: A file that somebody wrote by hand is in the set of files to be written.
conditions_does_not_apply_when: The file was produced by the same tool in an earlier run.
artifact_contract_output_type: preservation-decision
artifact_contract_required_data:
  - the file
  - the decision
  - the reason
artifact_contract_verified_by: the decision was recorded and the safe default applies where no answer could be taken
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/docs-update.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Ask before you overwrite a hand-written document
How should this file be handled?
[1] preserve    -- Skip entirely. Leave unchanged.
[2] supplement  -- Append only missing sections. Existing content untouched.
[3] regenerate  -- Overwrite with a fresh
generated document.
Default all hand-written docs to `preserve` (safest default).
Record each decision. Update the doc queue:
<!-- vpmodule:atom:end ask-before-you-overwrite-a-hand-written-document -->
<!-- vpmodule:atom:begin check-every-conditional-signal-not-only-the-primary-one -->
---
instruction_id: check-every-conditional-signal-not-only-the-primary-one
title: "Check every conditional signal, not only the primary one"
summary: A primary classification does not suppress the other signals that also match.
capability_tags:
  - audit-codebase
pattern_tags:
  - dimension-sweep
conditions_applies_when: A primary classification was made and further signals are also present.
conditions_does_not_apply_when: Only the primary signal is present.
artifact_contract_output_type: classification
artifact_contract_required_data:
  - the primary classification
  - the conditional signals that also matched
artifact_contract_verified_by: "every signal that matched was applied, not only the primary one"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/docs-update.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Check every conditional signal, not only the primary one
After determining primary_type, check each signal independently regardless of the primary type.
A CLI tool that is also open source with API routes still gets all three conditional docs.
<!-- vpmodule:atom:end check-every-conditional-signal-not-only-the-primary-one -->
<!-- vpmodule:atom:begin do-not-ask-a-question-whose-answer-cannot-change-the-result -->
---
instruction_id: do-not-ask-a-question-whose-answer-cannot-change-the-result
title: Do not ask a question whose answer cannot change the result
summary: A question whose answer would be discarded is not asked.
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: A step is about to ask the user something and the answer would not change what the step produces.
conditions_does_not_apply_when: The answer decides what the step writes or does.
artifact_contract_output_type: terminal-status
artifact_contract_required_data:
  - the step that ran without a question
artifact_contract_verified_by: no question was asked whose answer was discarded
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/docs-update.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: "The body is a generic question-asking rule for unattended steps; the step's output is unspecified, so no listed domain is supported."
---

# Do not ask a question whose answer cannot change the result
can change its result — and none of them has a text-mode fallback, so an unattended run would stop on an answer that is discarded.
<!-- vpmodule:atom:end do-not-ask-a-question-whose-answer-cannot-change-the-result -->
<!-- vpmodule:atom:begin do-not-duplicate-the-work-of-a-running-delegate -->
---
instruction_id: do-not-duplicate-the-work-of-a-running-delegate
title: Do not duplicate the work of a running delegate
summary: Nothing is done in the main session while a delegate holds the work.
capability_tags:
  - delegate-subagent-tasks
pattern_tags:
  - subagent-delegation
conditions_applies_when: A delegated agent is running and holds the work.
conditions_does_not_apply_when: The delegate has returned its result.
artifact_contract_output_type: terminal-status
artifact_contract_required_data:
  - the delegate that is running
  - the result it returned
artifact_contract_verified_by: no work was done in the main session while the delegate was running
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/docs-update.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/execute-phase.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/execute-phase/steps/codebase-drift-gate.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Do not duplicate the work of a running delegate
do NOT generate any documentation independently while the subagents are active.
Wait for all Wave 1 agents to complete before proceeding.
This prevents duplicate work and wasted context.
Do not read more files, edit code, or run tests related to this task while the subagent is active. Wait for the subagent to return its result.
Only resume when the subagent result is available.
<!-- vpmodule:atom:end do-not-duplicate-the-work-of-a-running-delegate -->
<!-- vpmodule:atom:begin generate-the-foundations-before-the-docs-that-reference-them -->
---
instruction_id: generate-the-foundations-before-the-docs-that-reference-them
title: Generate the foundations before the docs that reference them
summary: The documents that cite others are written after the ones they cite.
capability_tags:
  - coordinate-program
pattern_tags:
  - program-orchestration
conditions_applies_when: Documents are written in rounds and the later ones cite the earlier ones.
conditions_does_not_apply_when: No document cites another.
artifact_contract_output_type: document-set
artifact_contract_required_data:
  - the first round
  - the second round
  - the outputs of the first round
artifact_contract_verified_by: the first round was finished before the second round started
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/docs-update.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/docs-update/detail/elaboration.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Generate the foundations before the docs that reference them
These are foundational docs with no cross-references needed, making them ideal for parallel generation.
Wave 2 agents can reference Wave 1 outputs for cross-referencing
complete all three before starting Wave 2
<!-- vpmodule:atom:end generate-the-foundations-before-the-docs-that-reference-them -->
<!-- vpmodule:atom:begin halt-the-fix-loop-when-a-fix-breaks-something-that-passed -->
---
instruction_id: halt-the-fix-loop-when-a-fix-breaks-something-that-passed
title: Halt the fix loop when a fix breaks something that passed
summary: A repair round that makes a passing check fail stops the loop at once.
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: A repair round has finished and the results are being re-checked.
conditions_does_not_apply_when: No repair round has run yet.
artifact_contract_output_type: repair-report
artifact_contract_required_data:
  - the documents repaired
  - the regressions
  - the remaining failures
artifact_contract_verified_by: the loop stopped on the regression and the remaining failures are reported as needing manual review
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/docs-update.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/docs-update/detail/elaboration.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Halt the fix loop when a fix breaks something that passed
After each iteration's fix agents complete, re-verify ALL docs and check for regression
any doc that previously passed and now fails HALTS the loop immediately — remaining failures require manual review, no further fixes attempted.
at most 2 iterations
One agent spawn per doc with failures. Do not batch multiple docs into one spawn.
This means the fix introduced new errors. Remaining failures require manual review.
<!-- vpmodule:atom:end halt-the-fix-loop-when-a-fix-breaks-something-that-passed -->
<!-- vpmodule:atom:begin keep-the-delegation-prompt-to-the-assignment-and-the-return-instruction -->
---
instruction_id: keep-the-delegation-prompt-to-the-assignment-and-the-return-instruction
title: Keep the delegation prompt to the assignment and the return instruction
summary: A delegated prompt carries the assignment and the return instruction and nothing else.
capability_tags:
  - delegate-subagent-tasks
pattern_tags:
  - subagent-delegation
conditions_applies_when: A task is being handed to a delegated agent.
conditions_does_not_apply_when: The task is being carried out in the current session.
artifact_contract_output_type: delegation-prompt
artifact_contract_required_data:
  - the assignment
  - the return instruction
artifact_contract_verified_by: the prompt carries the assignment and the return instruction and nothing else
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/docs-update.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - operations
---

# Keep the delegation prompt to the assignment and the return instruction
Agent prompts must contain ONLY the
assignment block, the skills
variable, and the return instruction.
Do not include project planning context, workflow prose, or any internal tooling references in agent prompts.
Write the doc file directly. Return confirmation only — do not return doc content.
<!-- vpmodule:atom:end keep-the-delegation-prompt-to-the-assignment-and-the-return-instruction -->
<!-- vpmodule:atom:begin mark-the-claim-the-repository-cannot-prove -->
---
instruction_id: mark-the-claim-the-repository-cannot-prove
title: Mark the claim the repository cannot prove
summary: A claim the repository cannot prove is marked for a human to verify.
capability_tags:
  - write-technical-prose
pattern_tags:
  - human-in-the-loop
conditions_applies_when: A claim about infrastructure is written that the repository cannot prove.
conditions_does_not_apply_when: The claim was checked against a source in the repository.
artifact_contract_output_type: document
artifact_contract_required_data:
  - the claim
  - the marker
artifact_contract_verified_by: every claim that the repository cannot prove carries a marker for manual verification
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/docs-update.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/docs-update/detail/elaboration.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Mark the claim the repository cannot prove
Apply VERIFY markers to any infrastructure claim not discoverable from the repository.
for infrastructure claims that require manual verification.
<!-- vpmodule:atom:end mark-the-claim-the-repository-cannot-prove -->