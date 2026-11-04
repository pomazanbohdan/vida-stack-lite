---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: improve-retention-diagnostics
title: Diagnose retention metrics with B=MAP
summary: "Map each retention metric to its B=MAP diagnosis and action: activation, Day-1, Day-7, Day-30, feature adoption and notification fatigue."
capability_tags:
  - design-behavior-change
pattern_tags:
  - retention-diagnostic
conditions_applies_when: Diagnosing a retention metric or drop-off.
conditions_does_not_apply_when: A metric with no behavioral interpretation.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - retention-diagnosis
  - mapped-actions
artifact_contract_verified_by: Each metric is matched to its stated diagnosis and action.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/improve-retention/SKILL.md; sha256=f25f70aed02080dc62a90ed107623bad3f32d4a79866941cf1b5f7e4a7a77051; locator=skills/improve-retention/SKILL.md#L189-L203"
status: active
revision: 1
---

# Diagnose retention metrics with B=MAP

Diagnose metrics with B=MAP: low activation means first action below line—shrink onboarding to Starter Step and fix weakest Ability link; Day-1 drop-off means failed/mistimed Prompt—redesign first-day prompts and anchor to routine; Day-7 drop-off means Motivation receded and behavior is hard—reduce core difficulty; Day-30 drop-off means habit/internal Prompt absent—create tiny recipe and celebration loops; low feature adoption means feature below line for most users—friction-audit and prompt only with Motivation; notification fatigue means prompts below line—cut volume and send only with Motivation and Ability. Read case studies to see M, A, P scored independently before own diagnosis.
