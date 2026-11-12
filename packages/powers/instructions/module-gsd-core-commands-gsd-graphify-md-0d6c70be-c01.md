---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-commands-gsd-graphify-md-0d6c70be-c01"
title: "gsd-core: commands/gsd/graphify.md module"
summary: "Carrier for 2 atomic instructions from gsd-core:commands/gsd/graphify.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"commands/gsd/graphify.md\"}"
atom_ids:
  - keep-the-last-valid-artefact-when-a-regeneration-fails
  - run-a-must-finish-pipeline-in-the-foreground
atom_count: 2
atoms: "[{\"atom_id\":\"keep-the-last-valid-artefact-when-a-regeneration-fails\",\"file_sha256\":\"919268b2a5c2c596c175e5e1712ac836a31664d0998f141964d28ce3f924aaf4\",\"content_sha256\":\"f07d62f82f40083a992283f81e64b9253f15526bb76ac9da1052c2b29ce3f799\",\"file_bytes\":1424,\"body_bytes\":178},{\"atom_id\":\"run-a-must-finish-pipeline-in-the-foreground\",\"file_sha256\":\"8d96990ccdf675a0eb79d0ad9c0b339433547bbcfd020149822598fef978ea89\",\"content_sha256\":\"d1deb290f731cc1a3d2474629340b63493381d1d75272330f75e93efcb96991e\",\"file_bytes\":1837,\"body_bytes\":537}]"
carrier_sha256: 7e6af6cf8f73c42dc1e3d9aa2747a379a46032032e969359c4a827848dbc02f1
carrier_bytes: 3572
revision: 1
status: active
---
<!-- vpmodule:atom:begin keep-the-last-valid-artefact-when-a-regeneration-fails -->
---
instruction_id: keep-the-last-valid-artefact-when-a-regeneration-fails
title: Keep the last valid artefact when a regeneration fails
summary: A regeneration that fails leaves the previous valid artefact in place and stops; the broken attempt never replaces the good one.
capability_tags:
  - degrade-gracefully-under-failure
pattern_tags:
  - graceful-degradation
conditions_applies_when: A regeneration of a derived artefact fails part way through.
conditions_does_not_apply_when: The regeneration succeeded.
artifact_contract_output_type: failed-regeneration-report
artifact_contract_required_data:
  - the failure that was reported
  - the artefact that was kept
artifact_contract_verified_by: the previous valid artefact is still there and the failed attempt stopped the run
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=commands/gsd/graphify.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=skills/gsd-graphify/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Keep the last valid artefact when a regeneration fails
If the chain fails (non-zero exit):
Do NOT delete the output directory.
The prior valid graph remains available
**STOP**
<!-- vpmodule:atom:end keep-the-last-valid-artefact-when-a-regeneration-fails -->
<!-- vpmodule:atom:begin run-a-must-finish-pipeline-in-the-foreground -->
---
instruction_id: run-a-must-finish-pipeline-in-the-foreground
title: Run a must-finish pipeline in the foreground
summary: "A pipeline that has to run to its end runs in one foreground call: it is never handed to a background task or to a sub-agent, because the chain is cut when the caller exits."
capability_tags:
  - execute-plan
pattern_tags:
  - verification-before-completion
conditions_applies_when: A sequence of commands has to complete before the next step may start.
conditions_does_not_apply_when: The steps are independent and may run side by side.
artifact_contract_output_type: foreground-pipeline-run
artifact_contract_required_data:
  - the chain that was run in the foreground
  - the result of the chain
artifact_contract_verified_by: the whole chain ran in one foreground call and the result of the chain is on record
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=commands/gsd/graphify.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=skills/gsd-graphify/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Run a must-finish pipeline in the foreground
DO NOT pass `run_in_background: true` for the build chain -- the operation is fast and must complete in the foreground.
Do NOT pass `run_in_background: true`. Typical builds complete in 15-60 seconds and the entire chain must run foreground.
Run the build, copy artifacts, write the diff snapshot, and report the summary in a single foreground Bash call so the whole pipeline survives to completion.
DO NOT spawn an agent for any operation -- build, query, status, and diff all run inline.
<!-- vpmodule:atom:end run-a-must-finish-pipeline-in-the-foreground -->