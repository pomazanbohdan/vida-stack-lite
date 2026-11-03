---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: clean-architecture-component-principles
title: Apply component cohesion and coupling principles
summary: "Use REP, CCP, CRP, ADP, SDP and SAP to shape a stable acyclic component graph."
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: Grouping classes into deployable components.
conditions_does_not_apply_when: A single-component application with no component graph.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The component graph is acyclic, depends toward stability, and stable components are abstract."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/clean-architecture/SKILL.md; sha256=fc9fe201ae040df80164bc7a407507882783e2c8cdbc0379a1fbdcf3719e4446; locator=skills/clean-architecture/SKILL.md#L92-L115"
status: active
revision: 1
---

# Apply component cohesion and coupling principles

Treat components as units of deployment. REP: classes in a component are versionable and releasable together; CCP: classes changing for the same reason belong together; CRP: users need not depend on unused classes. Keep the component graph acyclic (ADP), depend toward stability (SDP), and make stable components abstract and unstable ones concrete (SAP). Group classes that change together; break cycles with dependency inversion or a new abstraction component. Instability is I = Ce / (Ca + Ce); many incoming and no outgoing dependencies give I near zero (stable).
