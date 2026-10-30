---
instruction_id: never-silently-pass-an-unverifiable-item-and-never-hard-halt-on-it
title: Never silently pass an unverifiable item and never hard-halt on it
summary: "An abstained item is neither silently passed nor a hard halt: interactive runs route it to the human checkpoint, unattended runs flag it prominently and say so in the completion line."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
  - unattended-execution
conditions_applies_when: An item was abstained on and the run has to continue.
conditions_does_not_apply_when: The item was decided with explicit evidence.
artifact_contract_output_type: abstention-disposition
artifact_contract_required_data:
  - the flag raised for the abstained item
  - the route it took in this run mode
  - the completion line
artifact_contract_verified_by: "the abstained item is flagged, the completion line names the unverified count, and the run did not halt on it"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/honest-verifier.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Never silently pass an unverifiable item and never hard-halt on it
- **Never silent, never a hard halt.** *Interactive:* the abstained item routes to the end-of-phase human checkpoint. *Autonomous (AFK):* it produces a prominent `unverified - held-out test recommended` flag and the completion line reads "complete with N unverified non-inferable checks"; the run neither silently passes the blind spot nor hard-halts.
-> VERIFIED / ✗ FAILED as usual; **never abstained** (over-abstention guard)
