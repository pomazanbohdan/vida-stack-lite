---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-docs-how-to-resolve-a-raw-terminator-finding-md-d306ad3d-c01"
title: "gsd-core: docs/how-to/resolve-a-raw-terminator-finding.md module"
summary: "Carrier for 2 atomic instructions from gsd-core:docs/how-to/resolve-a-raw-terminator-finding.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"docs/how-to/resolve-a-raw-terminator-finding.md\"}"
atom_ids:
  - choose-the-replacement-by-what-the-code-needs
  - treat-a-lint-evasion-as-a-review-finding
atom_count: 2
atoms: "[{\"atom_id\":\"choose-the-replacement-by-what-the-code-needs\",\"file_sha256\":\"54284f8e94f9b74f1485321e0e009f293d7b9239100ec663e97e18f20462bb9c\",\"content_sha256\":\"4f0cbe0833e16a3f0445399985ea7d59b582e373b267349f75512227084fd1b9\",\"file_bytes\":1440,\"body_bytes\":366},{\"atom_id\":\"treat-a-lint-evasion-as-a-review-finding\",\"file_sha256\":\"8549329281bd992b8465d00e4406b912e3cf60fdaacee782c8d55ba2120b2b96\",\"content_sha256\":\"0cf1fecbad888633f8e433791a799e39adef7ae8d683fbe81fdf22b7e2889f20\",\"file_bytes\":1520,\"body_bytes\":441}]"
carrier_sha256: 57a9493869c6698fca389c6304e06456066e88eb83de0d36a7f709bcab5a1e0f
carrier_bytes: 3245
revision: 1
status: active
---
<!-- vpmodule:atom:begin choose-the-replacement-by-what-the-code-needs -->
---
instruction_id: choose-the-replacement-by-what-the-code-needs
title: Choose the replacement by what the code needs
summary: "The replacement is picked by asking what the surrounding code actually needs, not by pattern-matching on the file."
capability_tags:
  - minimize-code-surface
pattern_tags:
  - code-minimization
conditions_applies_when: A banned call has to be replaced.
conditions_does_not_apply_when: The call site is not yours to change.
artifact_contract_output_type: replacement-choice
artifact_contract_required_data:
  - what the surrounding code needs
  - the replacement that was chosen
artifact_contract_verified_by: the replacement follows from what the code needs and not from the file it sits in
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/resolve-a-raw-terminator-finding.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Choose the replacement by what the code needs
Three outcomes exist. Pick by asking what the surrounding code actually needs, not by pattern-
matching on which file you happen to be in.
If the process should simply drain and exit non-zero once its event loop empties — no forced unwind, no immediate write-then-die — set `process.exitCode` and return normally:
<!-- vpmodule:atom:end choose-the-replacement-by-what-the-code-needs -->
<!-- vpmodule:atom:begin treat-a-lint-evasion-as-a-review-finding -->
---
instruction_id: treat-a-lint-evasion-as-a-review-finding
title: Treat a lint evasion as a review finding
summary: "Writing the code in a shape the rule cannot see is a finding, not a fix, and an exemption is not added to silence it."
capability_tags:
  - review-code
pattern_tags:
  - automated-enforcement
conditions_applies_when: A lint rule does not fire on a call it should have caught.
conditions_does_not_apply_when: The rule fires and is being satisfied.
artifact_contract_output_type: evasion-finding
artifact_contract_required_data:
  - the shape the rule cannot see
  - the underlying call that must be fixed
artifact_contract_verified_by: the underlying call is fixed and no exemption was added for the evasion
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/resolve-a-raw-terminator-finding.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Treat a lint evasion as a review finding
These are documented gaps, not sanctioned escape hatches. Writing code in one of these shapes to route around the rule reopens exactly the defect class the rule exists to close, and is a review finding — fix the underlying call the same way any other raw terminator would be fixed, do not rely on the lint being unable to see it.
Do not add a third entry to make an inconvenient finding go away.
<!-- vpmodule:atom:end treat-a-lint-evasion-as-a-review-finding -->