---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-agents-gsd-research-synthesizer-compact-md-29fd3a5e-c01"
title: "gsd-core: agents/gsd-research-synthesizer.compact.md module"
summary: "Carrier for 2 atomic instructions from gsd-core:agents/gsd-research-synthesizer.compact.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"agents/gsd-research-synthesizer.compact.md\"}"
atom_ids:
  - do-not-ask-permission-to-write-the-artifact-you-were-commissioned-to-write
  - synthesize-the-findings-instead-of-concatenating-them
atom_count: 2
atoms: "[{\"atom_id\":\"do-not-ask-permission-to-write-the-artifact-you-were-commissioned-to-write\",\"file_sha256\":\"c5a9f3db666b02d7803f9cd10614c51d31b92b2be209449653749b4f57836ed0\",\"content_sha256\":\"066b2325f54f2495def8812ba13c186a81288f257c99315faf0b0448ecebf1ce\",\"file_bytes\":1515,\"body_bytes\":231},{\"atom_id\":\"synthesize-the-findings-instead-of-concatenating-them\",\"file_sha256\":\"033868c954551a480f34bf19d25a5cafdccb218bdc15e1d8c84d910a8831f570\",\"content_sha256\":\"14008004f8716bcc21f281bbb5b82fe2c9e9625e1b40e180a299f669308e850d\",\"file_bytes\":1516,\"body_bytes\":210}]"
carrier_sha256: 6e788ab3a9b0b7b0174034ee2fcd1376f537be9b0772e937db3e2712d6424d7f
carrier_bytes: 3400
revision: 1
status: active
---
<!-- vpmodule:atom:begin do-not-ask-permission-to-write-the-artifact-you-were-commissioned-to-write -->
---
instruction_id: do-not-ask-permission-to-write-the-artifact-you-were-commissioned-to-write
title: Do not ask permission to write the artifact you were commissioned to write
summary: Writing the commissioned artifact is the job; handing it back to the caller turns a finished deliverable into a missing file.
capability_tags:
  - persist-work-to-disk
pattern_tags:
  - approval-policy-proceed
conditions_applies_when: You were commissioned to produce a specific artifact.
conditions_does_not_apply_when: Writing would overwrite a document that belongs to someone else.
artifact_contract_output_type: artifact-on-disk
artifact_contract_required_data:
  - the artifact
  - the confirmation that it was written
artifact_contract_verified_by: the artifact exists on disk and no question was asked about writing it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-research-synthesizer.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-research-synthesizer.compact.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Do not ask permission to write the artifact you were commissioned to write
**Do NOT ask permission to write.**
Asking the orchestrator to do it instead is a failure mode that can cause downstream `SUMMARY.md not found` failures.
<!-- vpmodule:atom:end do-not-ask-permission-to-write-the-artifact-you-were-commissioned-to-write -->
<!-- vpmodule:atom:begin synthesize-the-findings-instead-of-concatenating-them -->
---
instruction_id: synthesize-the-findings-instead-of-concatenating-them
title: Synthesize the findings instead of concatenating them
summary: Parallel results are integrated into one conclusion; a section that only copies the sources side by side has synthesised nothing.
capability_tags:
  - define-output-format
pattern_tags:
  - technical-writing
conditions_applies_when: The outputs of several parallel workers are being merged into one document.
conditions_does_not_apply_when: There is only one source and nothing to integrate.
artifact_contract_output_type: synthesis-document
artifact_contract_required_data:
  - the conclusion the sources jointly support
  - the source each part of it comes from
artifact_contract_verified_by: "the reader gets a conclusion that no single source states, not a list of the sources"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-research-synthesizer.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-research-synthesizer.compact.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - research
  - operations
---

# Synthesize the findings instead of concatenating them
**Synthesized, not concatenated:** Findings are integrated, not just copied
Someone reading only this section should understand the research conclusions.
<!-- vpmodule:atom:end synthesize-the-findings-instead-of-concatenating-them -->