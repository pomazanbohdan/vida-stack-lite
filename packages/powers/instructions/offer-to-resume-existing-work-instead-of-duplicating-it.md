---
instruction_id: offer-to-resume-existing-work-instead-of-duplicating-it
title: Offer to resume existing work instead of duplicating it
summary: "When a run for this topic already exists, the existing one is offered for resumption or extension rather than started again."
capability_tags:
  - execute-plan
pattern_tags:
  - plan-execution
conditions_applies_when: A folder for this topic already exists.
conditions_does_not_apply_when: No prior run for this topic exists.
artifact_contract_output_type: resume-offer
artifact_contract_required_data:
  - the existing folder
  - the offer to resume or extend it
artifact_contract_verified_by: the existing run was offered instead of a duplicate being started
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-deep-recon/SKILL.md
status: active
revision: 1
---

# Offer to resume existing work instead of duplicating it
If a run folder for this topic already exists under `{workflow.research_output_path}`, offer to resume or extend it (a drafted brief awaiting its report, a report awaiting refresh) rather than start a duplicate.
