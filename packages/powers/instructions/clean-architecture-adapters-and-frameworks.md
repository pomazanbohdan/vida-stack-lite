---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: clean-architecture-adapters-and-frameworks
title: Keep adapters and frameworks at the edge
summary: "Translate between use-case forms and external forms; controllers, presenters and gateways keep frameworks replaceable."
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: "Integrating HTTP, persistence or another external mechanism."
conditions_does_not_apply_when: A pure library with no external boundary.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "Business rules do not import the framework, and adapters translate at the boundary."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/clean-architecture/SKILL.md; sha256=fc9fe201ae040df80164bc7a407507882783e2c8cdbc0379a1fbdcf3719e4446; locator=skills/clean-architecture/SKILL.md#L69-L91"
status: active
revision: 1
---

# Keep adapters and frameworks at the edge

Interface Adapters convert data between forms convenient for Use Cases or Entities and forms required by external agencies. Keep Frameworks and Drivers in the outermost layer as glue. Controllers translate HTTP into Use Case input; Presenters translate Use Case output into view models; Gateways implement repository interfaces defined by Use Cases. Business rules must not depend on whether data is stored in SQL, NoSQL, or flat files, or on HTTP delivery. Keep frameworks at arm's length: the framework calls inward, and inner controllers or business code do not import it.
