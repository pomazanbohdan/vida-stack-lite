---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: ux-heuristics-score
title: Score the interface against the heuristics
summary: "Start at 10, subtract for failed rows weighted by the worst severity, and report the score, highest-severity issues and fixes."
capability_tags:
  - stress-test-a-product-concept
pattern_tags:
  - quality-bar-contract
conditions_applies_when: Assessing a user interface against the heuristic set.
conditions_does_not_apply_when: A narrow visual review that does not assess usability.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - score
  - highest_severity_issues
  - fixes
artifact_contract_verified_by: "The report states the score, the highest-severity issues and fixes."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/ux-heuristics/SKILL.md; sha256=cb1ea3de8b6e605614cc59b21d41830d2d82af22e51069bb4c5bb53790cd622b; locator=skills/ux-heuristics/SKILL.md#L18-L21"
status: active
revision: 1
---

# Score the interface against the heuristics

Rate every issue on the severity scale, start at 10, and subtract per failed diagnostic row weighted by worst severity (about 2 for catastrophic/major, 1 for minor/cosmetic). Bands: 9-10 has no severity-3+ issue and at most one failed row; 6-8 has major issues or several failures; 3-5 has a catastrophic issue or many failures; <=2 means core tasks are blocked. Report score, highest-severity issues, and fixes.
