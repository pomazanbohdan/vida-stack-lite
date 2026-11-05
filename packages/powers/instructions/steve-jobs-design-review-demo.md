---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: steve-jobs-design-review-demo
title: Require a working demo
summary: "Review working artifacts rather than specs or slides, on the target device at target data scale; prototype the riskiest moment first, run competing demos to one verdict, and show honest state without hiding known breakage."
capability_tags:
  - review-product-design
pattern_tags:
  - demo-driven-review
conditions_applies_when: Deciding from a demo.
conditions_does_not_apply_when: A documentation-only deliverable.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: A working demo on the target device exists and the riskiest moment is covered.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/steve-jobs-design-review/SKILL.md; sha256=0bbfdcaf8d00ab82877a247369ce08b3ac7c2646d08b28d76f93bbe9456fa2ad; locator=skills/steve-jobs-design-review/SKILL.md#L142-L171"
status: active
revision: 1
---

# Require a working demo

Review working artifacts, not specs or slideware: concrete demos expose truth that documents hide and force decisions by a decider reacting to the real thing. Review rules: ban slide-only reviews — require a Figma prototype or build; run reviews on the target device at target data scale because a phone UI judged on a projector lies; prototype the riskiest moment first because a demo of the easy 80% proves nothing; when competing ideas exist, run a demo derby and pick one — never ship a compromise of both; demo to the decider weekly (30 minutes replaces status docs). Review prompts: 'Don't tell me — show me. On the device.', 'Which of these two demos wins? Pick one; we're not shipping a compromise of both.', 'What's the riskiest assumption, and where's the demo that tests it?' Ethical boundary: demos must show honest state — a staged demo that hides known breakage is a lie with a UI.
