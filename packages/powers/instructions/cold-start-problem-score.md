---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: cold-start-problem-score
title: Score the networked-product plan
summary: "Score launch plans and growth strategies 0-10 against the framework, report the score and state the changes needed to reach 10."
capability_tags: []
pattern_tags:
  - scoring-rubric
conditions_applies_when: Assessing a networked-product launch or growth plan.
conditions_does_not_apply_when: A code review that does not assess the network.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - quality-score
  - failed-rows
artifact_contract_verified_by: "The report states the score, the failing rows and the changes needed."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/cold-start-problem/SKILL.md; sha256=6ee3a73a0ab3c0e0c70c75c1c36222cbca418e3c4fbfec75130f99079683af29; locator=skills/cold-start-problem/SKILL.md#L18-L27"
status: active
revision: 1
---

# Score the networked-product plan

Score networked-product launch plans and growth strategies from 0 to 10 against the framework, report the current score, and state specific changes needed to reach 10. Bands: 9–10 requires a named atomic network, instrumented magic moment, hard side solved first, repeatable tipping playbook, density/liquidity metrics, and explicit ceiling and moat plan; 7–8 has a clear atomic network and hard-side focus but ad hoc tipping or metrics favoring totals over density; 5–6 acknowledges network effects but targets a broad market and treats both sides equally; 3–4 is generic acquisition with only 'add invites and hope'; 0–2 is big-bang launch with vanity signups, no hard-side strategy, and no liquidity measures.
