---
schema: VPInstructionModule/v1
instruction_id: "module-wondelai-skills-skills-37signals-way-skill-md-1244a5e0-c01"
title: "wondelai-skills: skills/37signals-way/SKILL.md module"
summary: "Carrier for 8 atomic instructions from wondelai-skills:skills/37signals-way/SKILL.md."
source: "{\"donor\":\"wondelai-skills\",\"path\":\"skills/37signals-way/SKILL.md\"}"
atom_ids:
  - 37signals-way-apply
  - 37signals-way-betting-cycles
  - 37signals-way-build-less
  - 37signals-way-common-mistakes
  - 37signals-way-deliberate-omission
  - 37signals-way-diagnostic
  - 37signals-way-opinionated-defaults
  - 37signals-way-score
atom_count: 8
atoms: "[{\"atom_id\":\"37signals-way-apply\",\"file_sha256\":\"a15e036bce96b29b0a922c67cea554975f56667e38ae9b35e116814671af31c6\",\"content_sha256\":\"7690d506eed7787775bd403cefd844d630d0fe6bcd03f5b865e8eb1d5a9ceeeb\",\"file_bytes\":1469,\"body_bytes\":266},{\"atom_id\":\"37signals-way-betting-cycles\",\"file_sha256\":\"8ef42e6ce9231f3d905227726f4b48bfe64688a0db8e2ecc64bd058ecb20ecc2\",\"content_sha256\":\"e160ef54b87d653da5584a891dd58a407a67931d70a27110ce4432f95e7eb754\",\"file_bytes\":1831,\"body_bytes\":641},{\"atom_id\":\"37signals-way-build-less\",\"file_sha256\":\"09bb9e9efa7f760fa8d240a8d38cfcd5cf7d33191f3bfd8e8592c4cbbd570151\",\"content_sha256\":\"f3f04e0427ab1c1fdb20d207e7efa453b021ea6998e58994fdc7366b780630b4\",\"file_bytes\":1507,\"body_bytes\":311},{\"atom_id\":\"37signals-way-common-mistakes\",\"file_sha256\":\"c6dc69896309f13d50f01b83e10caca544571b40346d4767c31ff6fa841eade6\",\"content_sha256\":\"ebf76879313d49e7df3bd26fb293b6a21abd822f818e01c58241ef7551ba837d\",\"file_bytes\":1852,\"body_bytes\":670},{\"atom_id\":\"37signals-way-deliberate-omission\",\"file_sha256\":\"13f66d124e2e519e1e4c6ef7c7788b7f4f52e012c945361e079e222cd663aec6\",\"content_sha256\":\"eeff00cd5dabf1c5ed29ae6242f9372c74c8b0a91e2dac65b2bbba6b60b2f0b8\",\"file_bytes\":1881,\"body_bytes\":681},{\"atom_id\":\"37signals-way-diagnostic\",\"file_sha256\":\"70ed398adbc997581bcb5dba8448c466c3bb507be167b65f415a74893dc8bd4f\",\"content_sha256\":\"5bef6c4bb44d60e88f6cfffb22bc4d1180a1e5eb0f681eec01c28728b9ac92af\",\"file_bytes\":1972,\"body_bytes\":756},{\"atom_id\":\"37signals-way-opinionated-defaults\",\"file_sha256\":\"b5c411df424e126aca8bef854caa973d5558e7a1baf68eb3c2784db98e4937c9\",\"content_sha256\":\"e0876df14f6d71b2fe1a99a44a96ee6c6e91b84b23cdbbb684b809b59eb2b155\",\"file_bytes\":1872,\"body_bytes\":642},{\"atom_id\":\"37signals-way-score\",\"file_sha256\":\"3f2ad62ea8548e249bcccdefadaff585adb3c1c4bf6290c47e0592c05e58ed81\",\"content_sha256\":\"4f8b94ea5a24ec925f64d8abad7b1d93bd6db628424ed204bb90873801520f59\",\"file_bytes\":1908,\"body_bytes\":698}]"
carrier_sha256: 45a27d6bd10f9db8a39d127c907d07d28da8ca62df75fda28831314e49b73d4d
carrier_bytes: 15175
revision: 1
status: active
---
<!-- vpmodule:atom:begin 37signals-way-apply -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: 37signals-way-apply
title: Apply the 37signals product development framework
summary: "Shape work, bet shaped pitches into six-week cycles, run small autonomous teams and ship predictably to build profitable software without bloat, bureaucracy or burnout."
capability_tags:
  - bound-product-pitch
pattern_tags:
  - fixed-time-variable-scope
conditions_applies_when: Planning or reviewing how a product team chooses and delivers work.
conditions_does_not_apply_when: A one-off task with no product cycle or team ownership.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The plan names the shaping, betting, team and shipping practices it uses and the cycle length."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/37signals-way/SKILL.md; sha256=b6882f6f197ed4eee0bfe71518f7aa16a2bf30a3bf6446b7738e6f04d39b08b4; locator=skills/37signals-way/SKILL.md#L10-L13"
status: active
revision: 1
---

# Apply the 37signals product development framework

Use this framework to shape work, bet shaped pitches into six-week cycles, run small autonomous teams, and ship predictably; its principles aim to build profitable software without bloat, bureaucracy, or burnout.
<!-- vpmodule:atom:end 37signals-way-apply -->
<!-- vpmodule:atom:begin 37signals-way-betting-cycles -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: 37signals-way-betting-cycles
title: Bet shaped pitches into fixed cycles
summary: "Replace backlogs and roadmaps with a betting table, six-week cycles and two-week cool-downs; unfinished work stops at the circuit breaker, and scope is cut rather than time extended."
capability_tags:
  - bound-product-pitch
pattern_tags:
  - fixed-time-variable-scope
conditions_applies_when: Choosing what a product team works on next.
conditions_does_not_apply_when: An incident or committed regulatory deadline.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The cycle states its fixed length and cool-down, the bets selected, and what happens to unfinished work."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/37signals-way/SKILL.md; sha256=b6882f6f197ed4eee0bfe71518f7aa16a2bf30a3bf6446b7738e6f04d39b08b4; locator=skills/37signals-way/SKILL.md#L76-L100"
status: active
revision: 1
---

# Bet shaped pitches into fixed cycles

Replace backlogs and roadmaps with a betting table where senior stakeholders bet shaped pitches into six-week cycles, with two-week cool-downs between cycles. Unfinished work hits a circuit breaker and does not automatically continue; if it still matters, reshape and re-bet it. Abolish the backlog, plan one cycle at a time, and cut non-essential scope to meet the fixed deadline rather than extending time. Most pitches should not be selected. Apply the circuit breaker honestly to kill zombie work, not politically inconvenient projects, and do not use the method to create unsustainable pressure.
<!-- vpmodule:atom:end 37signals-way-betting-cycles -->
<!-- vpmodule:atom:begin 37signals-way-build-less -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: 37signals-way-build-less
title: Build fewer things exceptionally well
summary: "Prefer simplicity, say no by default, fix time and flex scope, and use constraints such as six weeks, three people and a shaped pitch to find the essential product."
capability_tags:
  - bound-product-pitch
pattern_tags:
  - fixed-time-variable-scope
conditions_applies_when: Deciding product scope or responding to a feature request.
conditions_does_not_apply_when: A mandatory compliance feature that cannot be declined.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The scope states what was declined, which constraint bounded it, and that time is fixed while scope flexes."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/37signals-way/SKILL.md; sha256=b6882f6f197ed4eee0bfe71518f7aa16a2bf30a3bf6446b7738e6f04d39b08b4; locator=skills/37signals-way/SKILL.md#L14-L17"
status: active
revision: 1
---

# Build fewer things exceptionally well

Build fewer things exceptionally well: prefer simplicity, say no by default, fix time and flex scope, and use constraints such as six weeks, three people, and a shaped pitch to find the essential product. Build a deliberately partial product, not a poorly finished one.
<!-- vpmodule:atom:end 37signals-way-build-less -->
<!-- vpmodule:atom:begin 37signals-way-common-mistakes -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: 37signals-way-common-mistakes
title: Avoid the listed product-development mistakes
summary: "Avoid backlogs, estimation instead of appetite, pixel-perfect mockups before shaping, cycle extension, preference stacking, standups, default yes and multi-cycle planning, and apply each stated fix."
capability_tags:
  - verify-work-results
pattern_tags:
  - mistake-list
conditions_applies_when: Reviewing a product process for the listed failure patterns.
conditions_does_not_apply_when: A narrower instruction already covers the finding.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: Each observed mistake is named and paired with its stated fix.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/37signals-way/SKILL.md; sha256=b6882f6f197ed4eee0bfe71518f7aa16a2bf30a3bf6446b7738e6f04d39b08b4; locator=skills/37signals-way/SKILL.md#L151-L163"
status: active
revision: 1
---

# Avoid the listed product-development mistakes

Avoid maintaining a backlog, estimating instead of setting appetite, pixel-perfect mockups before shaping, extending six-week cycles, adding preferences instead of choosing, daily standups and status meetings, saying yes to good feature requests, and planning multiple cycles ahead. Instead abolish the backlog and bet on shaped pitches; ask how much time the problem is worth; breadboard and use fat-marker sketches first; do not ship unfinished work or extend the cycle; pick a default; use hill charts and asynchronous updates; default to no and bet only on work that matters this cycle; and plan one cycle at a time.
<!-- vpmodule:atom:end 37signals-way-common-mistakes -->
<!-- vpmodule:atom:begin 37signals-way-deliberate-omission -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: 37signals-way-deliberate-omission
title: Win through deliberate omission
summary: "Build fewer features, preferences and moving parts, do each better, prefer a few well-done capabilities, make small reversible decisions, underdo competitors and default to no."
capability_tags:
  - bound-product-pitch
pattern_tags:
  - fixed-time-variable-scope
conditions_applies_when: "Prioritizing a roadmap, an MVP or a feature set."
conditions_does_not_apply_when: A safety or legal obligation that must be delivered.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The plan names what was omitted, the durable qualities it protects, and the default answer to new requests."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/37signals-way/SKILL.md; sha256=b6882f6f197ed4eee0bfe71518f7aa16a2bf30a3bf6446b7738e6f04d39b08b4; locator=skills/37signals-way/SKILL.md#L28-L50"
status: active
revision: 1
---

# Win through deliberate omission

Win through deliberate omission: build fewer features, preferences, and moving parts, doing each better than competitors; build software you need yourself and solve problems you understand deeply. Prefer a few well-done capabilities to many poor ones; refuse good ideas to make room for great ones; make small decisions to build momentum because big decisions are harder to make and reverse; underdo competitors; and focus on durable qualities such as speed, simplicity, reliability, and ease of use. Default to no when prioritizing, cut scope aggressively for an MVP, and choose a few reliable integrations over matching a competitor's breadth.
<!-- vpmodule:atom:end 37signals-way-deliberate-omission -->
<!-- vpmodule:atom:begin 37signals-way-diagnostic -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: 37signals-way-diagnostic
title: Run the 37signals product diagnostic
summary: "Check fixed time, shaped work, team size, refusals, team-discovered tasks, hill charts, cool-down and product opinion, and apply the matching action for each failed check."
capability_tags:
  - verify-work-results
pattern_tags:
  - diagnostic-questions
conditions_applies_when: A quick diagnostic review of a product process.
conditions_does_not_apply_when: A full audit or a scored assessment.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - diagnostic-findings
  - corrective-actions
artifact_contract_verified_by: The report answers each diagnostic question and names the matching corrective action for every failed check.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/37signals-way/SKILL.md; sha256=b6882f6f197ed4eee0bfe71518f7aa16a2bf30a3bf6446b7738e6f04d39b08b4; locator=skills/37signals-way/SKILL.md#L164-L178"
status: active
revision: 1
---

# Run the 37signals product diagnostic

Diagnose work with these checks and responses: if no fixed time constraint, set a six-week-or-smaller appetite; if it is not rough, solved, and bounded, define problem, appetite, solution, rabbit holes, and no-gos; if a team of 2–3 people cannot do it, break the work into independent six-week bets; if fewer than 5 things have been refused this cycle, cut at the betting table; if the team is not discovering its tasks, hand off a shaped pitch instead of task lists; if progress is not tracked with hill charts, distinguish figuring out from execution; if there is no cooldown, schedule two unstructured weeks between cycles; and if software lacks a clear opinion, choose the best default and remove the setting.
<!-- vpmodule:atom:end 37signals-way-diagnostic -->
<!-- vpmodule:atom:begin 37signals-way-opinionated-defaults -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: 37signals-way-opinionated-defaults
title: Choose defaults instead of exposing preferences
summary: "Make the product choice, revisit a default only when data shows it fails most users, avoid features that patch earlier features, and treat not now as a valid answer."
capability_tags:
  - design-user-interface
pattern_tags:
  - opinionated-defaults
conditions_applies_when: "Designing a setting, an option or a response to a feature request."
conditions_does_not_apply_when: A setting required by law or by an external contract.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "Each preference is replaced by a default or a refusal, and any revisit condition cites evidence about most users."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/37signals-way/SKILL.md; sha256=b6882f6f197ed4eee0bfe71518f7aa16a2bf30a3bf6446b7738e6f04d39b08b4; locator=skills/37signals-way/SKILL.md#L126-L150"
status: active
revision: 1
---

# Choose defaults instead of exposing preferences

Make product choices instead of burdening users with preferences; each preference reflects a decision the team could not or would not make. Choose and ship the best default, revisiting it only if data shows it fails most users; eliminate epicycles because features that patch problems created by earlier features compound complexity. Treat “not now” as a valid answer to feature requests and make no false promises. Use plain, honest interface and marketing copy, including helpful error messages, and teach what you know openly; sell useful by-products such as books, posts, and tools.
<!-- vpmodule:atom:end 37signals-way-opinionated-defaults -->
<!-- vpmodule:atom:begin 37signals-way-score -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: 37signals-way-score
title: Score the product process against the framework
summary: "Rate product plans, feature scopes and team processes 0-10, report the score and the changes needed to reach 10, and apply the five stated bands."
capability_tags:
  - verify-work-results
pattern_tags:
  - scoring-rubric
conditions_applies_when: "Assessing a product plan, feature scope or team process."
conditions_does_not_apply_when: A code review that does not assess the product process.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - quality-score
  - improvement-changes
artifact_contract_verified_by: "The report states the current score, the band it falls in, and the specific changes needed to reach 10."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/37signals-way/SKILL.md; sha256=b6882f6f197ed4eee0bfe71518f7aa16a2bf30a3bf6446b7738e6f04d39b08b4; locator=skills/37signals-way/SKILL.md#L18-L27"
status: active
revision: 1
---

# Score the product process against the framework

Rate product plans, feature scopes, and team processes from 0 to 10 against the framework; report both the current score and specific changes needed to reach the goal of 10/10. Score 9–10 for fixed-time cycles, shaped pitches, small teams, no backlog, opinionated defaults, and clear copy; 7–8 for mostly shaped work and small teams with some scope creep or process overhead; 5–6 for some shaping but persistent backlogs, oversized teams, or preferences replacing decisions; 3–4 for heavy process with occasional simplicity efforts; and 0–2 for a feature factory with long-term roadmaps, large teams, estimation rituals, and no shaping.
<!-- vpmodule:atom:end 37signals-way-score -->