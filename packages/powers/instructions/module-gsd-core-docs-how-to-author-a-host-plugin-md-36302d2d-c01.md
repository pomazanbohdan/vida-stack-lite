---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-docs-how-to-author-a-host-plugin-md-36302d2d-c01"
title: "gsd-core: docs/how-to/author-a-host-plugin.md module"
summary: "Carrier for 2 atomic instructions from gsd-core:docs/how-to/author-a-host-plugin.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"docs/how-to/author-a-host-plugin.md\"}"
atom_ids:
  - import-only-from-the-published-entry
  - the-serialized-and-in-process-paths-must-agree
atom_count: 2
atoms: "[{\"atom_id\":\"import-only-from-the-published-entry\",\"file_sha256\":\"b66acd200076a557b6934c1fa4746cd050f78c533c238e82111b68291c09a14a\",\"content_sha256\":\"e2e83279be19651efab405337722372a2c4831e4091ea5654382e8b0dbb6dc38\",\"file_bytes\":1182,\"body_bytes\":109},{\"atom_id\":\"the-serialized-and-in-process-paths-must-agree\",\"file_sha256\":\"2af0abea8061718d573e3e8b221b0556d03a999e1d71d5d80cc85aeaa67f697d\",\"content_sha256\":\"6eb1aed6899e17809a2855e9adad8513e4cbcbd3cc6e4c5c1abfacfc3b504c6e\",\"file_bytes\":1206,\"body_bytes\":160}]"
carrier_sha256: c0cc143136eb14a82559a2b59c04a2a82b1ea553cd94861c8a945b8e784ff6d5
carrier_bytes: 2667
revision: 1
status: active
---
<!-- vpmodule:atom:begin import-only-from-the-published-entry -->
---
instruction_id: import-only-from-the-published-entry
title: Import only from the published entry
summary: "The public, versioned entry point is the contract; everything behind it is internal and may change, so it is never imported directly."
capability_tags:
  - distribute-a-package-of-skills
pattern_tags:
  - package-lifecycle
conditions_applies_when: Code outside a package imports from it.
conditions_does_not_apply_when: The code is inside the package and works on its own internals.
artifact_contract_output_type: import-surface
artifact_contract_required_data:
  - the published entry
  - the version it carries
artifact_contract_verified_by: every import goes through the published entry and no internal module is imported
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/author-a-host-plugin.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Import only from the published entry
import only from it. Everything it re-exports is public and versioned
<!-- vpmodule:atom:end import-only-from-the-published-entry -->
<!-- vpmodule:atom:begin the-serialized-and-in-process-paths-must-agree -->
---
instruction_id: the-serialized-and-in-process-paths-must-agree
title: The serialized and the in-process path must agree
summary: The out-of-process path returns the same result as the in-process one for the same inputs; that consistency is the contract.
capability_tags:
  - harden-validation
pattern_tags:
  - behavior-preserving-refactor
conditions_applies_when: The same operation can run in-process or across a process boundary.
conditions_does_not_apply_when: Only one of the two paths exists.
artifact_contract_output_type: parity-result
artifact_contract_required_data:
  - the inputs
  - the result of each path
artifact_contract_verified_by: both paths return the same result for the same inputs
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/author-a-host-plugin.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# The serialized and the in-process path must agree
The result is identical to the in-process negotiation for the same axes - that consistency is the contract.
<!-- vpmodule:atom:end the-serialized-and-in-process-paths-must-agree -->