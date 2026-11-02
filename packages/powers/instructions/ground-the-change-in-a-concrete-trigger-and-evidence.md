---
instruction_id: ground-the-change-in-a-concrete-trigger-and-evidence
title: Ground the change in a concrete trigger and evidence
summary: "Name what changed, its source and evidence, and say whether what is required changed or only how it is delivered; ask only what the tree cannot tell you."
capability_tags:
  - assess-change-impact
pattern_tags:
  - concrete-trigger
conditions_applies_when: A change is requested and the reason for it still has to be established.
conditions_does_not_apply_when: The reason for the change is already written down and agreed.
artifact_contract_output_type: trigger-and-evidence
artifact_contract_required_data:
  - the triggering item
  - the problem category
  - the problem statement
  - the evidence
artifact_contract_verified_by: the evidence is on file and the problem is stated before the impact is assessed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/references/replan.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - product
  - business
---

# Ground the change in a concrete trigger and evidence
Name the change briefly: what changed, its source, and the evidence.
Say whether what is required changed or only how it is delivered.
Read the ticket, its `.memlog.md`, its breakdown, finished children, and any architecture or design it touches; ask only what the tree cannot tell you.
Collect concrete examples, errors, stakeholder feedback, or technical constraints. Do not propose a fix before the change is grounded.
