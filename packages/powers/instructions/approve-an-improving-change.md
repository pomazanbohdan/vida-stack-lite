---
instruction_id: approve-an-improving-change
title: Approve a change that improves the codebase
summary: Approve a change that improves overall code health even when it is not the way you would have written it.
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: A change is ready for a verdict and the reviewer could block it on personal preference.
conditions_does_not_apply_when: "The change contains a defect, a security hole or an unmet requirement that must be fixed first."
artifact_contract_output_type: approval-decision
artifact_contract_required_data:
  - the change
  - the effect on overall code health
  - the approval decision
artifact_contract_verified_by: "the verdict is approval or a concrete defect, never a style preference"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/code-review-and-quality/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Approve a change that improves the codebase

**The approval standard:** Approve a change when it definitely improves overall code health, even if it isn't perfect. Perfect code doesn't exist — the goal is continuous improvement. Don't block a change because it isn't exactly how you would have written it. If it improves the codebase and follows the project's conventions, approve it.
