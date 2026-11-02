---
instruction_id: check-semantic-completeness-not-just-file-existence
title: "Check semantic completeness, not just file existence"
summary: "A delegated result is checked against what had to be true, because a file that exists does not show that the work inside it is complete."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-harness
conditions_applies_when: Work was delegated and its output comes back.
conditions_does_not_apply_when: The agent did the work itself and checked it.
artifact_contract_output_type: delegation-check
artifact_contract_required_data:
  - what had to be true
  - the spot check
  - the gaps the structural check missed
artifact_contract_verified_by: "the must-haves were checked, not only the files"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/context-budget.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Check semantic completeness, not just file existence
Silent partial completion -- agent claims task is done but implementation is incomplete.
Self-check catches file existence but not semantic completeness.
Always verify agent output meets the plan's must_haves, not just that files exist.
When delegating to agents, the orchestrator cannot verify semantic correctness of agent output -- only structural completeness.
Mitigate with must_haves.truths and spot-check verification.
