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
