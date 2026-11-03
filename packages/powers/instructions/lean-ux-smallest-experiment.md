---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: lean-ux-smallest-experiment
title: Use the lowest sufficient fidelity
summary: "Choose the smallest artifact that tests with real users, define hypothesis, audience, signal and time box, and disclose fake doors or smoke tests."
capability_tags:
  - design-experiments
pattern_tags:
  - experiment-design
conditions_applies_when: Designing a user experiment.
conditions_does_not_apply_when: A production release that must meet full quality constraints.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - hypothesis
  - audience
  - signal
  - timebox
artifact_contract_verified_by: The experiment uses the smallest sufficient artifact and discloses any deceptive test.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/lean-ux/SKILL.md; sha256=4fe0a10132650ad36bc79676b12c8f58b19035a40ac6587c864387d0f808cf04; locator=skills/lean-ux/SKILL.md#L80-L104"
status: active
revision: 1
---

# Use the lowest sufficient fidelity

Use the lowest-fidelity/smallest artifact that tests with real users; define hypothesis, audience, signal, time box; validate proto-personas later. Disclose fake doors/smoke tests and offer opt-out.
