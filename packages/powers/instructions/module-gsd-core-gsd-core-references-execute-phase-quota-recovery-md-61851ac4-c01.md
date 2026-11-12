---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-references-execute-phase-quota-recovery-md-61851ac4-c01"
title: "gsd-core: gsd-core/references/execute-phase-quota-recovery.md module"
summary: "Carrier for 2 atomic instructions from gsd-core:gsd-core/references/execute-phase-quota-recovery.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/references/execute-phase-quota-recovery.md\"}"
atom_ids:
  - check-the-on-disk-state-before-you-offer-a-retry
  - name-everything-you-tried-when-the-ladder-is-spent
atom_count: 2
atoms: "[{\"atom_id\":\"check-the-on-disk-state-before-you-offer-a-retry\",\"file_sha256\":\"c7bea7d177a4214a574804e2c7b0fadaa66af80163c0a59a0de573c930513861\",\"content_sha256\":\"fa58eac773f537b6b081c128c13a896383380aee04253eb95ee10fd90c4f8fff\",\"file_bytes\":1229,\"body_bytes\":146},{\"atom_id\":\"name-everything-you-tried-when-the-ladder-is-spent\",\"file_sha256\":\"12d083ce0de740a0988284168286f628e04fbf07e532014e1851e095a59aa126\",\"content_sha256\":\"8a7307655bf4d4d68dd52e77315f3ac540564d1d04ee836fdc637ee11c22f7b0\",\"file_bytes\":1510,\"body_bytes\":354}]"
carrier_sha256: 7aa7b6adc7ed1d8ab4a8ac6d7bf22323a7047d3a68735a0daa6fec6463cf19e8
carrier_bytes: 3050
revision: 1
status: active
---
<!-- vpmodule:atom:begin check-the-on-disk-state-before-you-offer-a-retry -->
---
instruction_id: check-the-on-disk-state-before-you-offer-a-retry
title: Check the on-disk state before you offer a retry
summary: "Before a retry is offered, the state on disk is checked; work that already landed is resumed rather than run again."
capability_tags:
  - degrade-gracefully-under-failure
pattern_tags:
  - idempotent-retry-design
conditions_applies_when: A run was interrupted and a retry is being considered.
conditions_does_not_apply_when: Nothing ran yet.
artifact_contract_output_type: resume-decision
artifact_contract_required_data:
  - what the on-disk check found
  - the decision to resume or to rerun
  - the reason
artifact_contract_verified_by: the on-disk state was read before the retry was offered
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/execute-phase-quota-recovery.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Check the on-disk state before you offer a retry
Do not offer "retry now".
Run the step-5 spot-check first;
instead of an immediate redispatch.
<!-- vpmodule:atom:end check-the-on-disk-state-before-you-offer-a-retry -->
<!-- vpmodule:atom:begin name-everything-you-tried-when-the-ladder-is-spent -->
---
instruction_id: name-everything-you-tried-when-the-ladder-is-spent
title: Name everything you tried when the ladder is spent
summary: When the available tiers are exhausted the run says which ones were tried and never silently repeats the last one.
capability_tags:
  - degrade-gracefully-under-failure
pattern_tags:
  - graceful-degradation
conditions_applies_when: The available alternatives are used up and the work still cannot run.
conditions_does_not_apply_when: The work succeeded on the first alternative.
artifact_contract_output_type: exhaustion-report
artifact_contract_required_data:
  - every alternative that was tried
  - the order
  - the manual options that remain
artifact_contract_verified_by: the report names every tried alternative and the last one is not repeated silently
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/execute-phase-quota-recovery.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Name everything you tried when the ladder is spent
A heavier tier on the same throttled provider is still throttled
the ladder is spent. Fail loudly naming every model tried, then fall through to the manual options below. Never silently retry the last one.
escalation is not configured for this project; use the manual path below. This is the default.
<!-- vpmodule:atom:end name-everything-you-tried-when-the-ladder-is-spent -->