---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: predictable-revenue-diagnostic
title: Run the predictable-revenue diagnostic
summary: "Check role separation, a defined outbound process, three-month pipeline predictability, lead-type mix and a standardized handoff, and apply the matching action for each failure."
capability_tags:
  - verify-work-results
pattern_tags:
  - diagnostic-questions
conditions_applies_when: A quick diagnostic review of a B2B sales process.
conditions_does_not_apply_when: A full audit or a scored assessment.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - diagnostic-findings
  - corrective-actions
artifact_contract_verified_by: The report answers each diagnostic question and names the matching corrective action for every failed check.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/predictable-revenue/SKILL.md; sha256=1a80df1eba0b27b9be1f398083ada69fddc445a6e189a68174edd294da2fcc3d; locator=skills/predictable-revenue/SKILL.md#L187-L198"
status: active
revision: 1
---

# Run the predictable-revenue diagnostic

Audit a B2B sales process with the five questions: whether prospecting and closing are separated, whether outbound has a defined process, whether pipeline can be predicted three months ahead, whether lead-type mix is known, and whether SDR-to-AE handoff is standardized. For each 'No', use the paired action: create a dedicated SDR role, implement Cold Calling 2.0, build a pipeline math model, balance seeds/nets/spears, or create a handoff checklist, respectively.
