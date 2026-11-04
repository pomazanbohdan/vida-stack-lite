---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: improve-retention-quick-diagnostic
title: Run the Quick Diagnostic
summary: "Check the core action under 60 seconds, low-motivation operation, event or anchor prompts, immediate feedback, the weakest Ability Chain link and natural scaling; apply the matching action for each failed check."
capability_tags: []
pattern_tags:
  - diagnostic-questions
conditions_applies_when: A quick diagnostic review of a retention design.
conditions_does_not_apply_when: A full audit or a scored assessment.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - diagnostic-findings
  - corrective-actions
artifact_contract_verified_by: The report answers each question and names the matching corrective action for every failed check.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/improve-retention/SKILL.md; sha256=f25f70aed02080dc62a90ed107623bad3f32d4a79866941cf1b5f7e4a7a77051; locator=skills/improve-retention/SKILL.md#L215-L225"
status: active
revision: 1
---

# Run the Quick Diagnostic

Check whether a new user can do the core action in under 60 seconds; if not, friction-audit and shrink to Starter Step. Check operation at low Motivation; if not, redesign for minimal Motivation. Check Prompts are tied to real events or anchors; otherwise switch to event/anchor prompts. Check immediate feedback after key actions; if absent add success, progress, or social feedback. Find weakest Ability link; if unknown rate all six factors 1–5 for the core behavior. Check users scale naturally; if not use Starter Steps and let behavior grow organically.
