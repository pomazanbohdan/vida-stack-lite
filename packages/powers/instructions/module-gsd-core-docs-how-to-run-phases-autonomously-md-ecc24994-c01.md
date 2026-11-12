---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-docs-how-to-run-phases-autonomously-md-ecc24994-c01"
title: "gsd-core: docs/how-to/run-phases-autonomously.md module"
summary: "Carrier for 2 atomic instructions from gsd-core:docs/how-to/run-phases-autonomously.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"docs/how-to/run-phases-autonomously.md\"}"
atom_ids:
  - keep-an-unattended-run-on-the-quality-gates
  - name-the-situations-that-forbid-an-unattended-run
atom_count: 2
atoms: "[{\"atom_id\":\"keep-an-unattended-run-on-the-quality-gates\",\"file_sha256\":\"c57abe512bfcc9bae8c9f91a259edb853a437379220b1e4ccf1d054c6d3d5bbf\",\"content_sha256\":\"3be529f880378098c35047cc538f137a91c2dcdd74896a7add2a5398d3035176\",\"file_bytes\":1612,\"body_bytes\":488},{\"atom_id\":\"name-the-situations-that-forbid-an-unattended-run\",\"file_sha256\":\"7b0f039dbb498e53f0362a558fc023dfeb744702aac8e71020c7930bcf54b3ef\",\"content_sha256\":\"e1f755ac1ff54366c0cc1c3a5d0a4c0eaf2739592d75f40a7626aed4e64837ca\",\"file_bytes\":1550,\"body_bytes\":469}]"
carrier_sha256: 4e4ce6fdabf65c3a96493e90e4e6bd92a70422aab0710d33b9394416f1873737
carrier_bytes: 3461
revision: 1
status: active
---
<!-- vpmodule:atom:begin keep-an-unattended-run-on-the-quality-gates -->
---
instruction_id: keep-an-unattended-run-on-the-quality-gates
title: Keep an unattended run on the quality gates
summary: An unattended run still checks the plan before it executes it and still routes on the verification result; only a pass advances on its own.
capability_tags:
  - coordinate-program
pattern_tags:
  - unattended-execution
conditions_applies_when: A run continues through several phases without a human present.
conditions_does_not_apply_when: A single phase is run step by step with the human in the loop.
artifact_contract_output_type: unattended-run-policy
artifact_contract_required_data:
  - the gates the run still applies
  - the states that pause the run
artifact_contract_verified_by: the run states the gates it still applies and the states that pause it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/run-phases-autonomously.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Keep an unattended run on the quality gates
Runs the plan-checker before execution
Reads `VERIFICATION.md` after execution and routes on the result
Pauses and asks you what to do when verification status is `human_needed` or `gaps_found`
Stops and presents options (fix and retry, skip phase, or stop) if any step fails
The only difference from manual execution is that `passed` verification advances automatically — you are not prompted between phases unless a decision is required.
<!-- vpmodule:atom:end keep-an-unattended-run-on-the-quality-gates -->
<!-- vpmodule:atom:begin name-the-situations-that-forbid-an-unattended-run -->
---
instruction_id: name-the-situations-that-forbid-an-unattended-run
title: Name the situations that forbid an unattended run
summary: "Unsettled decisions, novel or high-risk work, and a half-finished phase are the reasons to stay in the loop."
capability_tags:
  - coordinate-program
pattern_tags:
  - stakes-calibrated-rigor
conditions_applies_when: A choice is being made between an unattended run and a supervised one.
conditions_does_not_apply_when: The run is already supervised.
artifact_contract_output_type: run-suitability-decision
artifact_contract_required_data:
  - the situation
  - the reason an unattended run is refused
artifact_contract_verified_by: the refusal names the situation that makes an unattended run unsafe
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/run-phases-autonomously.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Name the situations that forbid an unattended run
**Phases have unsettled design decisions.**
Run discuss interactively first, or use `--interactive`.
**The phase has novel or high-risk work.** Autonomous mode skips pauses unless it hits a blocker. On a phase where you expect surprises, stay in the loop with manual execution.
**You are mid-phase with partial execution.** Autonomous mode picks up incomplete phases but it does not resume a partially-executed wave.
<!-- vpmodule:atom:end name-the-situations-that-forbid-an-unattended-run -->