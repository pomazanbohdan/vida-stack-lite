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
