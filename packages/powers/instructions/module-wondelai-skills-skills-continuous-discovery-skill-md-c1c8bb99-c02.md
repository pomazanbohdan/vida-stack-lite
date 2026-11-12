---
schema: VPInstructionModule/v1
instruction_id: "module-wondelai-skills-skills-continuous-discovery-skill-md-c1c8bb99-c02"
title: "wondelai-skills: skills/continuous-discovery/SKILL.md module"
summary: "Carrier for 2 atomic instructions from wondelai-skills:skills/continuous-discovery/SKILL.md."
source: "{\"donor\":\"wondelai-skills\",\"path\":\"skills/continuous-discovery/SKILL.md\"}"
atom_ids:
  - continuous-discovery-test-assumptions
  - continuous-discovery-weekly-cadence
atom_count: 2
atoms: "[{\"atom_id\":\"continuous-discovery-test-assumptions\",\"file_sha256\":\"689d6b8fa238ffe37b25ca473a0309d9dc5e01935830502867bb070669275f41\",\"content_sha256\":\"1df08f04b19b242f67592e03cb6eef50eb0be553db3dcf3901265d1896a96342\",\"file_bytes\":1366,\"body_bytes\":195},{\"atom_id\":\"continuous-discovery-weekly-cadence\",\"file_sha256\":\"bd2c07c1e6c7ebecd696b6533bcbc680404f859a0a35b02377db282644f5b275\",\"content_sha256\":\"b6e62ce3ec47719d2b55d8931b55ccc55926b4d57da5e130e1832b6518bf6657\",\"file_bytes\":1599,\"body_bytes\":452}]"
carrier_sha256: fbcc3815bcbc4165ab66b9577d929e267870f8a1ccbdacaf408892e39ec5f21c
carrier_bytes: 3224
revision: 1
status: active
---
<!-- vpmodule:atom:begin continuous-discovery-test-assumptions -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: continuous-discovery-test-assumptions
title: Test the riskiest assumptions first
summary: "Identify what a solution depends on, map assumptions by importance and evidence, and test the riskiest ones before building."
capability_tags:
  - design-experiments
pattern_tags:
  - experiment-design
conditions_applies_when: "A solution depends on untested customer, business or technical assumptions."
conditions_does_not_apply_when: An assumption already supported by direct evidence.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - assumptions
  - tests
artifact_contract_verified_by: The riskiest assumptions are tested before the solution is built.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/continuous-discovery/SKILL.md; sha256=44260b572a050417ba3733021eaa1694318fda80794c3e07800c66b4bc4a0c9e; locator=skills/continuous-discovery/SKILL.md#L97-L121"
status: active
revision: 1
---

# Test the riskiest assumptions first

Before building, identify the assumptions a solution depends on, map them by importance and evidence, then run small fast tests on the riskiest ones first.
<!-- vpmodule:atom:end continuous-discovery-test-assumptions -->
<!-- vpmodule:atom:begin continuous-discovery-weekly-cadence -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: continuous-discovery-weekly-cadence
title: Run discovery as a weekly habit
summary: Talk to customers every week with the product trio and treat discovery as continuous rather than a phase.
capability_tags:
  - research-primary-sources
pattern_tags:
  - decision-scoped-research
conditions_applies_when: Building or reviewing a product discovery practice.
conditions_does_not_apply_when: A one-off research request with no ongoing product decisions.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The team has at least one customer touchpoint per week involving product, design and engineering."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/continuous-discovery/SKILL.md; sha256=44260b572a050417ba3733021eaa1694318fda80794c3e07800c66b4bc4a0c9e; locator=skills/continuous-discovery/SKILL.md#L14-L17"
status: active
revision: 1
---

# Run discovery as a weekly habit

Good product discovery requires a continuous cadence, not a one-time event. Teams that talk to customers every week, map opportunities visually, and test assumptions before building consistently outperform teams that rely on intuition, stakeholder opinions, or quarterly research cycles. The benchmark: at least one customer touchpoint per week, every week, by the product trio (product manager, designer, engineer).
<!-- vpmodule:atom:end continuous-discovery-weekly-cadence -->