---
schema: VPInstructionModule/v1
instruction_id: "module-wondelai-skills-skills-lean-ux-skill-md-37aff504-c02"
title: "wondelai-skills: skills/lean-ux/SKILL.md module"
summary: "Carrier for 2 atomic instructions from wondelai-skills:skills/lean-ux/SKILL.md."
source: "{\"donor\":\"wondelai-skills\",\"path\":\"skills/lean-ux/SKILL.md\"}"
atom_ids:
  - lean-ux-score
  - lean-ux-smallest-experiment
atom_count: 2
atoms: "[{\"atom_id\":\"lean-ux-score\",\"file_sha256\":\"49502df7fc5da07a7a3f4290667693a4bdcf0b50be3475f956c15007e8c17f0e\",\"content_sha256\":\"56e769917b2349b2e9c4815249b75d604d62480b06df4b25717532664872465d\",\"file_bytes\":1503,\"body_bytes\":473},{\"atom_id\":\"lean-ux-smallest-experiment\",\"file_sha256\":\"9d4677f2e2a16c6c8f59c6c1a7e8c42589afe9c740304262aaa29df734854d86\",\"content_sha256\":\"af52199786c783ae709323dd9abad4b4845fca00350866aca9dbe8c052ce6745\",\"file_bytes\":1400,\"body_bytes\":237}]"
carrier_sha256: 4f3f50cbbe5a9a3f0e506c75fdcb0f98cbeb62c03a23f377cdd602d462cff750
carrier_bytes: 3098
revision: 1
status: active
---
<!-- vpmodule:atom:begin lean-ux-score -->
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
<!-- vpmodule:atom:end lean-ux-score -->
<!-- vpmodule:atom:begin lean-ux-smallest-experiment -->
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
<!-- vpmodule:atom:end lean-ux-smallest-experiment -->