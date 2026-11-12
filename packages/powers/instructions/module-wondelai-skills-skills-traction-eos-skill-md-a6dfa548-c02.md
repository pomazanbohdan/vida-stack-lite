---
schema: VPInstructionModule/v1
instruction_id: "module-wondelai-skills-skills-traction-eos-skill-md-a6dfa548-c02"
title: "wondelai-skills: skills/traction-eos/SKILL.md module"
summary: "Carrier for 8 atomic instructions from wondelai-skills:skills/traction-eos/SKILL.md."
source: "{\"donor\":\"wondelai-skills\",\"path\":\"skills/traction-eos/SKILL.md\"}"
atom_ids:
  - traction-eos-level-10
  - traction-eos-organizational-checkup
  - traction-eos-processes
  - traction-eos-rocks
  - traction-eos-score
  - traction-eos-scorecard
  - traction-eos-traction
  - traction-eos-vto
atom_count: 8
atoms: "[{\"atom_id\":\"traction-eos-level-10\",\"file_sha256\":\"583a7925aa123465ea0e04912f6143ab80107c3a02ba2eb473a293cbfe9ac8db\",\"content_sha256\":\"3159e910b57264716edb4e3abb69334f66f8b20b718259fe903cd8c4866da54c\",\"file_bytes\":1741,\"body_bytes\":685},{\"atom_id\":\"traction-eos-organizational-checkup\",\"file_sha256\":\"99b5781445e4577659ea19bd2135a958841c761881d87935e948985629cd373d\",\"content_sha256\":\"41445bd0ad01e127e66844ad9514711d37af657b0700d358fb00488328d25bde\",\"file_bytes\":1554,\"body_bytes\":494},{\"atom_id\":\"traction-eos-processes\",\"file_sha256\":\"74ed1b74c0543cbfad7dbe238abb409283b90ce75066b637c27862ddd86f2235\",\"content_sha256\":\"706e1d978078c47fff31a9e8dc0f85ca25174b6574cd4da842a2ef9058923d7e\",\"file_bytes\":1596,\"body_bytes\":512},{\"atom_id\":\"traction-eos-rocks\",\"file_sha256\":\"e80472f230abc10433549adda3496fceee0954270db4c6cd34c789e4843e8edf\",\"content_sha256\":\"c7d716c0e93c3674dce3b153384a416e53ae900bb1edb9e7612d4206f3869edb\",\"file_bytes\":1787,\"body_bytes\":742},{\"atom_id\":\"traction-eos-score\",\"file_sha256\":\"4b359058a733895fd217fe36164511ddd0a53536820f9a0fdebb00aa95a057a7\",\"content_sha256\":\"83e8db26b6a21cbfd1c70debbeca9af0c1b4ebcbcec6a4c5173bc9da55e7cc77\",\"file_bytes\":1561,\"body_bytes\":513},{\"atom_id\":\"traction-eos-scorecard\",\"file_sha256\":\"971589544bebb95fd8d754835582d2e82f5911f7b3f5da7af8fde37f01a0736c\",\"content_sha256\":\"96c591e8bf9e681d7a2be94000f42b68f5c292c13755d2db1e08b42dbc06adc9\",\"file_bytes\":1567,\"body_bytes\":459},{\"atom_id\":\"traction-eos-traction\",\"file_sha256\":\"6e1c6cde2d30c569817dac01cceb253003cf2b50060b25a7eab83bbc6865227f\",\"content_sha256\":\"10695a10483fb2df639066e3cc12ecb4a9e89cb120f7bea305f409059e412d13\",\"file_bytes\":1099,\"body_bytes\":116},{\"atom_id\":\"traction-eos-vto\",\"file_sha256\":\"c55ec5078487d3b1c2fe53dc729d8cc290adbe15507faa22f8aff70ef7b8cdf8\",\"content_sha256\":\"29580984cc283d43822cc2c9f6d1f3a66ff924b5f33930b368c995dad0a91d4e\",\"file_bytes\":1770,\"body_bytes\":684}]"
carrier_sha256: f81b8367cd871f37add992ddd5798ee33f97c9dde0661a1329aeadd8a4e8b6ce
carrier_bytes: 13484
revision: 1
status: active
---
<!-- vpmodule:atom:begin traction-eos-level-10 -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: traction-eos-level-10
title: Hold the Level 10 meeting
summary: "Hold a weekly 90-minute Level 10 meeting on the same day, at the same time, with the same agenda, and never run longer."
capability_tags:
  - run-eos-operating-system
pattern_tags:
  - level-10-meeting
conditions_applies_when: Running the leadership weekly meeting.
conditions_does_not_apply_when: An ad hoc leadership meeting.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The meeting has a fixed weekly slot, a 90-minute cap and the standard agenda."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/traction-eos/SKILL.md; sha256=1d58e30d368779e98823324434df5bb31eccb76897737a880c3e855edccdc96a; locator=skills/traction-eos/SKILL.md#L172-L194"
status: active
revision: 1
---

# Hold the Level 10 meeting

Hold the Level 10 leadership meeting weekly on the same day, at the same time, with the same agenda, for 90 minutes and never longer. Allocate 5 minutes each to segue, scorecard, rock review, headlines, and prior to-dos; 60 minutes to IDS; and 5 minutes to conclude. Start and end on time. Allow no phones or laptops except for the agenda. Reserve the 60-minute IDS block for solving issues. Rate the meeting 1-10 at the end; if below 8, discuss improvements. To-dos are owned 7-day actions, count as done only at 100% completion, and target 90% or higher completion. Consult references/level-10.md for the facilitation script and meeting-rating guidance.
<!-- vpmodule:atom:end traction-eos-level-10 -->
<!-- vpmodule:atom:begin traction-eos-organizational-checkup -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: traction-eos-organizational-checkup
title: Run the organizational checkup
summary: "Rate the company 1-5 on six statements about leadership agreement, right people, scorecard, process, rocks and meeting rhythm."
capability_tags: []
pattern_tags:
  - scoring-rubric
conditions_applies_when: Assessing organizational health.
conditions_does_not_apply_when: A financial audit.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - quality-score
  - failed-rows
artifact_contract_verified_by: "The report states each statement's rating and the resulting gaps."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/traction-eos/SKILL.md; sha256=1d58e30d368779e98823324434df5bb31eccb76897737a880c3e855edccdc96a; locator=skills/traction-eos/SKILL.md#L211-L225"
status: active
revision: 1
---

# Run the organizational checkup

Rate the company from 1-5 on each of six statements: leadership agreement on direction and how to get there; right people in right seats; management from a weekly scorecard of 5-15 numbers; solving issues quickly and permanently; core processes documented and followed by all; and setting and achieving 90-day rocks. Total 25-30 is strong (fine-tune), 20-24 good (close gaps), 15-19 average (significant work), and below 15 weak (consider an EOS Implementer).
<!-- vpmodule:atom:end traction-eos-organizational-checkup -->
<!-- vpmodule:atom:begin traction-eos-processes -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: traction-eos-processes
title: Document the core processes
summary: "Document the 20% of processes that produce 80% consistency, covering HR, sales, operations and finance at a consistent level of detail."
capability_tags:
  - run-eos-operating-system
pattern_tags:
  - operating-procedure-map
conditions_applies_when: Documenting operating procedures.
conditions_does_not_apply_when: A one-off project with no repeatable process.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The core process list is documented at one consistent level of detail.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/traction-eos/SKILL.md; sha256=1d58e30d368779e98823324434df5bb31eccb76897737a880c3e855edccdc96a; locator=skills/traction-eos/SKILL.md#L129-L150"
status: active
revision: 1
---

# Document the core processes

Document core processes, using the 20/80 principle: document 20% of processes to achieve 80% consistency. Identify core HR, sales, operations, customer-service, and finance processes. For each, name the process and list 5-20 major steps with only enough detail, making it visual where possible. Followed By All requires documenting, training, measuring compliance, and quarterly updates. Consult references/process.md for process templates and worked HR/sales/operations examples.
<!-- vpmodule:atom:end traction-eos-processes -->
<!-- vpmodule:atom:begin traction-eos-rocks -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: traction-eos-rocks
title: Set 90-day rocks
summary: "Set 3-7 company rocks for the next 90 days with one owner each, plus 3-7 individual rocks per leadership member, reviewed from the V/TO and issues."
capability_tags:
  - run-eos-operating-system
pattern_tags:
  - ninety-day-rocks
conditions_applies_when: Setting quarterly priorities.
conditions_does_not_apply_when: A task list with no 90-day horizon.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: Each rock has one owner and falls within the 3-7 range.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/traction-eos/SKILL.md; sha256=1d58e30d368779e98823324434df5bb31eccb76897737a880c3e855edccdc96a; locator=skills/traction-eos/SKILL.md#L155-L171"
status: active
revision: 1
---

# Set 90-day rocks

Set 3-7 company rocks for the next 90 days, with one owner each; each leadership member also sets 3-7 individual rocks. Set them by reviewing the V/TO, identifying what must be done that quarter, narrowing priorities, then sharing and tracking them weekly. Rocks must be SMART: specific, measurable with clear completion criteria, achievable in 90 days, realistic for available resources, and due by quarter end. Score them as done only when checked off, with no partial credit; carry forward or drop unfinished rocks. Target 80% or higher completion and exclude business-as-usual work that does not move the needle. Consult references/rocks.md for the binary done-test, nine-row mistakes table, and mid-quarter check-in.
<!-- vpmodule:atom:end traction-eos-rocks -->
<!-- vpmodule:atom:begin traction-eos-score -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: traction-eos-score
title: Score the six EOS components
summary: "Score the business by the six Quick Diagnostic components, state which pass, and apply the stated bands."
capability_tags: []
pattern_tags:
  - scoring-rubric
conditions_applies_when: Assessing an EOS implementation.
conditions_does_not_apply_when: A code review that does not assess the business.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - quality-score
  - failed-rows
artifact_contract_verified_by: "The report states the score, each component's status and the band."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/traction-eos/SKILL.md; sha256=1d58e30d368779e98823324434df5bb31eccb76897737a880c3e855edccdc96a; locator=skills/traction-eos/SKILL.md#L18-L21"
status: active
revision: 1
---

# Score the business against the six Quick Diagnostic rows

Score the business by how many of the six Quick Diagnostic rows pass; each component is either in place or not, and rocks consistently hitting 80%+ completion qualifies the top band. Bands: 9-10 = all six rows pass and rocks hit 80%+; 7-8 = five rows pass, one component weak; 5-6 = three to four rows pass; 3-4 = one to two rows pass; <=2 = no operating rhythm. Always state the current score, the failing diagnostic rows and the next action for each.
<!-- vpmodule:atom:end traction-eos-score -->
<!-- vpmodule:atom:begin traction-eos-scorecard -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: traction-eos-scorecard
title: Run a weekly scorecard
summary: "Track 5-15 weekly numbers, prefer activity-based leading indicators over lagging results, and review the scorecard every week."
capability_tags:
  - run-eos-operating-system
pattern_tags:
  - scorecard-indicators
conditions_applies_when: Building a weekly business scorecard.
conditions_does_not_apply_when: A monthly financial report with no weekly activity measure.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The scorecard has 5-15 numbers, at least one leading activity indicator and a weekly review."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/traction-eos/SKILL.md; sha256=1d58e30d368779e98823324434df5bb31eccb76897737a880c3e855edccdc96a; locator=skills/traction-eos/SKILL.md#L81-L104"
status: active
revision: 1
---

# Run a weekly scorecard

Use a weekly scorecard of 5-15 numbers to show business performance. Prefer activity-based leading indicators over lagging results; review weekly rather than monthly; give every number an owner and a goal; and mark each number on track or off track (red/green). Weekly data is stated to reveal problems 2-4 weeks earlier than monthly data. Consult references/data.md for scorecard templates and leading-indicator selection guidance.
<!-- vpmodule:atom:end traction-eos-scorecard -->
<!-- vpmodule:atom:begin traction-eos-traction -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: traction-eos-traction
title: Execute the vision every day
summary: The Traction component asks whether the organization executes its vision every day.
capability_tags:
  - run-eos-operating-system
pattern_tags: []
conditions_applies_when: Assessing execution discipline.
conditions_does_not_apply_when: A vision exercise with no execution follow-through.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The assessment names the execution evidence.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/traction-eos/SKILL.md; sha256=1d58e30d368779e98823324434df5bb31eccb76897737a880c3e855edccdc96a; locator=skills/traction-eos/SKILL.md#L151-L154"
status: active
revision: 1
---

# Execute the vision every day

The Traction component asks whether the organization executes its vision every day.
<!-- vpmodule:atom:end traction-eos-traction -->
<!-- vpmodule:atom:begin traction-eos-vto -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: traction-eos-vto
title: Complete the Vision/Traction Organizer
summary: "Answer the eight V/TO questions on two pages: core values, core focus, ten-year target, marketing strategy, three-year picture, one-year plan, quarterly rocks and issues."
capability_tags:
  - run-eos-operating-system
pattern_tags:
  - eos-vision
conditions_applies_when: Aligning leadership on vision.
conditions_does_not_apply_when: A team that has not agreed to a shared vision.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The V/TO contains all eight answers on two pages.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/traction-eos/SKILL.md; sha256=1d58e30d368779e98823324434df5bb31eccb76897737a880c3e855edccdc96a; locator=skills/traction-eos/SKILL.md#L28-L50"
status: active
revision: 1
---

# Complete the Vision/Traction Organizer

Use the Vision/Traction Organizer (V/TO) to answer eight questions on two pages: core values (3-7 non-negotiable beliefs), core focus (purpose/cause/passion and niche), 10-year target, marketing strategy (target market, three uniques, proven process, guarantee), 3-year picture, 1-year plan, quarterly rocks (3-7 priorities), and issues list. Leadership completes it together in a two-day off-site, shares it with the entire organization, reviews it quarterly, and updates it annually. If leadership cannot agree on the V/TO, resolve alignment first. Consult references/vto.md when filling in the V/TO for the template and off-site sequence.
<!-- vpmodule:atom:end traction-eos-vto -->