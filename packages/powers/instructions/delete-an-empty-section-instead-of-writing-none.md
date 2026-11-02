---
instruction_id: delete-an-empty-section-instead-of-writing-none
title: Delete an empty section instead of writing N/A
summary: A section with nothing to say is removed; the plan never carries a placeholder that says there is nothing.
capability_tags:
  - plan-implementation
pattern_tags:
  - implementation-planning
  - empty-result-policy
  - empty-result-posture-policy
conditions_applies_when: A section of the plan has no content to put in it.
conditions_does_not_apply_when: Every section has real content.
artifact_contract_output_type: plan-sections
artifact_contract_required_data:
  - the sections kept
  - the sections removed
artifact_contract_verified_by: no section states that it is empty
compatibility_excludes:
  - never-hide-a-gap-in-the-evidence
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build-auto/plan-template.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/progress.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/verifier-evidence-gate.md
status: active
revision: 4
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Delete an empty section instead of writing N/A
If no meaningful I/O scenarios exist, delete this section. Do not write "N/A" or "None".
If the approach is straightforward, delete this section. Do not write "N/A" or "None".
If no build, test, or lint commands apply, delete this section. Do not write "N/A" or "None".
(Only show this section if count > 0)
so an auditable deferral history remains visible
