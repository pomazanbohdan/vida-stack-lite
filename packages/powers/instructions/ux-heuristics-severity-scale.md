---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: ux-heuristics-severity-scale
title: Rate issues on the severity scale
summary: "Use 0 to 4 from cosmetic to catastrophic, weighing frequency, impact and persistence."
capability_tags:
  - audit-accessibility
pattern_tags:
  - impact-based-severity
conditions_applies_when: Triaging usability findings.
conditions_does_not_apply_when: A finding with no user impact.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "Each finding has a severity from 0 to 4 justified by frequency, impact and persistence."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/ux-heuristics/SKILL.md; sha256=cb1ea3de8b6e605614cc59b21d41830d2d82af22e51069bb4c5bb53790cd622b; locator=skills/ux-heuristics/SKILL.md#L151-L166"
status: active
revision: 1
---

# Rate issues on the severity scale

Rate issues 0 (not a problem: ignore), 1 (cosmetic: fix if time), 2 (minor: schedule), 3 (major: fix soon), 4 (catastrophic: fix immediately); weigh frequency, impact, persistence.
