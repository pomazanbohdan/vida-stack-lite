---
schema: VPInstructionModule/v1
instruction_id: "module-wondelai-skills-skills-pragmatic-programmer-skill-md-78e7ecf9-c02"
title: "wondelai-skills: skills/pragmatic-programmer/SKILL.md module"
summary: "Carrier for 3 atomic instructions from wondelai-skills:skills/pragmatic-programmer/SKILL.md."
source: "{\"donor\":\"wondelai-skills\",\"path\":\"skills/pragmatic-programmer/SKILL.md\"}"
atom_ids:
  - pragmatic-programmer-reversibility
  - pragmatic-programmer-score
  - pragmatic-programmer-tracer-bullets
atom_count: 3
atoms: "[{\"atom_id\":\"pragmatic-programmer-reversibility\",\"file_sha256\":\"28d22a7204d0c795f0d33d46ddbe1ab13d4df582d8be761a32257878617fd47a\",\"content_sha256\":\"d424da10b1419b6b6c386f5a2d02f26053c8d49e67ddd24a40a9052eec478a05\",\"file_bytes\":1318,\"body_bytes\":212},{\"atom_id\":\"pragmatic-programmer-score\",\"file_sha256\":\"2d1a98e2c5e30374ee3d93c1afb41fe3666f891c0e3d7e63d497efbdc97254bb\",\"content_sha256\":\"922f24a4064de9de10a645e35354f14cbe45c0fa3758e4ac4a63aaef257cab7c\",\"file_bytes\":1300,\"body_bytes\":205},{\"atom_id\":\"pragmatic-programmer-tracer-bullets\",\"file_sha256\":\"088c8b4c73e344a71316f14d90cb5f17ed5ef90a540af652418b27a8386ad65e\",\"content_sha256\":\"8677dd67df723a61d3ce90e327006f00b945c74b2b35c3d02b4a83e4edd5f852\",\"file_bytes\":1412,\"body_bytes\":281}]"
carrier_sha256: 04d736609e8d05fe1dd40e15e0eaeee253d7a733db4696fc4019488721a4258b
carrier_bytes: 4393
revision: 1
status: active
---
<!-- vpmodule:atom:begin pragmatic-programmer-reversibility -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: pragmatic-programmer-reversibility
title: Prefer reversible decisions
summary: Isolate volatile choices behind interfaces or configuration and avoid premature commitments.
capability_tags:
  - design-structure
pattern_tags:
  - revertable-increments
conditions_applies_when: "Choosing vendors, databases, architectures or other costly-to-change options."
conditions_does_not_apply_when: A decision fixed by contract or an external constraint.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The choice can be reversed at a cost proportional to its scope.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/pragmatic-programmer/SKILL.md; sha256=7bd0a042aa2dd559f0327916f8d4f2dcf7d21e5f2343a193eaafee932f0f85a3; locator=skills/pragmatic-programmer/SKILL.md#L147-L169"
status: active
revision: 1
---

# Prefer reversible decisions

Prefer decisions that can be reversed when uncertainty remains; isolate volatile choices behind interfaces or configuration and avoid premature commitments that make change costly.
<!-- vpmodule:atom:end pragmatic-programmer-reversibility -->
<!-- vpmodule:atom:begin pragmatic-programmer-score -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: pragmatic-programmer-score
title: Score against the pragmatic diagnostic
summary: "Score the seven diagnostic rows, state the score and failing rows, and give fixes."
capability_tags:
  - review-code
pattern_tags:
  - quality-bar-contract
conditions_applies_when: Assessing a codebase or change against the pragmatic principles.
conditions_does_not_apply_when: No score or improvement report is requested.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - score
  - improvements
artifact_contract_verified_by: "The report states the score, failing rows and concrete fixes."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/pragmatic-programmer/SKILL.md; sha256=7bd0a042aa2dd559f0327916f8d4f2dcf7d21e5f2343a193eaafee932f0f85a3; locator=skills/pragmatic-programmer/SKILL.md#L18-L26"
status: active
revision: 1
---

# Score against the pragmatic diagnostic

Score against the seven diagnostic rows, state the score and failing rows, and give fixes from the action column; use the stated bands to characterize the result.
<!-- vpmodule:atom:end pragmatic-programmer-score -->
<!-- vpmodule:atom:begin pragmatic-programmer-tracer-bullets -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: pragmatic-programmer-tracer-bullets
title: Use tracer bullets and throwaway prototypes
summary: "Build an end-to-end working slice; use prototypes to answer questions, then discard them."
capability_tags:
  - plan-implementation
pattern_tags:
  - vertical-slicing
conditions_applies_when: Starting a feature or architecture whose integration is unproven.
conditions_does_not_apply_when: A proven path where a full end-to-end slice already exists.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The slice exercises the real integration and prototypes do not become production code.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/pragmatic-programmer/SKILL.md; sha256=7bd0a042aa2dd559f0327916f8d4f2dcf7d21e5f2343a193eaafee932f0f85a3; locator=skills/pragmatic-programmer/SKILL.md#L77-L99"
status: active
revision: 1
---

# Use tracer bullets and throwaway prototypes

Use tracer bullets to build an end-to-end working slice that tests whether architecture, tools and integration fit together; use prototypes to answer specific questions, then discard them rather than treating them as production code.
<!-- vpmodule:atom:end pragmatic-programmer-tracer-bullets -->