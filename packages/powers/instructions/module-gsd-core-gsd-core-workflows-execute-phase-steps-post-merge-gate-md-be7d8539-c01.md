---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-workflows-execute-phase-steps-post-merge-gate-md-be7d8539-c01"
title: "gsd-core: gsd-core/workflows/execute-phase/steps/post-merge-gate.md module"
summary: "Carrier for 3 atomic instructions from gsd-core:gsd-core/workflows/execute-phase/steps/post-merge-gate.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/workflows/execute-phase/steps/post-merge-gate.md\"}"
atom_ids:
  - bound-the-check-and-name-the-likely-cause-of-a-timeout
  - gate-the-merged-result-not-only-each-part
  - report-a-gate-failure-and-carry-it-forward
atom_count: 3
atoms: "[{\"atom_id\":\"bound-the-check-and-name-the-likely-cause-of-a-timeout\",\"file_sha256\":\"9f910e417d16307dc62a3e3609259abcd4bc2f87a5f5cfdf6f23658072e140c8\",\"content_sha256\":\"608e919ba4c8a0d82fdde71c79b5305bf44c15966c8c20a7b8409bd1d5833713\",\"file_bytes\":1570,\"body_bytes\":217},{\"atom_id\":\"gate-the-merged-result-not-only-each-part\",\"file_sha256\":\"cdfe4f7295307b66e488078c520cbb90992d4d8c96d96afa3488c655332cd2ac\",\"content_sha256\":\"9ccc6935d42ba4c8437255bd1e962f3c01e2a9c2b713d12e0a8eaacae25c3c9b\",\"file_bytes\":1554,\"body_bytes\":338},{\"atom_id\":\"report-a-gate-failure-and-carry-it-forward\",\"file_sha256\":\"bc23003ce89d17e339d0a8a7bc0525a91003768f1ad1f036b35619e16550b0bc\",\"content_sha256\":\"d57268f4660da8a3be3b36200e65b0be58b89d2a73f5652af0e3c65787d8c74c\",\"file_bytes\":1462,\"body_bytes\":304}]"
carrier_sha256: 7d49abe82cb28fffb8e72d5d0ec015fb701dd3adad47bd7b6cfbdef17597e504
carrier_bytes: 5033
revision: 1
status: active
---
<!-- vpmodule:atom:begin bound-the-check-and-name-the-likely-cause-of-a-timeout -->
---
instruction_id: bound-the-check-and-name-the-likely-cause-of-a-timeout
title: Bound the check and name the likely cause of a timeout
summary: A long-running check runs one-shot under a timeout; when it times out the run does not continue silently — the likely cause and the recovery options are named.
capability_tags:
  - verify-work-results
pattern_tags:
  - resource-bounds
conditions_applies_when: "A check that can run indefinitely (a test runner, a build) is executed."
conditions_does_not_apply_when: The check is known to terminate on its own.
artifact_contract_output_type: timeout-report
artifact_contract_required_data:
  - the budget the check ran under
  - the likely cause of the timeout
  - the recovery options
artifact_contract_verified_by: a timeout is reported with its cause and the run did not continue silently
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/execute-phase/steps/regression-gate-run.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/execute-phase/steps/post-merge-gate.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Bound the check and name the likely cause of a timeout
The runner did not exit within the budget (watch/dev mode is the likely cause). Surface the watch-mode cause and the recovery options; never silently continue.
<!-- vpmodule:atom:end bound-the-check-and-name-the-likely-cause-of-a-timeout -->
<!-- vpmodule:atom:begin gate-the-merged-result-not-only-each-part -->
---
instruction_id: gate-the-merged-result-not-only-each-part
title: "Gate the merged result, not only each part"
summary: "After parallel units are merged, a combined build and test gate runs: the self-checks of the individual units cannot see a cross-unit integration failure."
capability_tags:
  - integrate-branch
pattern_tags:
  - branch-integration
conditions_applies_when: Several units were executed in parallel and have been merged into one result.
conditions_does_not_apply_when: A single unit ran and its own checks already cover the result.
artifact_contract_output_type: integration-gate-report
artifact_contract_required_data:
  - the merged result that was gated
  - the gate outcomes
  - the cross-unit conflicts found
artifact_contract_verified_by: the merged result passed a combined build and test gate after the merge
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/execute-phase/steps/post-merge-gate.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Gate the merged result, not only each part
Post-merge build & test gate. Runs after all worktrees in a wave are merged (parallel mode), or after the last plan completes (serial mode). Catches cross-plan integration failures that individual worktree self-checks cannot detect.
✓ Post-merge test gate passed — no cross-plan conflicts
<!-- vpmodule:atom:end gate-the-merged-result-not-only-each-part -->
<!-- vpmodule:atom:begin report-a-gate-failure-and-carry-it-forward -->
---
instruction_id: report-a-gate-failure-and-carry-it-forward
title: Report a gate failure and carry it forward
summary: A failed or timed-out gate is recorded where the next wave can see it and is never silently ignored.
capability_tags:
  - keep-decision-trail
pattern_tags:
  - single-source-of-truth
conditions_applies_when: A gate failed or timed out.
conditions_does_not_apply_when: The gate passed.
artifact_contract_output_type: gate-failure-record
artifact_contract_required_data:
  - the gate that failed
  - the failure
  - the waves that already failed
artifact_contract_verified_by: the next wave reports the earlier failures
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/execute-phase/steps/post-merge-gate.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: "The body refers to missing report contents and ends an incomplete 'Subsequent waves should report' list, so its instruction form cannot be assigned without reconstructing omitted text."
---

# Report a gate failure and carry it forward
the cumulative wave-failure handoff file, which tracks failures across waves
a shell counter cannot: every fenced block is its own shell
Subsequent waves should report:
but it is NEVER silently ignored — the watch-mode cause is named so the user can fix it
<!-- vpmodule:atom:end report-a-gate-failure-and-carry-it-forward -->