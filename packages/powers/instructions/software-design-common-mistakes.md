---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: software-design-common-mistakes
title: Avoid common software-design mistakes
summary: "Avoid shallow classes, temporal decomposition, exposed implementation details, missing design comments, excessive configuration, tactical shortcuts, pass-through methods and over-specialized interfaces."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: Reviewing a design for the listed mistakes.
conditions_does_not_apply_when: A narrower instruction already covers the finding.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The review names the mistake and the design correction.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/software-design-philosophy/SKILL.md; sha256=d5971fdfc51e6a6f729856a9c3874d56628bb6802fdd31eb1c97adbfa4b51a73; locator=skills/software-design-philosophy/SKILL.md#L165-L177"
status: active
revision: 1
---

# Avoid common software-design mistakes

Avoid shallow classes, temporal decomposition, exposed implementation details, missing design comments, excessive configuration, tactical shortcuts, pass-through methods and over-specialized interfaces; apply the listed design corrections.
