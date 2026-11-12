---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-references-few-shot-examples-verifier-md-44546bb8-c01"
title: "gsd-core: gsd-core/references/few-shot-examples/verifier.md module"
summary: "Carrier for 3 atomic instructions from gsd-core:gsd-core/references/few-shot-examples/verifier.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/references/few-shot-examples/verifier.md\"}"
atom_ids:
  - check-every-layer-of-a-configuration
  - separate-a-planning-gap-from-an-execution-failure
  - verify-existence-substance-and-wiring
atom_count: 3
atoms: "[{\"atom_id\":\"check-every-layer-of-a-configuration\",\"file_sha256\":\"565f2b71d26bee9c151c567f9c1919077d1c934dfd9613a38e1cb19c4b3b06b9\",\"content_sha256\":\"6e0731c7b89b0ebd209169d031451138b68b55f3cf51d9034db22e4c4c61840e\",\"file_bytes\":1470,\"body_bytes\":405},{\"atom_id\":\"separate-a-planning-gap-from-an-execution-failure\",\"file_sha256\":\"c780918df4678ecd8de5fd6f1baefce9e3946a363e837f8d63ef2f3278df0542\",\"content_sha256\":\"39c829c8d9d72f93a500d17a70bcd1728b24082b136d6797632d85abe7e4a032\",\"file_bytes\":1746,\"body_bytes\":531},{\"atom_id\":\"verify-existence-substance-and-wiring\",\"file_sha256\":\"b8a7ec6f71663c1e3d6f50bcaf1f699260c0ee9cc12c3eb9ebdc46f142cb747e\",\"content_sha256\":\"43bf0eaec20b01cbe7da1383930f4736d602e61f03a021ee9b4cd774b6589b99\",\"file_bytes\":1716,\"body_bytes\":637}]"
carrier_sha256: f6b0197eecf838c20df4e3cabf4b87fd92abf8f15319817823b0373909f3441c
carrier_bytes: 5349
revision: 1
status: active
---
<!-- vpmodule:atom:begin check-every-layer-of-a-configuration -->
---
instruction_id: check-every-layer-of-a-configuration
title: Check every layer of a configuration
summary: "A configuration is verified across schema, defaults and code, because agreement between only some of the layers hides the mismatch."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-harness
conditions_applies_when: A configuration flag or setting is verified.
conditions_does_not_apply_when: The setting has a single layer.
artifact_contract_output_type: config-layer-check
artifact_contract_required_data:
  - the layers that were checked
  - the layer that disagrees
  - the consequence
artifact_contract_verified_by: "schema, defaults and code were checked against each other"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/few-shot-examples/verifier.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Check every layer of a configuration
Gap: Defaults exist in code but schema validation doesn't know about them.
Status: FAILED -- Config flags work in code but are invisible to schema validation.
The verifier checked multiple config layers (schema vs defaults vs code) rather than just one.
Config wiring requires schema + defaults + code to agree -- checking only one layer misses layer-mismatch bugs.
<!-- vpmodule:atom:end check-every-layer-of-a-configuration -->
<!-- vpmodule:atom:begin separate-a-planning-gap-from-an-execution-failure -->
---
instruction_id: separate-a-planning-gap-from-an-execution-failure
title: Separate a planning gap from an execution failure
summary: "Code that changed after the plan was written is a planning gap, not a failed execution, and it is reported as a note."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: A required artifact is missing and the code that would provide it changed after the plan was written.
conditions_does_not_apply_when: The plan was executed as written and the result is wrong.
artifact_contract_output_type: gap-classification
artifact_contract_required_data:
  - what the plan required
  - what the code contains now
  - the classification of the gap
artifact_contract_verified_by: the verdict names the gap as a planning gap and does not fail the execution
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/few-shot-examples/verifier.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Separate a planning gap from an execution failure
Assessment: The executor correctly completed all planned tasks. The gap is a **planning ordering issue**, not an execution failure.
Status: PASS_WITH_NOTES -- Executor did what was planned. Unconsolidated regex noted as follow-up, not as a failure of this phase.
The verifier distinguished between what was planned vs what exists now. Code that changed AFTER plan creation is a planning gap, not an executor failure.
This prevents false FAIL verdicts on correctly-executed work.
<!-- vpmodule:atom:end separate-a-planning-gap-from-an-execution-failure -->
<!-- vpmodule:atom:begin verify-existence-substance-and-wiring -->
---
instruction_id: verify-existence-substance-and-wiring
title: "Verify existence, substance and wiring"
summary: "A required artifact is checked at three levels: that it exists, that it carries substance, and that it is wired into the system."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-harness
conditions_applies_when: A required artifact is verified.
conditions_does_not_apply_when: Nothing is required to exist.
artifact_contract_output_type: three-level-verification
artifact_contract_required_data:
  - the existence result
  - the substance result
  - the wiring result
  - the verdict
artifact_contract_verified_by: all three levels were checked and the verdict names the level that failed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/few-shot-examples/verifier.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Verify existence, substance and wiring
The verifier checked all three levels independently with specific evidence at each level -- file path, line count, exported symbols, import location, and argument verification.
It did not stop at "file exists" but traced wiring through to actual usage with correct arguments.
The verifier caught a common calibration pattern: code that exists, is tested, but is never actually wired into the system.
L1 and L2 pass, but L3 (wiring) fails.
Level 2 (substantive) and Level 3 (wired) were skipped entirely.
A file that exists but is never imported or contains only placeholder code should not pass.
<!-- vpmodule:atom:end verify-existence-substance-and-wiring -->