---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: lean-ux-score
title: Score the Lean UX practice
summary: "Score the eight diagnostic rows, report the score, failed rows and fixes."
capability_tags:
  - stress-test-a-product-concept
pattern_tags:
  - quality-bar-contract
conditions_applies_when: Assessing a Lean UX practice.
conditions_does_not_apply_when: A narrow visual review that does not assess the practice.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - score
  - failed_rows
  - fixes
artifact_contract_verified_by: "The report states the score, failed rows and fixes."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/lean-ux/SKILL.md; sha256=4fe0a10132650ad36bc79676b12c8f58b19035a40ac6587c864387d0f808cf04; locator=skills/lean-ux/SKILL.md#L20-L29"
status: active
revision: 1
---

# Score the Lean UX practice

Score the eight diagnostic rows at about 1.25 points each. Bands: 9-10 means declared assumptions, precommitted hypothesis criteria, low-fidelity experiments, whole-team design, weekly research, outcome measures, dual-track Agile, and a recent invalidation; 5-6 means vague criteria/overinvestment and some silos; <=3 means heavy deliverables, untested assumptions, output-counting, and no experiment log. State score, failed rows, and fixes.
