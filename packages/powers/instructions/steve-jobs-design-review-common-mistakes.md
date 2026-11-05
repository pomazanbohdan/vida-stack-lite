---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: steve-jobs-design-review-common-mistakes
title: Avoid the common review mistakes
summary: "Avoid reviewing only aesthetics, fixing by adding, consensus verdicts, reviewing specs and slides, good-enough verdicts, skipping unseen surfaces and cosplaying cruelty; apply the stated fix for each."
capability_tags: []
pattern_tags:
  - mistake-list
conditions_applies_when: Checking a review for the listed anti-patterns.
conditions_does_not_apply_when: A finding already covered by another instruction.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: Each observed mistake is named and paired with its stated fix.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/steve-jobs-design-review/SKILL.md; sha256=0bbfdcaf8d00ab82877a247369ce08b3ac7c2646d08b28d76f93bbe9456fa2ad; locator=skills/steve-jobs-design-review/SKILL.md#L227-L238"
status: active
revision: 1
---

# Avoid the common review mistakes

Avoid these seven review failure modes. (1) Reviewing only aesthetics fails because design is how it works and pretty-but-clunky products still fail users; walk flows, latency, and failure states. (2) Fixing problems by adding fails because each addition taxes attention and breeds complexity; subtract first and require additions to kill something. (3) Consensus verdicts fail because committees average ideas into mush; use one decider with wide input and a narrow decision. (4) Reviewing specs and slides fails because abstractions hide dealbreakers and let everyone imagine a different product; demand working demos on the real device. (5) 'Good enough' verdicts fail because mediocrity compounds into brand damage; use the binary insanely-great-or-not-done verdict. (6) Skipping unseen surfaces fails because users sense plywood and teams learn to cut corners; audit empty, error, settings, and email states. (7) Cosplaying cruelty fails because fear stops demos and candor and kills the feedback loop; be brutal about the work and decent to people.
