---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-workflows-plan-review-convergence-md-fc6aada3-c02"
title: "gsd-core: gsd-core/workflows/plan-review-convergence.md module"
summary: "Carrier for 2 atomic instructions from gsd-core:gsd-core/workflows/plan-review-convergence.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/workflows/plan-review-convergence.md\"}"
atom_ids:
  - take-the-count-from-the-round-not-the-log
  - treat-a-finding-as-open-until-the-plan-represents-it
atom_count: 2
atoms: "[{\"atom_id\":\"take-the-count-from-the-round-not-the-log\",\"file_sha256\":\"90693e7bec50e5baa24b0b3746af956dd8511a046ccce894b06c61d5b9869cac\",\"content_sha256\":\"18bf57a09795c98c617179306f39e35e5dafeb2ceeca4321a077d38d347695e8\",\"file_bytes\":1346,\"body_bytes\":221},{\"atom_id\":\"treat-a-finding-as-open-until-the-plan-represents-it\",\"file_sha256\":\"adada5d882c10f9ae2a4e764ebfc77d14fd70aef59d3c685c7574ca7fd64822f\",\"content_sha256\":\"0264b1088110d390b09ec99032d0d6511ffad5ba6247d3270b4d9545958dcb1e\",\"file_bytes\":1829,\"body_bytes\":585}]"
carrier_sha256: bceeb5069dd6d12c894edd12001f77a0b2dddafb11583ba8ff539a2c547ec07c
carrier_bytes: 3476
revision: 1
status: active
---
<!-- vpmodule:atom:begin take-the-count-from-the-round-not-the-log -->
---
instruction_id: take-the-count-from-the-round-not-the-log
title: "Take the count from the round, not from the log"
summary: "The number of open findings comes from the round that just ran, never from a log that accumulates the history of every round."
capability_tags:
  - triage-reports
pattern_tags:
  - report-triage
conditions_applies_when: The number of open findings is counted to decide whether the loop continues.
conditions_does_not_apply_when: The artifact holds only the current round.
artifact_contract_output_type: round-count
artifact_contract_required_data:
  - the count of the round
  - the source the count was taken from
artifact_contract_verified_by: the count came from the round and was not inflated by resolved findings left in the log
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/plan-review-convergence.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
  - operations
---

# Take the count from the round, not from the log
accumulates history across cycles — resolved findings from prior cycles remain in the file as audit trail, inflating a raw grep count and causing false stall detection.
<!-- vpmodule:atom:end take-the-count-from-the-round-not-the-log -->
<!-- vpmodule:atom:begin treat-a-finding-as-open-until-the-plan-represents-it -->
---
instruction_id: treat-a-finding-as-open-until-the-plan-represents-it
title: Treat a finding as open until the plan represents it
summary: "A finding that the plan does not yet carry is still open, whatever its severity; it closes only when the plan takes it up or records why it is not."
capability_tags:
  - apply-review-feedback
pattern_tags:
  - source-conversion
  - stop-on-conflict
conditions_applies_when: A review produced findings and the question is whether the phase may be considered done.
conditions_does_not_apply_when: The findings are already represented in the plan.
artifact_contract_output_type: open-findings
artifact_contract_required_data:
  - the findings that are still open
  - the plan content that would represent each of them
artifact_contract_verified_by: every finding is either visible in the plan or carries an explicit deferral or rejection
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/plan-review-convergence.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Treat a finding as open until the plan represents it
ACTIONABLE — a non-HIGH review finding that would be invisible to

unless it is incorporated into PLAN.md or explicitly deferred/rejected in PLAN.md.

MEDIUM/LOW concerns that are already incorporated into a PLAN.md task, action, acceptance_criteria, verify command, must_haves item, threat model, artifact list, or explicit deferral/rejection rationale

Actionable MEDIUM/LOW findings must be incorporated into executable PLAN.md content or explicitly deferred/rejected in the relevant PLAN.md before convergence can complete.
<!-- vpmodule:atom:end treat-a-finding-as-open-until-the-plan-represents-it -->