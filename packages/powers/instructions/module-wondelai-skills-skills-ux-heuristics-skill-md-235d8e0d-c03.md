---
schema: VPInstructionModule/v1
instruction_id: "module-wondelai-skills-skills-ux-heuristics-skill-md-235d8e0d-c03"
title: "wondelai-skills: skills/ux-heuristics/SKILL.md module"
summary: "Carrier for 7 atomic instructions from wondelai-skills:skills/ux-heuristics/SKILL.md."
source: "{\"donor\":\"wondelai-skills\",\"path\":\"skills/ux-heuristics/SKILL.md\"}"
atom_ids:
  - ux-heuristics-real-world-language
  - ux-heuristics-recognition
  - ux-heuristics-score
  - ux-heuristics-severity-scale
  - ux-heuristics-system-status
  - ux-heuristics-trunk-test
  - ux-heuristics-user-control
atom_count: 7
atoms: "[{\"atom_id\":\"ux-heuristics-real-world-language\",\"file_sha256\":\"e8d332379756122bd108f890b132e34728751a4013e69f83f57a80d404efb400\",\"content_sha256\":\"53fb7dd13231d0463340f5f022e1d94d430402e3f3830ffa9fff54ebd50bb455\",\"file_bytes\":1171,\"body_bytes\":114},{\"atom_id\":\"ux-heuristics-recognition\",\"file_sha256\":\"27eae664016baf8a4cf015f21b97b5c933b269123f1839473585b3378c4cf43a\",\"content_sha256\":\"840cf08c0f628d3c7979b8786ec05448165bccca11bd8a594e6bb0317d049c1e\",\"file_bytes\":1308,\"body_bytes\":201},{\"atom_id\":\"ux-heuristics-score\",\"file_sha256\":\"d7cd013b61933bcd7741ba2c7975e9463241769c6b83843b7c02493d7476fda2\",\"content_sha256\":\"c9805fa2800fcd6bd90e51a202cb40aec7d8cb36d5726227ebb50253689f1f9d\",\"file_bytes\":1625,\"body_bytes\":459},{\"atom_id\":\"ux-heuristics-severity-scale\",\"file_sha256\":\"cac4569328f5cccfb34df55d27d0a718fc47737cedeaf4b702e2a64f0224135e\",\"content_sha256\":\"3a04933a1de9f77bb70e41a339a82e0dd3902026df7c43e7c5c4bc25e431970a\",\"file_bytes\":1258,\"body_bytes\":218},{\"atom_id\":\"ux-heuristics-system-status\",\"file_sha256\":\"0034ef3530d14f1cb8cfee6a34e162073c5ea78a6da35d2e0134b323e6d2fa0b\",\"content_sha256\":\"d44f6b825925e1385dae7a8369a302101a2f8fe0601041e8d061bc9fb12d0aff\",\"file_bytes\":1211,\"body_bytes\":165},{\"atom_id\":\"ux-heuristics-trunk-test\",\"file_sha256\":\"73fbd943f9313501ea33e007a11315445c908ee05f25146a0a6d1c2368097a4c\",\"content_sha256\":\"944ed81b6b265134402ff0a6893527cf2534b1dd1c89c2b317f258774583f36c\",\"file_bytes\":1207,\"body_bytes\":176},{\"atom_id\":\"ux-heuristics-user-control\",\"file_sha256\":\"fc832d032b3c4b41aa7ae1e5467e6b5c2fd60697e77cc9fb79384c7406120985\",\"content_sha256\":\"b4c6bc46c173d16abeb3d5fc54dafd31cbccf9fabea585e519b0b4cfeb439ea7\",\"file_bytes\":1253,\"body_bytes\":178}]"
carrier_sha256: d52fdd02e64eadb289c84d18614ac3210e9096b55ccd304d8da232eb71a72ee5
carrier_bytes: 9802
revision: 1
status: active
---
<!-- vpmodule:atom:begin ux-heuristics-real-world-language -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: ux-heuristics-real-world-language
title: "Match the user's real-world language"
summary: "Use familiar words, metaphors and natural ordering rather than system terminology."
capability_tags:
  - design-user-interface
pattern_tags:
  - domain-language
conditions_applies_when: Writing interface language or ordering information.
conditions_does_not_apply_when: A domain term the user already knows and expects.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The interface uses the user's vocabulary and natural order."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/ux-heuristics/SKILL.md; sha256=cb1ea3de8b6e605614cc59b21d41830d2d82af22e51069bb4c5bb53790cd622b; locator=skills/ux-heuristics/SKILL.md#L122-L124"
status: active
revision: 1
---

# Match the user's real-world language

Use users' language, familiar real-world metaphors, and natural ordering.
<!-- vpmodule:atom:end ux-heuristics-real-world-language -->
<!-- vpmodule:atom:begin ux-heuristics-recognition -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: ux-heuristics-recognition
title: Recognize rather than recall
summary: "Show options instead of requiring memorization, using breadcrumbs, recent searches, prefilled fields and decoded values."
capability_tags:
  - design-user-interface
pattern_tags:
  - progressive-disclosure
conditions_applies_when: Designing a task that depends on remembered information.
conditions_does_not_apply_when: A task where recall is the explicit skill being tested.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: Users can choose from visible options rather than remember hidden values.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/ux-heuristics/SKILL.md; sha256=cb1ea3de8b6e605614cc59b21d41830d2d82af22e51069bb4c5bb53790cd622b; locator=skills/ux-heuristics/SKILL.md#L134-L136"
status: active
revision: 1
---

# Recognize rather than recall

Minimize memory load by showing options instead of requiring memorization; examples include breadcrumbs, recent searches, prefilled fields, and decoded dropdown values.
<!-- vpmodule:atom:end ux-heuristics-recognition -->
<!-- vpmodule:atom:begin ux-heuristics-score -->
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
<!-- vpmodule:atom:end ux-heuristics-score -->
<!-- vpmodule:atom:begin ux-heuristics-severity-scale -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: ux-heuristics-severity-scale
title: Rate issues on the severity scale
summary: "Use 0 to 4 from cosmetic to catastrophic, weighing frequency, impact and persistence."
capability_tags:
  - audit-accessibility
pattern_tags:
  - impact-based-severity
conditions_applies_when: Triaging usability findings.
conditions_does_not_apply_when: A finding with no user impact.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "Each finding has a severity from 0 to 4 justified by frequency, impact and persistence."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/ux-heuristics/SKILL.md; sha256=cb1ea3de8b6e605614cc59b21d41830d2d82af22e51069bb4c5bb53790cd622b; locator=skills/ux-heuristics/SKILL.md#L151-L166"
status: active
revision: 1
---

# Rate issues on the severity scale

Rate issues 0 (not a problem: ignore), 1 (cosmetic: fix if time), 2 (minor: schedule), 3 (major: fix soon), 4 (catastrophic: fix immediately); weigh frequency, impact, persistence.
<!-- vpmodule:atom:end ux-heuristics-severity-scale -->
<!-- vpmodule:atom:begin ux-heuristics-system-status -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: ux-heuristics-system-status
title: Keep users informed of system status
summary: "Acknowledge every action with timely progress, confirmation and loading states."
capability_tags:
  - design-user-interface
pattern_tags:
  - design-system-adherence
conditions_applies_when: Designing interactions that take time or change state.
conditions_does_not_apply_when: An instantaneous action with no perceptible wait.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "Every action produces timely, accurate feedback."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/ux-heuristics/SKILL.md; sha256=cb1ea3de8b6e605614cc59b21d41830d2d82af22e51069bb4c5bb53790cd622b; locator=skills/ux-heuristics/SKILL.md#L119-L121"
status: active
revision: 1
---

# Keep users informed of system status

Keep users informed through timely feedback; acknowledge every action, including progress, confirmation, and loading states.
<!-- vpmodule:atom:end ux-heuristics-system-status -->
<!-- vpmodule:atom:begin ux-heuristics-trunk-test -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: ux-heuristics-trunk-test
title: Pass the Trunk Test
summary: "Let users identify the site, page, sections, options, hierarchy and search from any page."
capability_tags:
  - design-user-interface
pattern_tags:
  - design-system-adherence
conditions_applies_when: Reviewing page orientation and navigation.
conditions_does_not_apply_when: A page with no navigation or site context.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: A user can answer the Trunk Test questions from the page itself.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/ux-heuristics/SKILL.md; sha256=cb1ea3de8b6e605614cc59b21d41830d2d82af22e51069bb4c5bb53790cd622b; locator=skills/ux-heuristics/SKILL.md#L105-L116"
status: active
revision: 1
---

# Pass the Trunk Test

Users on any page should identify site, page, sections, options, hierarchy, and search; keep titles, location indicators, headings, and labels accurate.
<!-- vpmodule:atom:end ux-heuristics-trunk-test -->
<!-- vpmodule:atom:begin ux-heuristics-user-control -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: ux-heuristics-user-control
title: Give users control and an exit
summary: "Prefer undo to confirmation, include cancel or exit in every flow, and keep the back button working."
capability_tags:
  - design-user-interface
pattern_tags:
  - safe-defaults
conditions_applies_when: Designing a flow with destructive or irreversible actions.
conditions_does_not_apply_when: A read-only view with no state change.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: Every flow has a clear exit and destructive actions are reversible where possible.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/ux-heuristics/SKILL.md; sha256=cb1ea3de8b6e605614cc59b21d41830d2d82af22e51069bb4c5bb53790cd622b; locator=skills/ux-heuristics/SKILL.md#L125-L127"
status: active
revision: 1
---

# Give users control and an exit

Provide clear emergency exits; prefer undo to confirmation dialogs, include cancel or exit in every flow, and ensure back buttons do not break.
<!-- vpmodule:atom:end ux-heuristics-user-control -->